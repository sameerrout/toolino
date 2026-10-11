import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { isManagerEmail } from '@/lib/auth';
import {
  loadPersistedVisits,
  persistNewVisitSync,
  isRecentDuplicateVisit,
  calculateVisitorAnalytics,
} from '@/lib/analytics/visitsStore';
import { REPORTING_TIMEZONE } from '@/lib/analytics/visitor';
import {
  loadDriveDatabase,
  saveDriveDatabase,
  mutateDriveDatabase,
  isGoogleDriveConfigured,
  DEFAULT_FOLDER_NAME,
  TARGET_GOOGLE_ACCOUNT,
  type DatabaseSchema,
  type UserRecord,
  type ActivityEvent,
  type ContactMessage,
  type ContactMessageStatus,
  type PageVisitRecord,
} from '@/lib/drive/driveStore';

export type {
  DatabaseSchema,
  UserRecord,
  ActivityEvent,
  ContactMessage,
  ContactMessageStatus,
  PageVisitRecord,
};

const INITIAL_DB: DatabaseSchema = {
  users: [],
  toolUsage: {},
  events: [],
  contactMessages: [],
  visits: [],
};

// In-memory fallback and test cache
const globalForDb = globalThis as unknown as {
  __toolino_memory_db__?: DatabaseSchema;
};

function getDbFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join(os.tmpdir(), '.toolino_data');
    return path.join(tmpDir, 'db.json');
  }
  return path.join(process.cwd(), '.data', 'db.json');
}

function ensureDbFile(): string {
  const filePath = getDbFilePath();
  const dirPath = path.dirname(filePath);
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    }
  } catch {
    // Memory fallback
  }
  return filePath;
}

/**
 * Synchronous local database read for test suites and dev fallbacks.
 */
export function getDb(): DatabaseSchema {
  try {
    const filePath = ensureDbFile();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw) as DatabaseSchema;
        if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed.users)) parsed.users = [];
          if (!parsed.toolUsage || typeof parsed.toolUsage !== 'object') parsed.toolUsage = {};
          if (!Array.isArray(parsed.events)) parsed.events = [];
          if (!Array.isArray(parsed.contactMessages)) parsed.contactMessages = [];
          parsed.visits = loadPersistedVisits();
          globalForDb.__toolino_memory_db__ = parsed;
          return parsed;
        }
      }
    }
  } catch (error) {
    console.error('Failed to read local store:', error);
  }

  if (!globalForDb.__toolino_memory_db__) {
    globalForDb.__toolino_memory_db__ = {
      users: [],
      toolUsage: {},
      events: [],
      contactMessages: [],
      visits: loadPersistedVisits(),
    };
  } else {
    globalForDb.__toolino_memory_db__.visits = loadPersistedVisits();
  }
  return globalForDb.__toolino_memory_db__;
}

export function saveDb(data: DatabaseSchema): void {
  data.visits = loadPersistedVisits();
  globalForDb.__toolino_memory_db__ = data;

  try {
    const filePath = ensureDbFile();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Ignore in-memory fallback
  }
}

/**
 * Primary asynchronous database loader: loads strictly from Google Drive if configured.
 */
export async function getDbAsync(): Promise<DatabaseSchema> {
  if (isGoogleDriveConfigured()) {
    return loadDriveDatabase();
  }
  return getDb();
}

/**
 * Primary asynchronous database saver: writes strictly to Google Drive if configured.
 */
export async function saveDbAsync(data: DatabaseSchema): Promise<void> {
  if (isGoogleDriveConfigured()) {
    await saveDriveDatabase(data);
    return;
  }
  saveDb(data);
}

// ============================================================
// Secure Password Hashing (Salt + Scrypt)
// ============================================================
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized);
}

export async function findUserByEmailAsync(email: string): Promise<UserRecord | undefined> {
  const db = await getDbAsync();
  const normalized = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === normalized);
}

// ============================================================
// User Registration (Email + Password)
// ============================================================
export function registerEmailUser(
  email: string,
  password: string,
  name?: string
): { user?: UserRecord; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const db = getDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    if (isManagerEmail(normalizedEmail)) {
      existing.passwordHash = hashPassword(password);
      existing.role = 'manager';
      if (name) existing.name = name;
      existing.lastLoginAt = new Date().toISOString();
      saveDb(db);
      return { user: existing };
    }
    return { error: 'An account with this email already exists.' };
  }

  const now = new Date().toISOString();
  const isManager = isManagerEmail(normalizedEmail);
  const newUser: UserRecord = {
    id: isManager ? `mgr_${Date.now()}` : `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: normalizedEmail,
    name: name || normalizedEmail.split('@')[0],
    authProvider: 'email',
    passwordHash: hashPassword(password),
    role: isManager ? 'manager' : 'user',
    createdAt: now,
    lastLoginAt: now,
  };

  db.users.push(newUser);
  db.events.unshift({
    timestamp: now,
    type: 'signup',
    email: newUser.email,
  });
  if (db.events.length > 200) db.events = db.events.slice(0, 200);
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch((err) => console.error('Failed to sync registered user to Google Drive:', err));
  }

  return { user: newUser };
}

export async function registerEmailUserAsync(
  email: string,
  password: string,
  name?: string
): Promise<{ user?: UserRecord; error?: string }> {
  if (isGoogleDriveConfigured()) {
    return mutateDriveDatabase(async (db) => {
      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return { error: 'Please enter a valid email address.' };
      }
      if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters long.' };
      }

      const existing = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        if (isManagerEmail(normalizedEmail)) {
          existing.passwordHash = hashPassword(password);
          existing.role = 'manager';
          if (name) existing.name = name;
          existing.lastLoginAt = new Date().toISOString();
          return { user: existing };
        }
        return { error: 'An account with this email already exists.' };
      }

      const now = new Date().toISOString();
      const isManager = isManagerEmail(normalizedEmail);
      const newUser: UserRecord = {
        id: isManager ? `mgr_${Date.now()}` : `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        authProvider: 'email',
        passwordHash: hashPassword(password),
        role: isManager ? 'manager' : 'user',
        createdAt: now,
        lastLoginAt: now,
      };

      db.users.push(newUser);
      db.events.unshift({
        timestamp: now,
        type: 'signup',
        email: newUser.email,
      });
      if (db.events.length > 200) db.events = db.events.slice(0, 200);
      return { user: newUser };
    });
  }

  return registerEmailUser(email, password, name);
}

// ============================================================
// User Authentication (Email + Password)
// ============================================================
export function authenticateEmailUser(
  email: string,
  password: string
): { user?: UserRecord; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  const now = new Date().toISOString();
  const isManager = isManagerEmail(normalizedEmail);

  if (!user) {
    const envManagerPassword = process.env.MANAGER_PASSWORD;
    if (isManager && envManagerPassword && password === envManagerPassword) {
      const activeUser: UserRecord = {
        id: `mgr_${Date.now()}`,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        authProvider: 'email',
        passwordHash: hashPassword(password),
        role: 'manager',
        createdAt: now,
        lastLoginAt: now,
      };
      db.users.push(activeUser);
      saveDb(db);
      if (isGoogleDriveConfigured()) {
        saveDbAsync(db).catch(() => {});
      }
      return { user: activeUser };
    }
    return { error: 'Invalid email or password.' };
  }

  const passwordMatches = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;
  const isEnvManagerValid = isManager && process.env.MANAGER_PASSWORD && password === process.env.MANAGER_PASSWORD;

  if (!passwordMatches && !isEnvManagerValid) {
    return { error: 'Invalid email or password.' };
  }

  if (isManager) {
    user.role = 'manager';
  }

  user.lastLoginAt = now;
  db.events.unshift({
    timestamp: now,
    type: 'login',
    email: user.email,
  });
  if (db.events.length > 200) db.events = db.events.slice(0, 200);
  saveDb(db);
  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { user };
}

// ============================================================
// Google User Login
// ============================================================
export function recordUserLogin(user: {
  id: string;
  email: string;
  name: string;
  picture?: string;
}): {
  user: UserRecord;
  isNewUser: boolean;
} {
  const db = getDb();
  const normalizedEmail = user.email.toLowerCase();
  const existingIndex = db.users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
  const now = new Date().toISOString();
  const isManager = isManagerEmail(normalizedEmail);

  if (existingIndex >= 0) {
    const existing = db.users[existingIndex];
    existing.name = user.name || existing.name;
    if (user.picture) existing.picture = user.picture;
    existing.lastLoginAt = now;
    existing.role = isManager ? 'manager' : existing.role || 'user';
    db.events.unshift({
      timestamp: now,
      type: 'login',
      email: existing.email,
    });
    if (db.events.length > 200) db.events = db.events.slice(0, 200);
    saveDb(db);
    if (isGoogleDriveConfigured()) {
      saveDbAsync(db).catch(() => {});
    }
    return { user: existing, isNewUser: false };
  }

  const newUser: UserRecord = {
    id: user.id || `usr_${Date.now()}`,
    email: normalizedEmail,
    name: user.name || normalizedEmail.split('@')[0],
    picture: user.picture,
    authProvider: 'google',
    role: isManager ? 'manager' : 'user',
    createdAt: now,
    lastLoginAt: now,
  };

  db.users.push(newUser);
  db.events.unshift({
    timestamp: now,
    type: 'signup',
    email: newUser.email,
  });
  if (db.events.length > 200) db.events = db.events.slice(0, 200);
  saveDb(db);
  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { user: newUser, isNewUser: true };
}

// ============================================================
// Tool Usage Tracking
// ============================================================
export function recordToolUsage(toolSlug: string, email?: string): void {
  const db = getDb();
  db.toolUsage[toolSlug] = (db.toolUsage[toolSlug] || 0) + 1;
  db.events.unshift({
    timestamp: new Date().toISOString(),
    type: 'tool_use',
    toolSlug,
    email,
  });
  if (db.events.length > 200) {
    db.events = db.events.slice(0, 200);
  }
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }
}

export async function recordToolUsageAsync(toolSlug: string, email?: string): Promise<void> {
  if (isGoogleDriveConfigured()) {
    await mutateDriveDatabase((db) => {
      db.toolUsage[toolSlug] = (db.toolUsage[toolSlug] || 0) + 1;
      db.events.unshift({
        timestamp: new Date().toISOString(),
        type: 'tool_use',
        toolSlug,
        email,
      });
      if (db.events.length > 200) {
        db.events = db.events.slice(0, 200);
      }
    });
    return;
  }
  recordToolUsage(toolSlug, email);
}

// ============================================================
// Member Deletion (Manager / Admin Only)
// ============================================================
export function deleteUserById(id: string): { success: boolean; user?: UserRecord; error?: string } {
  const db = getDb();
  const index = db.users.findIndex((u) => u.id === id);
  if (index === -1) {
    return { success: false, error: 'Member not found.' };
  }

  const target = db.users[index];
  if (isManagerEmail(target.email) || target.role === 'manager') {
    return { success: false, error: 'Cannot delete an authorized manager account.' };
  }

  const [deletedUser] = db.users.splice(index, 1);
  const now = new Date().toISOString();

  db.events.unshift({
    timestamp: now,
    type: 'member_delete',
    email: deletedUser.email,
  });
  if (db.events.length > 200) {
    db.events = db.events.slice(0, 200);
  }

  saveDb(db);
  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }
  return { success: true, user: deletedUser };
}

export async function deleteUserByIdAsync(id: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  if (isGoogleDriveConfigured()) {
    return mutateDriveDatabase((db) => {
      const index = db.users.findIndex((u) => u.id === id);
      if (index === -1) {
        return { success: false, error: 'Member not found.' };
      }
      const target = db.users[index];
      if (isManagerEmail(target.email) || target.role === 'manager') {
        return { success: false, error: 'Cannot delete an authorized manager account.' };
      }
      const [deletedUser] = db.users.splice(index, 1);
      db.events.unshift({
        timestamp: new Date().toISOString(),
        type: 'member_delete',
        email: deletedUser.email,
      });
      if (db.events.length > 200) {
        db.events = db.events.slice(0, 200);
      }
      return { success: true, user: deletedUser };
    });
  }
  return deleteUserById(id);
}

export function deleteUserByEmail(email: string): { success: boolean; user?: UserRecord; error?: string } {
  const normalized = email.trim().toLowerCase();
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) {
    return { success: false, error: 'Member not found.' };
  }
  return deleteUserById(user.id);
}

export async function deleteUserByEmailAsync(email: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  const user = await findUserByEmailAsync(email);
  if (!user) {
    return { success: false, error: 'Member not found.' };
  }
  return deleteUserByIdAsync(user.id);
}

// ============================================================
// Password Reset Functionality
// ============================================================
export function createPasswordResetToken(email: string): { success: boolean; token?: string; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return { success: false, error: 'No account found with this email address.' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHashed = hashToken(rawToken);
  const expires = new Date(Date.now() + 3600 * 1000).toISOString();

  user.resetTokenHash = tokenHashed;
  user.resetTokenExpires = expires;
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { success: true, token: rawToken };
}

export function verifyResetToken(token: string): { valid: boolean; email?: string; error?: string } {
  if (!token) return { valid: false, error: 'Reset token is required.' };
  const db = getDb();
  const tokenHashed = hashToken(token);
  const user = db.users.find((u) => u.resetTokenHash === tokenHashed);

  if (!user || !user.resetTokenExpires) {
    return { valid: false, error: 'Invalid or expired password reset link.' };
  }

  if (new Date(user.resetTokenExpires).getTime() < Date.now()) {
    return { valid: false, error: 'This password reset link has expired. Please request a new one.' };
  }

  return { valid: true, email: user.email };
}

export function resetPasswordWithToken(
  token: string,
  newPassword: string
): { success: boolean; error?: string } {
  if (!token) {
    return { success: false, error: 'Reset token is required.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const db = getDb();
  const tokenHashed = hashToken(token);
  const user = db.users.find((u) => u.resetTokenHash === tokenHashed);

  if (!user || !user.resetTokenExpires) {
    return { success: false, error: 'Invalid or expired password reset link.' };
  }

  if (new Date(user.resetTokenExpires).getTime() < Date.now()) {
    return { success: false, error: 'This password reset link has expired. Please request a new one.' };
  }

  user.passwordHash = hashPassword(newPassword);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { success: true };
}

// ============================================================
// Contact Messages (Public Submission & Manager Review)
// ============================================================
export function createContactMessage(data: {
  name: string;
  email: string;
  category: string;
  message: string;
}): ContactMessage {
  const db = getDb();
  const now = new Date().toISOString();
  const id = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const newMsg: ContactMessage = {
    id,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    category: data.category.trim(),
    message: data.message.trim(),
    status: 'unread',
    createdAt: now,
    updatedAt: now,
  };

  if (!Array.isArray(db.contactMessages)) {
    db.contactMessages = [];
  }

  db.contactMessages.unshift(newMsg);
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return newMsg;
}

export async function createContactMessageAsync(data: {
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<ContactMessage> {
  if (isGoogleDriveConfigured()) {
    return mutateDriveDatabase((db) => {
      const now = new Date().toISOString();
      const id = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const newMsg: ContactMessage = {
        id,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        category: data.category.trim(),
        message: data.message.trim(),
        status: 'unread',
        createdAt: now,
        updatedAt: now,
      };
      if (!Array.isArray(db.contactMessages)) db.contactMessages = [];
      db.contactMessages.unshift(newMsg);
      return newMsg;
    });
  }
  return createContactMessage(data);
}

export function getContactMessages(): ContactMessage[] {
  const db = getDb();
  if (!Array.isArray(db.contactMessages)) {
    return [];
  }
  return [...db.contactMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getContactMessageById(id: string): ContactMessage | undefined {
  const db = getDb();
  return db.contactMessages?.find((m) => m.id === id);
}

export function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus
): { success: boolean; message?: ContactMessage; error?: string } {
  const validStatuses: ContactMessageStatus[] = ['unread', 'read', 'replied', 'resolved'];
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status value.' };
  }

  const db = getDb();
  if (!Array.isArray(db.contactMessages)) {
    return { success: false, error: 'Message not found.' };
  }

  const target = db.contactMessages.find((m) => m.id === id);
  if (!target) {
    return { success: false, error: 'Message not found.' };
  }

  target.status = status;
  target.updatedAt = new Date().toISOString();
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { success: true, message: target };
}

export function deleteContactMessage(id: string): { success: boolean; error?: string } {
  const db = getDb();
  if (!Array.isArray(db.contactMessages)) {
    return { success: false, error: 'Message not found.' };
  }

  const index = db.contactMessages.findIndex((m) => m.id === id);
  if (index === -1) {
    return { success: false, error: 'Message not found.' };
  }

  db.contactMessages.splice(index, 1);
  saveDb(db);

  if (isGoogleDriveConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { success: true };
}

export async function getContactMessagesAsync(): Promise<ContactMessage[]> {
  const db = await getDbAsync();
  if (!Array.isArray(db.contactMessages)) {
    return [];
  }
  return [...db.contactMessages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateContactMessageStatusAsync(
  id: string,
  status: ContactMessageStatus
): Promise<{ success: boolean; message?: ContactMessage; error?: string }> {
  if (isGoogleDriveConfigured()) {
    return mutateDriveDatabase((db) => {
      const validStatuses: ContactMessageStatus[] = ['unread', 'read', 'replied', 'resolved'];
      if (!validStatuses.includes(status)) {
        return { success: false, error: 'Invalid status value.' };
      }
      const target = db.contactMessages?.find((m) => m.id === id);
      if (!target) {
        return { success: false, error: 'Message not found.' };
      }
      target.status = status;
      target.updatedAt = new Date().toISOString();
      return { success: true, message: target };
    });
  }
  return updateContactMessageStatus(id, status);
}

export async function deleteContactMessageAsync(id: string): Promise<{ success: boolean; error?: string }> {
  if (isGoogleDriveConfigured()) {
    return mutateDriveDatabase((db) => {
      if (!Array.isArray(db.contactMessages)) {
        return { success: false, error: 'Message not found.' };
      }
      const index = db.contactMessages.findIndex((m) => m.id === id);
      if (index === -1) {
        return { success: false, error: 'Message not found.' };
      }
      db.contactMessages.splice(index, 1);
      return { success: true };
    });
  }
  return deleteContactMessage(id);
}

// ============================================================
// Website Visitor Tracking & Persistent Analytics
// ============================================================

export function recordPageVisit(data: {
  visitorHash: string;
  maskedIp: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  visitorSessionId?: string;
}): { success: boolean; visit?: PageVisitRecord; debounced?: boolean } {
  const visitorKey = data.visitorSessionId || data.visitorHash;
  const normalizedPath = data.path.trim();

  if (isRecentDuplicateVisit(visitorKey, normalizedPath, 5000)) {
    const existing = loadPersistedVisits().find((v) => {
      const key = v.visitorSessionId || v.visitorHash;
      return key === visitorKey && v.path.trim() === normalizedPath;
    });
    return { success: true, visit: existing, debounced: true };
  }

  const id = `vis_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  const newVisit: PageVisitRecord = {
    id,
    timestamp: now,
    visitorHash: data.visitorHash,
    maskedIp: data.maskedIp,
    path: normalizedPath,
    referrer: data.referrer ? data.referrer.trim() : undefined,
    userAgent: data.userAgent ? data.userAgent.slice(0, 150) : undefined,
    visitorSessionId: data.visitorSessionId || undefined,
  };

  persistNewVisitSync(newVisit);
  return { success: true, visit: newVisit, debounced: false };
}

export async function recordPageVisitAsync(data: {
  visitorHash: string;
  maskedIp: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  visitorSessionId?: string;
}): Promise<{ success: boolean; visit?: PageVisitRecord; debounced?: boolean }> {
  const visitorKey = data.visitorSessionId || data.visitorHash;
  const normalizedPath = data.path.trim();

  if (isGoogleDriveConfigured()) {
    return mutateDriveDatabase(async (db) => {
      const isDuplicate = isRecentDuplicateVisit(
        visitorKey,
        normalizedPath,
        5000,
        Date.now(),
        db.visits
      );

      if (isDuplicate) {
        const existing = db.visits.find((v) => {
          const key = v.visitorSessionId || v.visitorHash;
          return key === visitorKey && v.path.trim() === normalizedPath;
        });
        return { success: true, visit: existing, debounced: true };
      }

      const id = `vis_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      const newVisit: PageVisitRecord = {
        id,
        timestamp: now,
        visitorHash: data.visitorHash,
        maskedIp: data.maskedIp,
        path: normalizedPath,
        referrer: data.referrer ? data.referrer.trim() : undefined,
        userAgent: data.userAgent ? data.userAgent.slice(0, 150) : undefined,
        visitorSessionId: data.visitorSessionId || undefined,
      };

      db.visits.unshift(newVisit);
      if (db.visits.length > 10000) {
        db.visits = db.visits.slice(0, 10000);
      }
      return { success: true, visit: newVisit, debounced: false };
    });
  }

  // Fallback for isolated unit tests
  return recordPageVisit(data);
}

export function getVisitorStats(): {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisitors: number;
  visits: (PageVisitRecord & { visitCount: number })[];
} {
  return calculateVisitorAnalytics(REPORTING_TIMEZONE);
}

export async function getVisitorStatsAsync(): Promise<{
  totalVisits: number;
  uniqueVisitors: number;
  todayVisitors: number;
  visits: (PageVisitRecord & { visitCount: number })[];
  isDriveConnected: boolean;
  databaseStatus: 'connected' | 'query_failed' | 'unconfigured';
  storageProvider: string;
  folderName: string;
  targetAccount: string;
  errorMessage?: string;
}> {
  if (isGoogleDriveConfigured()) {
    try {
      const db = await loadDriveDatabase();
      const analytics = calculateVisitorAnalytics(REPORTING_TIMEZONE, new Date(), db.visits);
      return {
        ...analytics,
        isDriveConnected: true,
        databaseStatus: 'connected',
        storageProvider: 'Google Drive',
        folderName: DEFAULT_FOLDER_NAME,
        targetAccount: TARGET_GOOGLE_ACCOUNT,
      };
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.warn('Google Drive database read failed:', msg);
      return {
        totalVisits: 0,
        uniqueVisitors: 0,
        todayVisitors: 0,
        visits: [],
        isDriveConnected: false,
        databaseStatus: 'query_failed',
        storageProvider: 'Google Drive',
        folderName: DEFAULT_FOLDER_NAME,
        targetAccount: TARGET_GOOGLE_ACCOUNT,
        errorMessage: msg,
      };
    }
  }

  const localStats = getVisitorStats();
  return {
    ...localStats,
    isDriveConnected: false,
    databaseStatus: 'unconfigured',
    storageProvider: 'Google Drive',
    folderName: DEFAULT_FOLDER_NAME,
    targetAccount: TARGET_GOOGLE_ACCOUNT,
    errorMessage:
      'Google Drive API credentials not configured in Vercel. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN.',
  };
}

export function getRegisteredMembersCount(): number {
  const db = getDb();
  return Array.isArray(db.users) ? db.users.length : 0;
}

export async function getRegisteredMembersCountAsync(): Promise<number> {
  const db = await getDbAsync();
  return Array.isArray(db.users) ? db.users.length : 0;
}
