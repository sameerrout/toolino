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
import {
  REPORTING_TIMEZONE,
  getReportingDayBounds,
  getReportingDateString,
} from '@/lib/analytics/visitor';
import { TOOL_REGISTRY } from '@/data/toolRegistry';
import {
  loadGmailDatabase,
  saveGmailDatabase,
  mutateGmailDatabase,
  isGmailStorageConfigured,
  TARGET_GMAIL_ACCOUNT,
  INITIAL_MANAGERS,
  type DatabaseSchema,
  type UserRecord,
  type ActivityEvent,
  type ContactMessage,
  type ContactMessageStatus,
  type PageVisitRecord,
  type VisitorSessionRecord,
  type LoginEventRecord,
  type ToolExecutionRecord,
} from '@/lib/gmail/gmailStore';

export type {
  DatabaseSchema,
  UserRecord,
  ActivityEvent,
  ContactMessage,
  ContactMessageStatus,
  PageVisitRecord,
  VisitorSessionRecord,
  LoginEventRecord,
  ToolExecutionRecord,
};
export { INITIAL_MANAGERS };

const INITIAL_DB: DatabaseSchema = {
  users: [...INITIAL_MANAGERS],
  toolUsage: {},
  events: [],
  contactMessages: [],
  visits: [],
  visitorSessions: [],
  loginEvents: [],
  toolExecutions: [],
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
          for (const mgr of INITIAL_MANAGERS) {
            if (!parsed.users.some((u) => u.email.toLowerCase() === mgr.email.toLowerCase())) {
              parsed.users.push({ ...mgr });
            }
          }
          if (!parsed.toolUsage || typeof parsed.toolUsage !== 'object') parsed.toolUsage = {};
          if (!Array.isArray(parsed.events)) parsed.events = [];
          if (!Array.isArray(parsed.contactMessages)) parsed.contactMessages = [];
          if (!Array.isArray(parsed.visitorSessions)) parsed.visitorSessions = [];
          if (!Array.isArray(parsed.loginEvents)) parsed.loginEvents = [];
          if (!Array.isArray(parsed.toolExecutions)) parsed.toolExecutions = [];
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
      users: [...INITIAL_MANAGERS],
      toolUsage: {},
      events: [],
      contactMessages: [],
      visits: loadPersistedVisits(),
      visitorSessions: [],
      loginEvents: [],
      toolExecutions: [],
    };
  } else {
    for (const mgr of INITIAL_MANAGERS) {
      if (!globalForDb.__toolino_memory_db__.users.some((u) => u.email.toLowerCase() === mgr.email.toLowerCase())) {
        globalForDb.__toolino_memory_db__.users.push({ ...mgr });
      }
    }
    if (!Array.isArray(globalForDb.__toolino_memory_db__.visitorSessions)) {
      globalForDb.__toolino_memory_db__.visitorSessions = [];
    }
    if (!Array.isArray(globalForDb.__toolino_memory_db__.loginEvents)) {
      globalForDb.__toolino_memory_db__.loginEvents = [];
    }
    if (!Array.isArray(globalForDb.__toolino_memory_db__.toolExecutions)) {
      globalForDb.__toolino_memory_db__.toolExecutions = [];
    }
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
  if (isGmailStorageConfigured()) {
    return loadGmailDatabase();
  }
  return getDb();
}

/**
 * Primary asynchronous database saver: writes strictly to Google Drive if configured.
 */
export async function saveDbAsync(data: DatabaseSchema): Promise<void> {
  if (isGmailStorageConfigured()) {
    await saveGmailDatabase(data);
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

  if (isGmailStorageConfigured()) {
    saveDbAsync(db).catch((err) => console.error('Failed to sync registered user to Google Drive:', err));
  }

  return { user: newUser };
}

export async function registerEmailUserAsync(
  email: string,
  password: string,
  name?: string
): Promise<{ user?: UserRecord; error?: string }> {
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase(async (db) => {
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
      if (isGmailStorageConfigured()) {
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
  if (isGmailStorageConfigured()) {
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
    if (isGmailStorageConfigured()) {
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
  if (isGmailStorageConfigured()) {
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

  if (isGmailStorageConfigured()) {
    saveDbAsync(db).catch(() => {});
  }
}

export async function recordToolUsageAsync(toolSlug: string, email?: string): Promise<void> {
  if (isGmailStorageConfigured()) {
    await mutateGmailDatabase((db) => {
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
  if (isGmailStorageConfigured()) {
    saveDbAsync(db).catch(() => {});
  }
  return { success: true, user: deletedUser };
}

export async function deleteUserByIdAsync(id: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
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
  if (isManagerEmail(normalized)) {
    return { success: false, error: 'Cannot delete an authorized manager account.' };
  }
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (!user) {
    return { success: false, error: 'Member not found.' };
  }
  return deleteUserById(user.id);
}

export async function deleteUserByEmailAsync(email: string): Promise<{ success: boolean; user?: UserRecord; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (isManagerEmail(normalized)) {
    return { success: false, error: 'Cannot delete an authorized manager account.' };
  }
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

  if (isGmailStorageConfigured()) {
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

  if (isGmailStorageConfigured()) {
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

  if (isGmailStorageConfigured()) {
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
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
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

  if (isGmailStorageConfigured()) {
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

  if (isGmailStorageConfigured()) {
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
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
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
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
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

  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase(async (db) => {
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
  if (isGmailStorageConfigured()) {
    try {
      const db = await loadGmailDatabase();
      const analytics = calculateVisitorAnalytics(REPORTING_TIMEZONE, new Date(), db.visits);
      return {
        ...analytics,
        isDriveConnected: true,
        databaseStatus: 'connected',
        storageProvider: 'Gmail API Storage',
        folderName: 'ToolForForever/Metadata',
        targetAccount: TARGET_GMAIL_ACCOUNT,
      };
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.warn('Gmail storage database read failed:', msg);
      return {
        totalVisits: 0,
        uniqueVisitors: 0,
        todayVisitors: 0,
        visits: [],
        isDriveConnected: false,
        databaseStatus: 'query_failed',
        storageProvider: 'Gmail API Storage',
        folderName: 'ToolForForever/Metadata',
        targetAccount: TARGET_GMAIL_ACCOUNT,
        errorMessage: msg,
      };
    }
  }

  const localStats = getVisitorStats();
  return {
    ...localStats,
    isDriveConnected: false,
    databaseStatus: 'unconfigured',
    storageProvider: 'Gmail API Storage',
    folderName: 'ToolForForever/Metadata',
    targetAccount: TARGET_GMAIL_ACCOUNT,
    errorMessage:
      'Gmail Storage API credentials not configured in Vercel. Set GMAIL_STORAGE_CLIENT_ID, GMAIL_STORAGE_CLIENT_SECRET, and GMAIL_STORAGE_REFRESH_TOKEN.',
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

// ============================================================
// Tool Display Name & Category Lookup
// ============================================================
export function resolveToolDisplayName(slug: string): string {
  const found = TOOL_REGISTRY.find((t) => t.slug === slug);
  if (found) return found.name;
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// ============================================================
// Date Range Filtering (Asia/Kolkata boundary default)
// ============================================================
export function getDateRangeBounds(
  range: string,
  customStart?: string,
  customEnd?: string,
  timeZone = REPORTING_TIMEZONE
): { startMs: number; endMs: number } {
  const now = new Date();
  const todayBounds = getReportingDayBounds(timeZone, now);
  const nowMs = now.getTime();

  switch (range) {
    case 'today':
      return { startMs: todayBounds.start.getTime(), endMs: todayBounds.end.getTime() };
    case 'yesterday': {
      const yesterdayStart = new Date(todayBounds.start.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = todayBounds.start;
      return { startMs: yesterdayStart.getTime(), endMs: yesterdayEnd.getTime() };
    }
    case '7days': {
      const start = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
      return { startMs: start.getTime(), endMs: nowMs };
    }
    case '30days': {
      const start = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
      return { startMs: start.getTime(), endMs: nowMs };
    }
    case 'this_month': {
      const year = todayBounds.dateStr.slice(0, 4);
      const month = todayBounds.dateStr.slice(5, 7);
      const monthStart = new Date(`${year}-${month}-01T00:00:00+05:30`);
      return { startMs: monthStart.getTime(), endMs: nowMs };
    }
    case 'custom': {
      const startMs = customStart ? new Date(customStart).getTime() : 0;
      const endMs = customEnd ? new Date(customEnd).getTime() : nowMs;
      return {
        startMs: isNaN(startMs) ? 0 : startMs,
        endMs: isNaN(endMs) ? nowMs : endMs,
      };
    }
    case 'all':
    default:
      return { startMs: 0, endMs: nowMs + 86400000 };
  }
}

// ============================================================
// Live Visitor Sessions Tracking & Heartbeat
// ============================================================
export const ACTIVE_SESSION_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes inactivity threshold

export function recordVisitorSessionHeartbeat(data: {
  sessionId: string;
  visitorHash: string;
  maskedIp: string;
  currentPath: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string;
  isAuthenticated?: boolean;
  startTime?: string;
  lastActivityTime?: string;
}): { success: boolean; session: VisitorSessionRecord; isNew: boolean } {
  const db = getDb();
  if (!Array.isArray(db.visitorSessions)) db.visitorSessions = [];

  const now = new Date().toISOString();
  const activityTime = data.lastActivityTime || now;
  let session = db.visitorSessions.find((s) => s.sessionId === data.sessionId);
  let isNew = false;
  const isAuthenticated = data.isAuthenticated !== undefined ? data.isAuthenticated : Boolean(data.userId || data.userEmail);

  if (session) {
    session.lastActivityTime = activityTime;
    session.currentPath = data.currentPath;
    session.status = 'active';
    if (isAuthenticated) {
      session.isAuthenticated = true;
      if (data.userId) session.userId = data.userId;
      if (data.userEmail) session.userEmail = data.userEmail;
    }
  } else {
    isNew = true;
    session = {
      sessionId: data.sessionId,
      visitorHash: data.visitorHash,
      maskedIp: data.maskedIp,
      startTime: data.startTime || activityTime,
      lastActivityTime: activityTime,
      currentPath: data.currentPath,
      isAuthenticated,
      userId: data.userId,
      userEmail: data.userEmail,
      userAgent: data.userAgent ? data.userAgent.slice(0, 150) : undefined,
      status: 'active',
    };
    db.visitorSessions.unshift(session);
    if (db.visitorSessions.length > 5000) {
      db.visitorSessions = db.visitorSessions.slice(0, 5000);
    }
  }

  saveDb(db);
  if (isGmailStorageConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return { success: true, session, isNew };
}

export async function recordVisitorSessionHeartbeatAsync(data: {
  sessionId: string;
  visitorHash: string;
  maskedIp: string;
  currentPath: string;
  userAgent?: string;
  userId?: string;
  userEmail?: string;
  isAuthenticated?: boolean;
  startTime?: string;
  lastActivityTime?: string;
}): Promise<{ success: boolean; session: VisitorSessionRecord; isNew: boolean }> {
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
      if (!Array.isArray(db.visitorSessions)) db.visitorSessions = [];
      const now = new Date().toISOString();
      const activityTime = data.lastActivityTime || now;
      let session = db.visitorSessions.find((s) => s.sessionId === data.sessionId);
      let isNew = false;
      const isAuthenticated = data.isAuthenticated !== undefined ? data.isAuthenticated : Boolean(data.userId || data.userEmail);

      if (session) {
        session.lastActivityTime = activityTime;
        session.currentPath = data.currentPath;
        session.status = 'active';
        if (isAuthenticated) {
          session.isAuthenticated = true;
          if (data.userId) session.userId = data.userId;
          if (data.userEmail) session.userEmail = data.userEmail;
        }
      } else {
        isNew = true;
        session = {
          sessionId: data.sessionId,
          visitorHash: data.visitorHash,
          maskedIp: data.maskedIp,
          startTime: data.startTime || activityTime,
          lastActivityTime: activityTime,
          currentPath: data.currentPath,
          isAuthenticated,
          userId: data.userId,
          userEmail: data.userEmail,
          userAgent: data.userAgent ? data.userAgent.slice(0, 150) : undefined,
          status: 'active',
        };
        db.visitorSessions.unshift(session);
        if (db.visitorSessions.length > 5000) {
          db.visitorSessions = db.visitorSessions.slice(0, 5000);
        }
      }
      return { success: true, session, isNew };
    });
  }

  return recordVisitorSessionHeartbeat(data);
}

export function getActiveVisitorSessions(thresholdMs = ACTIVE_SESSION_THRESHOLD_MS): {
  totalActive: number;
  anonymousActive: number;
  authenticatedActive: number;
  sessions: VisitorSessionRecord[];
} {
  const db = getDb();
  const sessions = Array.isArray(db.visitorSessions) ? db.visitorSessions : [];
  const now = Date.now();
  const cutoff = now - thresholdMs;

  const active = sessions.filter((s) => {
    const lastActive = new Date(s.lastActivityTime).getTime();
    return !isNaN(lastActive) && lastActive >= cutoff;
  });

  const anonymousActive = active.filter((s) => !s.isAuthenticated).length;
  const authenticatedActive = active.filter((s) => s.isAuthenticated).length;

  return {
    totalActive: active.length,
    anonymousActive,
    authenticatedActive,
    sessions: active,
  };
}

export async function getActiveVisitorSessionsAsync(thresholdMs = ACTIVE_SESSION_THRESHOLD_MS) {
  const db = await getDbAsync();
  const sessions = Array.isArray(db.visitorSessions) ? db.visitorSessions : [];
  const now = Date.now();
  const cutoff = now - thresholdMs;

  const active = sessions.filter((s) => {
    const lastActive = new Date(s.lastActivityTime).getTime();
    return !isNaN(lastActive) && lastActive >= cutoff;
  });

  const anonymousActive = active.filter((s) => !s.isAuthenticated).length;
  const authenticatedActive = active.filter((s) => s.isAuthenticated).length;

  return {
    totalActive: active.length,
    anonymousActive,
    authenticatedActive,
    sessions: active,
  };
}

// ============================================================
// Login History & Authentication Events
// ============================================================
export function recordLoginEvent(data: {
  userId?: string;
  email: string;
  method: 'google' | 'email';
  eventType: 'login' | 'signup' | 'logout' | 'failed_login';
  status: 'success' | 'failure';
  failureReason?: string;
  sessionId?: string;
  maskedIp?: string;
}): LoginEventRecord {
  const db = getDb();
  if (!Array.isArray(db.loginEvents)) db.loginEvents = [];

  const id = `auth_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();

  const event: LoginEventRecord = {
    id,
    userId: data.userId,
    email: data.email.trim().toLowerCase(),
    timestamp: now,
    method: data.method,
    eventType: data.eventType,
    status: data.status,
    failureReason: data.failureReason,
    sessionId: data.sessionId,
    maskedIp: data.maskedIp,
  };

  db.loginEvents.unshift(event);
  if (db.loginEvents.length > 2000) {
    db.loginEvents = db.loginEvents.slice(0, 2000);
  }

  if (data.status === 'success' && data.eventType === 'login') {
    const user = db.users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (user) {
      user.lastLoginAt = now;
      user.loginCount = (user.loginCount || 0) + 1;
    }
  }

  saveDb(db);
  if (isGmailStorageConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return event;
}

export async function recordLoginEventAsync(data: {
  userId?: string;
  email: string;
  method: 'google' | 'email';
  eventType: 'login' | 'signup' | 'logout' | 'failed_login';
  status: 'success' | 'failure';
  failureReason?: string;
  sessionId?: string;
  maskedIp?: string;
}): Promise<LoginEventRecord> {
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
      if (!Array.isArray(db.loginEvents)) db.loginEvents = [];
      const id = `auth_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      const event: LoginEventRecord = {
        id,
        userId: data.userId,
        email: data.email.trim().toLowerCase(),
        timestamp: now,
        method: data.method,
        eventType: data.eventType,
        status: data.status,
        failureReason: data.failureReason,
        sessionId: data.sessionId,
        maskedIp: data.maskedIp,
      };

      db.loginEvents.unshift(event);
      if (db.loginEvents.length > 2000) {
        db.loginEvents = db.loginEvents.slice(0, 2000);
      }

      if (data.status === 'success' && data.eventType === 'login') {
        const user = db.users.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
        if (user) {
          user.lastLoginAt = now;
          user.loginCount = (user.loginCount || 0) + 1;
        }
      }

      return event;
    });
  }

  return recordLoginEvent(data);
}

export function getLoginEvents(options?: {
  search?: string;
  method?: 'all' | 'google' | 'email';
  status?: 'all' | 'success' | 'failure';
  range?: string;
  customStart?: string;
  customEnd?: string;
  page?: number;
  pageSize?: number;
}): {
  events: LoginEventRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const db = getDb();
  const allEvents = Array.isArray(db.loginEvents) ? db.loginEvents : [];
  const { startMs, endMs } = getDateRangeBounds(
    options?.range || 'all',
    options?.customStart,
    options?.customEnd
  );

  const filtered = allEvents.filter((ev) => {
    const t = new Date(ev.timestamp).getTime();
    if (isNaN(t) || t < startMs || t > endMs) return false;
    if (options?.method && options.method !== 'all' && ev.method !== options.method) return false;
    if (options?.status && options.status !== 'all' && ev.status !== options.status) return false;
    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      const emailMatches = ev.email.toLowerCase().includes(q);
      const userMatches = ev.userId?.toLowerCase().includes(q);
      if (!emailMatches && !userMatches) return false;
    }
    return true;
  });

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize || 15));
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    events: paginated,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getLoginEventsAsync(options?: {
  search?: string;
  method?: 'all' | 'google' | 'email';
  status?: 'all' | 'success' | 'failure';
  range?: string;
  customStart?: string;
  customEnd?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDbAsync();
  const allEvents = Array.isArray(db.loginEvents) ? db.loginEvents : [];
  const { startMs, endMs } = getDateRangeBounds(
    options?.range || 'all',
    options?.customStart,
    options?.customEnd
  );

  const filtered = allEvents.filter((ev) => {
    const t = new Date(ev.timestamp).getTime();
    if (isNaN(t) || t < startMs || t > endMs) return false;
    if (options?.method && options.method !== 'all' && ev.method !== options.method) return false;
    if (options?.status && options.status !== 'all' && ev.status !== options.status) return false;
    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      const emailMatches = ev.email.toLowerCase().includes(q);
      const userMatches = ev.userId?.toLowerCase().includes(q);
      if (!emailMatches && !userMatches) return false;
    }
    return true;
  });

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize || 15));
  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    events: paginated,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ============================================================
// Tool Execution Analytics (Initiated, Completed, Failed)
// ============================================================
export function recordToolExecution(data: {
  toolSlug: string;
  toolName?: string;
  userId?: string;
  visitorSessionId?: string;
  status: 'initiated' | 'completed' | 'failed';
  durationMs?: number;
  errorMessage?: string;
  timestamp?: string;
}): ToolExecutionRecord {
  const db = getDb();
  if (!Array.isArray(db.toolExecutions)) db.toolExecutions = [];

  const id = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const execTime = data.timestamp || now;
  const resolvedName = data.toolName || resolveToolDisplayName(data.toolSlug);

  const execution: ToolExecutionRecord = {
    id,
    toolSlug: data.toolSlug,
    toolName: resolvedName,
    userId: data.userId,
    visitorSessionId: data.visitorSessionId,
    timestamp: execTime,
    status: data.status,
    durationMs: data.durationMs,
    errorMessage: data.errorMessage,
  };

  db.toolExecutions.unshift(execution);
  if (db.toolExecutions.length > 5000) {
    db.toolExecutions = db.toolExecutions.slice(0, 5000);
  }

  if (data.status === 'initiated') {
    db.toolUsage[data.toolSlug] = (db.toolUsage[data.toolSlug] || 0) + 1;
    db.events.unshift({
      timestamp: execTime,
      type: 'tool_use',
      toolSlug: data.toolSlug,
      email: data.userId,
    });
    if (db.events.length > 200) db.events = db.events.slice(0, 200);
  }

  saveDb(db);
  if (isGmailStorageConfigured()) {
    saveDbAsync(db).catch(() => {});
  }

  return execution;
}

export async function recordToolExecutionAsync(data: {
  toolSlug: string;
  toolName?: string;
  userId?: string;
  visitorSessionId?: string;
  status: 'initiated' | 'completed' | 'failed';
  durationMs?: number;
  errorMessage?: string;
  timestamp?: string;
}): Promise<ToolExecutionRecord> {
  if (isGmailStorageConfigured()) {
    return mutateGmailDatabase((db) => {
      if (!Array.isArray(db.toolExecutions)) db.toolExecutions = [];
      const id = `exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();
      const execTime = data.timestamp || now;
      const resolvedName = data.toolName || resolveToolDisplayName(data.toolSlug);

      const execution: ToolExecutionRecord = {
        id,
        toolSlug: data.toolSlug,
        toolName: resolvedName,
        userId: data.userId,
        visitorSessionId: data.visitorSessionId,
        timestamp: execTime,
        status: data.status,
        durationMs: data.durationMs,
        errorMessage: data.errorMessage,
      };

      db.toolExecutions.unshift(execution);
      if (db.toolExecutions.length > 5000) {
        db.toolExecutions = db.toolExecutions.slice(0, 5000);
      }

      if (data.status === 'initiated') {
        db.toolUsage[data.toolSlug] = (db.toolUsage[data.toolSlug] || 0) + 1;
        db.events.unshift({
          timestamp: execTime,
          type: 'tool_use',
          toolSlug: data.toolSlug,
          email: data.userId,
        });
        if (db.events.length > 200) db.events = db.events.slice(0, 200);
      }

      return execution;
    });
  }

  return recordToolExecution(data);
}

export interface ToolUsageStatItem {
  toolSlug: string;
  toolName: string;
  category?: string;
  totalExecutions: number;
  completedCount: number;
  failedCount: number;
  uniqueUsers: number;
  uniqueAnonymous: number;
  lastUsedAt?: string;
  percentage: number;
}

export function getToolAnalytics(options?: {
  range?: string;
  customStart?: string;
  customEnd?: string;
  search?: string;
} | string): {
  summary: {
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    distinctToolsUsed: number;
    mostPopularTool?: { toolSlug: string; toolName: string; count: number };
    uniqueUsersCount: number;
    uniqueAnonymousCount: number;
  };
  tools: ToolUsageStatItem[];
  recentExecutions: ToolExecutionRecord[];
} {
  const opts = typeof options === 'string' ? { range: options } : options;
  const db = getDb();
  const allExecs = Array.isArray(db.toolExecutions) ? db.toolExecutions : [];
  const { startMs, endMs } = getDateRangeBounds(
    opts?.range || 'all',
    opts?.customStart,
    opts?.customEnd
  );

  const inPeriod = allExecs.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  // Also fallback to db.toolUsage for total counts if no granular events exist yet
  const toolMap = new Map<
    string,
    {
      toolSlug: string;
      toolName: string;
      category?: string;
      totalExecutions: number;
      completedCount: number;
      failedCount: number;
      usersSet: Set<string>;
      anonSet: Set<string>;
      lastUsedAt?: string;
    }
  >();

  // Initialize from TOOL_REGISTRY so all available tools exist
  for (const t of TOOL_REGISTRY) {
    toolMap.set(t.slug, {
      toolSlug: t.slug,
      toolName: t.name,
      category: t.category,
      totalExecutions: 0,
      completedCount: 0,
      failedCount: 0,
      usersSet: new Set<string>(),
      anonSet: new Set<string>(),
      lastUsedAt: undefined,
    });
  }

  // If "all" range and db.toolUsage has values, seed base totalExecutions
  if ((!opts?.range || opts.range === 'all') && db.toolUsage) {
    for (const [slug, count] of Object.entries(db.toolUsage)) {
      const existing = toolMap.get(slug);
      if (existing) {
        existing.totalExecutions = Math.max(existing.totalExecutions, count);
      } else {
        toolMap.set(slug, {
          toolSlug: slug,
          toolName: resolveToolDisplayName(slug),
          totalExecutions: count,
          completedCount: 0,
          failedCount: 0,
          usersSet: new Set<string>(),
          anonSet: new Set<string>(),
          lastUsedAt: undefined,
        });
      }
    }
  }

  // Aggregate in-period granular execution records
  for (const exec of inPeriod) {
    let entry = toolMap.get(exec.toolSlug);
    if (!entry) {
      entry = {
        toolSlug: exec.toolSlug,
        toolName: exec.toolName || resolveToolDisplayName(exec.toolSlug),
        totalExecutions: 0,
        completedCount: 0,
        failedCount: 0,
        usersSet: new Set<string>(),
        anonSet: new Set<string>(),
        lastUsedAt: undefined,
      };
      toolMap.set(exec.toolSlug, entry);
    }

    // Keep track of initiated count internally
    const e = entry as typeof entry & { initiatedCount?: number };
    if (exec.status === 'initiated') {
      e.initiatedCount = (e.initiatedCount || 0) + 1;
    } else if (exec.status === 'completed') {
      entry.completedCount++;
    } else if (exec.status === 'failed') {
      entry.failedCount++;
    }

    const calculated = (e.initiatedCount || 0) > 0
      ? Math.max(e.initiatedCount || 0, entry.completedCount + entry.failedCount)
      : (entry.completedCount + entry.failedCount);
    entry.totalExecutions = Math.max(entry.totalExecutions, calculated);

    if (exec.userId) {
      entry.usersSet.add(exec.userId);
    } else if (exec.visitorSessionId) {
      entry.anonSet.add(exec.visitorSessionId);
    }

    if (!entry.lastUsedAt || new Date(exec.timestamp).getTime() > new Date(entry.lastUsedAt).getTime()) {
      entry.lastUsedAt = exec.timestamp;
    }
  }

  const allTotalExecutions = Array.from(toolMap.values()).reduce((sum, t) => sum + t.totalExecutions, 0);

  let toolsList: ToolUsageStatItem[] = Array.from(toolMap.values()).map((t) => ({
    toolSlug: t.toolSlug,
    toolName: t.toolName,
    category: t.category,
    totalExecutions: t.totalExecutions,
    completedCount: t.completedCount,
    failedCount: t.failedCount,
    uniqueUsers: t.usersSet.size,
    uniqueAnonymous: t.anonSet.size,
    lastUsedAt: t.lastUsedAt,
    percentage: allTotalExecutions > 0 ? Number(((t.totalExecutions / allTotalExecutions) * 100).toFixed(1)) : 0,
  }));

  if (opts?.search) {
    const q = opts.search.trim().toLowerCase();
    toolsList = toolsList.filter((t) => t.toolName.toLowerCase().includes(q) || t.toolSlug.toLowerCase().includes(q));
  }

  // Sort by total usage count, highest to lowest
  toolsList.sort((a, b) => b.totalExecutions - a.totalExecutions);

  const distinctToolsUsed = toolsList.filter((t) => t.totalExecutions > 0).length;
  const mostPopular = toolsList.length > 0 && toolsList[0].totalExecutions > 0
    ? { toolSlug: toolsList[0].toolSlug, toolName: toolsList[0].toolName, count: toolsList[0].totalExecutions }
    : undefined;

  const allPeriodUsers = new Set<string>();
  const allPeriodAnons = new Set<string>();
  for (const exec of inPeriod) {
    if (exec.userId) allPeriodUsers.add(exec.userId);
    else if (exec.visitorSessionId) allPeriodAnons.add(exec.visitorSessionId);
  }

  return {
    summary: {
      totalExecutions: allTotalExecutions,
      completedExecutions: inPeriod.filter((e) => e.status === 'completed').length,
      failedExecutions: inPeriod.filter((e) => e.status === 'failed').length,
      distinctToolsUsed,
      mostPopularTool: mostPopular,
      uniqueUsersCount: allPeriodUsers.size,
      uniqueAnonymousCount: allPeriodAnons.size,
    },
    tools: toolsList,
    recentExecutions: inPeriod.slice(0, 50),
  };
}

export async function getToolAnalyticsAsync(options?: {
  range?: string;
  customStart?: string;
  customEnd?: string;
  search?: string;
} | string) {
  const opts = typeof options === 'string' ? { range: options } : options;
  const db = await getDbAsync();
  const allExecs = Array.isArray(db.toolExecutions) ? db.toolExecutions : [];
  const { startMs, endMs } = getDateRangeBounds(
    opts?.range || 'all',
    opts?.customStart,
    opts?.customEnd
  );

  const inPeriod = allExecs.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });

  const toolMap = new Map<
    string,
    {
      toolSlug: string;
      toolName: string;
      category?: string;
      totalExecutions: number;
      completedCount: number;
      failedCount: number;
      usersSet: Set<string>;
      anonSet: Set<string>;
      lastUsedAt?: string;
    }
  >();

  for (const t of TOOL_REGISTRY) {
    toolMap.set(t.slug, {
      toolSlug: t.slug,
      toolName: t.name,
      category: t.category,
      totalExecutions: 0,
      completedCount: 0,
      failedCount: 0,
      usersSet: new Set<string>(),
      anonSet: new Set<string>(),
      lastUsedAt: undefined,
    });
  }

  if ((!opts?.range || opts.range === 'all') && db.toolUsage) {
    for (const [slug, count] of Object.entries(db.toolUsage)) {
      const existing = toolMap.get(slug);
      if (existing) {
        existing.totalExecutions = Math.max(existing.totalExecutions, count);
      } else {
        toolMap.set(slug, {
          toolSlug: slug,
          toolName: resolveToolDisplayName(slug),
          totalExecutions: count,
          completedCount: 0,
          failedCount: 0,
          usersSet: new Set<string>(),
          anonSet: new Set<string>(),
          lastUsedAt: undefined,
        });
      }
    }
  }

  for (const exec of inPeriod) {
    let entry = toolMap.get(exec.toolSlug);
    if (!entry) {
      entry = {
        toolSlug: exec.toolSlug,
        toolName: exec.toolName || resolveToolDisplayName(exec.toolSlug),
        totalExecutions: 0,
        completedCount: 0,
        failedCount: 0,
        usersSet: new Set<string>(),
        anonSet: new Set<string>(),
        lastUsedAt: undefined,
      };
      toolMap.set(exec.toolSlug, entry);
    }

    const e = entry as typeof entry & { initiatedCount?: number };
    if (exec.status === 'initiated') {
      e.initiatedCount = (e.initiatedCount || 0) + 1;
    } else if (exec.status === 'completed') {
      entry.completedCount++;
    } else if (exec.status === 'failed') {
      entry.failedCount++;
    }

    const calculated = (e.initiatedCount || 0) > 0
      ? Math.max(e.initiatedCount || 0, entry.completedCount + entry.failedCount)
      : (entry.completedCount + entry.failedCount);
    entry.totalExecutions = Math.max(entry.totalExecutions, calculated);

    if (exec.userId) {
      entry.usersSet.add(exec.userId);
    } else if (exec.visitorSessionId) {
      entry.anonSet.add(exec.visitorSessionId);
    }

    if (!entry.lastUsedAt || new Date(exec.timestamp).getTime() > new Date(entry.lastUsedAt).getTime()) {
      entry.lastUsedAt = exec.timestamp;
    }
  }

  const allTotalExecutions = Array.from(toolMap.values()).reduce((sum, t) => sum + t.totalExecutions, 0);

  let toolsList: ToolUsageStatItem[] = Array.from(toolMap.values()).map((t) => ({
    toolSlug: t.toolSlug,
    toolName: t.toolName,
    category: t.category,
    totalExecutions: t.totalExecutions,
    completedCount: t.completedCount,
    failedCount: t.failedCount,
    uniqueUsers: t.usersSet.size,
    uniqueAnonymous: t.anonSet.size,
    lastUsedAt: t.lastUsedAt,
    percentage: allTotalExecutions > 0 ? Number(((t.totalExecutions / allTotalExecutions) * 100).toFixed(1)) : 0,
  }));

  if (opts?.search) {
    const q = opts.search.trim().toLowerCase();
    toolsList = toolsList.filter((t) => t.toolName.toLowerCase().includes(q) || t.toolSlug.toLowerCase().includes(q));
  }

  toolsList.sort((a, b) => b.totalExecutions - a.totalExecutions);

  const distinctToolsUsed = toolsList.filter((t) => t.totalExecutions > 0).length;
  const mostPopular = toolsList.length > 0 && toolsList[0].totalExecutions > 0
    ? { toolSlug: toolsList[0].toolSlug, toolName: toolsList[0].toolName, count: toolsList[0].totalExecutions }
    : undefined;

  const allPeriodUsers = new Set<string>();
  const allPeriodAnons = new Set<string>();
  for (const exec of inPeriod) {
    if (exec.userId) allPeriodUsers.add(exec.userId);
    else if (exec.visitorSessionId) allPeriodAnons.add(exec.visitorSessionId);
  }

  return {
    summary: {
      totalExecutions: allTotalExecutions,
      completedExecutions: inPeriod.filter((e) => e.status === 'completed').length,
      failedExecutions: inPeriod.filter((e) => e.status === 'failed').length,
      distinctToolsUsed,
      mostPopularTool: mostPopular,
      uniqueUsersCount: allPeriodUsers.size,
      uniqueAnonymousCount: allPeriodAnons.size,
    },
    tools: toolsList,
    recentExecutions: inPeriod.slice(0, 50),
  };
}

// ============================================================
// Registered Users Management & Activity Breakdown
// ============================================================
export interface RegisteredUserSummary {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authProvider: string;
  role: string;
  isManager: boolean;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  emailVerified: boolean;
  status: string;
}

export function getRegisteredUsersList(options?: {
  search?: string;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'loginCount' | 'email';
  sortOrder?: 'asc' | 'desc';
  range?: string;
  customStart?: string;
  customEnd?: string;
  page?: number;
  pageSize?: number;
}): {
  users: RegisteredUserSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const db = getDb();
  let usersList = (db.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    picture: u.picture,
    authProvider: u.authProvider,
    role: u.role,
    isManager: isManagerEmail(u.email) || u.role === 'manager',
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    loginCount: u.loginCount || 1,
    emailVerified: u.emailVerified ?? true,
    status: u.status || 'active',
  }));

  if (options?.range && options.range !== 'all') {
    const { startMs, endMs } = getDateRangeBounds(
      options.range,
      options.customStart,
      options.customEnd
    );
    usersList = usersList.filter((u) => {
      const t = new Date(u.createdAt).getTime();
      return !isNaN(t) && t >= startMs && t <= endMs;
    });
  }

  if (options?.search) {
    const q = options.search.trim().toLowerCase();
    usersList = usersList.filter(
      (u) => u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }

  const sortBy = options?.sortBy || 'createdAt';
  const order = options?.sortOrder || 'desc';

  usersList.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'createdAt') {
      cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'lastLoginAt') {
      cmp = new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    } else if (sortBy === 'loginCount') {
      cmp = b.loginCount - a.loginCount;
    } else if (sortBy === 'email') {
      cmp = a.email.localeCompare(b.email);
    }
    return order === 'asc' ? -cmp : cmp;
  });

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize || 10));
  const totalCount = usersList.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginated = usersList.slice((page - 1) * pageSize, page * pageSize);

  return {
    users: paginated,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getRegisteredUsersListAsync(options?: {
  search?: string;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'loginCount' | 'email';
  sortOrder?: 'asc' | 'desc';
  range?: string;
  customStart?: string;
  customEnd?: string;
  page?: number;
  pageSize?: number;
}) {
  const db = await getDbAsync();
  let usersList = (db.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    picture: u.picture,
    authProvider: u.authProvider,
    role: u.role,
    isManager: isManagerEmail(u.email) || u.role === 'manager',
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    loginCount: u.loginCount || 1,
    emailVerified: u.emailVerified ?? true,
    status: u.status || 'active',
  }));

  if (options?.range && options.range !== 'all') {
    const { startMs, endMs } = getDateRangeBounds(
      options.range,
      options.customStart,
      options.customEnd
    );
    usersList = usersList.filter((u) => {
      const t = new Date(u.createdAt).getTime();
      return !isNaN(t) && t >= startMs && t <= endMs;
    });
  }

  if (options?.search) {
    const q = options.search.trim().toLowerCase();
    usersList = usersList.filter(
      (u) => u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)
    );
  }

  const sortBy = options?.sortBy || 'createdAt';
  const order = options?.sortOrder || 'desc';

  usersList.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'createdAt') {
      cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'lastLoginAt') {
      cmp = new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime();
    } else if (sortBy === 'loginCount') {
      cmp = b.loginCount - a.loginCount;
    } else if (sortBy === 'email') {
      cmp = a.email.localeCompare(b.email);
    }
    return order === 'asc' ? -cmp : cmp;
  });

  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize || 10));
  const totalCount = usersList.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginated = usersList.slice((page - 1) * pageSize, page * pageSize);

  return {
    users: paginated,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export function getUserDetailsWithActivity(userIdOrEmail: string): {
  user: RegisteredUserSummary;
  toolUsageSummary: { toolSlug: string; toolName: string; count: number; lastUsedAt: string }[];
  recentToolExecutions: ToolExecutionRecord[];
  recentLoginEvents: LoginEventRecord[];
} | null {
  const db = getDb();
  const q = userIdOrEmail.trim().toLowerCase();
  const user = db.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === q);
  if (!user) return null;

  const userSummary: RegisteredUserSummary = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    authProvider: user.authProvider,
    role: user.role,
    isManager: isManagerEmail(user.email) || user.role === 'manager',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount || 1,
    emailVerified: user.emailVerified ?? true,
    status: user.status || 'active',
  };

  // Tool executions by this user
  const userExecs = (db.toolExecutions || []).filter(
    (e) => e.userId === user.id || (e.userId && e.userId.toLowerCase() === user.email.toLowerCase())
  );

  const toolMap = new Map<string, { toolSlug: string; toolName: string; count: number; lastUsedAt: string }>();
  for (const exec of userExecs) {
    const existing = toolMap.get(exec.toolSlug);
    if (existing) {
      existing.count++;
      if (new Date(exec.timestamp).getTime() > new Date(existing.lastUsedAt).getTime()) {
        existing.lastUsedAt = exec.timestamp;
      }
    } else {
      toolMap.set(exec.toolSlug, {
        toolSlug: exec.toolSlug,
        toolName: exec.toolName || resolveToolDisplayName(exec.toolSlug),
        count: 1,
        lastUsedAt: exec.timestamp,
      });
    }
  }

  const toolUsageSummary = Array.from(toolMap.values()).sort((a, b) => b.count - a.count);

  // Login events by this user
  const userLogins = (db.loginEvents || []).filter(
    (e) => e.userId === user.id || e.email.toLowerCase() === user.email.toLowerCase()
  );

  return {
    user: userSummary,
    toolUsageSummary,
    recentToolExecutions: userExecs.slice(0, 30),
    recentLoginEvents: userLogins.slice(0, 30),
  };
}

export async function getUserDetailsWithActivityAsync(userIdOrEmail: string) {
  const db = await getDbAsync();
  const q = userIdOrEmail.trim().toLowerCase();
  const user = db.users.find((u) => u.id === userIdOrEmail || u.email.toLowerCase() === q);
  if (!user) return null;

  const userSummary: RegisteredUserSummary = {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    authProvider: user.authProvider,
    role: user.role,
    isManager: isManagerEmail(user.email) || user.role === 'manager',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    loginCount: user.loginCount || 1,
    emailVerified: user.emailVerified ?? true,
    status: user.status || 'active',
  };

  const userExecs = (db.toolExecutions || []).filter(
    (e) => e.userId === user.id || (e.userId && e.userId.toLowerCase() === user.email.toLowerCase())
  );

  const toolMap = new Map<string, { toolSlug: string; toolName: string; count: number; lastUsedAt: string }>();
  for (const exec of userExecs) {
    const existing = toolMap.get(exec.toolSlug);
    if (existing) {
      existing.count++;
      if (new Date(exec.timestamp).getTime() > new Date(existing.lastUsedAt).getTime()) {
        existing.lastUsedAt = exec.timestamp;
      }
    } else {
      toolMap.set(exec.toolSlug, {
        toolSlug: exec.toolSlug,
        toolName: exec.toolName || resolveToolDisplayName(exec.toolSlug),
        count: 1,
        lastUsedAt: exec.timestamp,
      });
    }
  }

  const toolUsageSummary = Array.from(toolMap.values()).sort((a, b) => b.count - a.count);

  const userLogins = (db.loginEvents || []).filter(
    (e) => e.userId === user.id || e.email.toLowerCase() === user.email.toLowerCase()
  );

  return {
    user: userSummary,
    toolUsageSummary,
    recentToolExecutions: userExecs.slice(0, 30),
    recentLoginEvents: userLogins.slice(0, 30),
  };
}

// ============================================================
// Page View Analytics
// ============================================================
export interface PageViewStatItem {
  path: string;
  views: number;
  uniqueSessions: number;
  authenticatedVisits: number;
  anonymousVisits: number;
  percentage: number;
}

export function getPageViewAnalytics(options?: {
  range?: string;
  customStart?: string;
  customEnd?: string;
  search?: string;
}): {
  totalViews: number;
  uniqueSessionsCount: number;
  authenticatedViewsCount: number;
  anonymousViewsCount: number;
  pages: PageViewStatItem[];
  dailyTrends: { date: string; views: number }[];
  recentVisits: PageVisitRecord[];
} {
  const db = getDb();
  const allVisits = Array.isArray(db.visits) ? db.visits : [];
  const { startMs, endMs } = getDateRangeBounds(
    options?.range || 'all',
    options?.customStart,
    options?.customEnd
  );

  // Exclude internal manager / admin visits
  const inPeriod = allVisits.filter((v) => {
    const t = new Date(v.timestamp).getTime();
    if (isNaN(t) || t < startMs || t > endMs) return false;
    const lower = v.path.toLowerCase();
    if (lower.startsWith('/manager') || lower.startsWith('/admin')) return false;
    return true;
  });

  const totalViews = inPeriod.length;
  const sessionsSet = new Set<string>();
  const pagesMap = new Map<
    string,
    {
      path: string;
      views: number;
      sessionsSet: Set<string>;
    }
  >();

  const dailyMap = new Map<string, number>();

  for (const v of inPeriod) {
    const sId = v.visitorSessionId || v.visitorHash;
    sessionsSet.add(sId);

    let pageEntry = pagesMap.get(v.path);
    if (!pageEntry) {
      pageEntry = { path: v.path, views: 0, sessionsSet: new Set<string>() };
      pagesMap.set(v.path, pageEntry);
    }
    pageEntry.views++;
    pageEntry.sessionsSet.add(sId);

    const dateStr = getReportingDateString(v.timestamp);
    if (dateStr) {
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
    }
  }

  let pages: PageViewStatItem[] = Array.from(pagesMap.values()).map((p) => ({
    path: p.path,
    views: p.views,
    uniqueSessions: p.sessionsSet.size,
    authenticatedVisits: 0, // Visits table does not store user ID for privacy
    anonymousVisits: p.views,
    percentage: totalViews > 0 ? Number(((p.views / totalViews) * 100).toFixed(1)) : 0,
  }));

  if (options?.search) {
    const q = options.search.trim().toLowerCase();
    pages = pages.filter((p) => p.path.toLowerCase().includes(q));
  }

  pages.sort((a, b) => b.views - a.views);

  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalViews,
    uniqueSessionsCount: sessionsSet.size,
    authenticatedViewsCount: 0,
    anonymousViewsCount: totalViews,
    pages,
    dailyTrends,
    recentVisits: inPeriod.slice(0, 50),
  };
}

export async function getPageViewAnalyticsAsync(options?: {
  range?: string;
  customStart?: string;
  customEnd?: string;
  search?: string;
}) {
  const db = await getDbAsync();
  const allVisits = Array.isArray(db.visits) ? db.visits : [];
  const { startMs, endMs } = getDateRangeBounds(
    options?.range || 'all',
    options?.customStart,
    options?.customEnd
  );

  const inPeriod = allVisits.filter((v) => {
    const t = new Date(v.timestamp).getTime();
    if (isNaN(t) || t < startMs || t > endMs) return false;
    const lower = v.path.toLowerCase();
    if (lower.startsWith('/manager') || lower.startsWith('/admin')) return false;
    return true;
  });

  const totalViews = inPeriod.length;
  const sessionsSet = new Set<string>();
  const pagesMap = new Map<
    string,
    {
      path: string;
      views: number;
      sessionsSet: Set<string>;
    }
  >();

  const dailyMap = new Map<string, number>();

  for (const v of inPeriod) {
    const sId = v.visitorSessionId || v.visitorHash;
    sessionsSet.add(sId);

    let pageEntry = pagesMap.get(v.path);
    if (!pageEntry) {
      pageEntry = { path: v.path, views: 0, sessionsSet: new Set<string>() };
      pagesMap.set(v.path, pageEntry);
    }
    pageEntry.views++;
    pageEntry.sessionsSet.add(sId);

    const dateStr = getReportingDateString(v.timestamp);
    if (dateStr) {
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
    }
  }

  let pages: PageViewStatItem[] = Array.from(pagesMap.values()).map((p) => ({
    path: p.path,
    views: p.views,
    uniqueSessions: p.sessionsSet.size,
    authenticatedVisits: 0,
    anonymousVisits: p.views,
    percentage: totalViews > 0 ? Number(((p.views / totalViews) * 100).toFixed(1)) : 0,
  }));

  if (options?.search) {
    const q = options.search.trim().toLowerCase();
    pages = pages.filter((p) => p.path.toLowerCase().includes(q));
  }

  pages.sort((a, b) => b.views - a.views);

  const dailyTrends = Array.from(dailyMap.entries())
    .map(([date, views]) => ({ date, views }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalViews,
    uniqueSessionsCount: sessionsSet.size,
    authenticatedViewsCount: 0,
    anonymousViewsCount: totalViews,
    pages,
    dailyTrends,
    recentVisits: inPeriod.slice(0, 50),
  };
}

// ============================================================
// Comprehensive Overview Analytics
// ============================================================
export function getOverviewAnalytics(options?: {
  range?: string;
  customStart?: string;
  customEnd?: string;
}) {
  const db = getDb();
  const now = new Date();
  const todayBounds = getReportingDayBounds(REPORTING_TIMEZONE, now);
  const activeSessions = getActiveVisitorSessions();

  // Users
  const totalRegisteredUsers = Array.isArray(db.users) ? db.users.length : 0;
  const newRegistrationsToday = (db.users || []).filter((u) => {
    const t = new Date(u.createdAt).getTime();
    return !isNaN(t) && t >= todayBounds.start.getTime() && t <= todayBounds.end.getTime();
  }).length;

  // Logins today
  const loginEvents = Array.isArray(db.loginEvents) ? db.loginEvents : [];
  const successfulLoginsToday = loginEvents.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return (
      e.status === 'success' &&
      e.eventType === 'login' &&
      !isNaN(t) &&
      t >= todayBounds.start.getTime() &&
      t <= todayBounds.end.getTime()
    );
  }).length;

  // Page views today
  const visits = Array.isArray(db.visits) ? db.visits : [];
  const pageViewsToday = visits.filter((v) => {
    const t = new Date(v.timestamp).getTime();
    return !isNaN(t) && t >= todayBounds.start.getTime() && t <= todayBounds.end.getTime();
  }).length;

  // Tool executions today
  const toolExecs = Array.isArray(db.toolExecutions) ? db.toolExecutions : [];
  const toolExecutionsToday = toolExecs.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return (
      e.status === 'initiated' &&
      !isNaN(t) &&
      t >= todayBounds.start.getTime() &&
      t <= todayBounds.end.getTime()
    );
  }).length;

  // Tool analytics for selected range
  const toolAnalytics = getToolAnalytics(options);

  // Recent successful logins
  const recentSuccessfulLogins = loginEvents
    .filter((e) => e.status === 'success' && e.eventType === 'login')
    .slice(0, 10);

  // Recent tool activity
  const recentToolActivity = toolExecs.slice(0, 10);

  // Daily activity trends (past 7 days)
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(todayBounds.start.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dateStr = getReportingDateString(d);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const views = visits.filter((v) => {
      const t = new Date(v.timestamp).getTime();
      return !isNaN(t) && t >= dayStart && t < dayEnd;
    }).length;

    const tools = toolExecs.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return e.status === 'initiated' && !isNaN(t) && t >= dayStart && t < dayEnd;
    }).length;

    return {
      date: dateStr,
      pageViews: views,
      toolExecutions: tools,
    };
  });

  return {
    activeVisitors: {
      total: activeSessions.totalActive,
      anonymous: activeSessions.anonymousActive,
      authenticated: activeSessions.authenticatedActive,
      sessions: activeSessions.sessions.slice(0, 10),
    },
    totalRegisteredUsers,
    newRegistrationsToday,
    successfulLoginsToday,
    pageViewsToday,
    toolExecutionsToday,
    totalToolExecutionsPeriod: toolAnalytics.summary.totalExecutions,
    distinctToolsUsed: toolAnalytics.summary.distinctToolsUsed,
    mostPopularTools: toolAnalytics.tools.slice(0, 5),
    recentSuccessfulLogins,
    recentToolActivity,
    dailyTrends: past7Days,
  };
}

export async function getOverviewAnalyticsAsync(options?: {
  range?: string;
  customStart?: string;
  customEnd?: string;
}) {
  const db = await getDbAsync();
  const now = new Date();
  const todayBounds = getReportingDayBounds(REPORTING_TIMEZONE, now);
  const activeSessions = await getActiveVisitorSessionsAsync();

  const totalRegisteredUsers = Array.isArray(db.users) ? db.users.length : 0;
  const newRegistrationsToday = (db.users || []).filter((u) => {
    const t = new Date(u.createdAt).getTime();
    return !isNaN(t) && t >= todayBounds.start.getTime() && t <= todayBounds.end.getTime();
  }).length;

  const loginEvents = Array.isArray(db.loginEvents) ? db.loginEvents : [];
  const successfulLoginsToday = loginEvents.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return (
      e.status === 'success' &&
      e.eventType === 'login' &&
      !isNaN(t) &&
      t >= todayBounds.start.getTime() &&
      t <= todayBounds.end.getTime()
    );
  }).length;

  const visits = Array.isArray(db.visits) ? db.visits : [];
  const pageViewsToday = visits.filter((v) => {
    const t = new Date(v.timestamp).getTime();
    return !isNaN(t) && t >= todayBounds.start.getTime() && t <= todayBounds.end.getTime();
  }).length;

  const toolExecs = Array.isArray(db.toolExecutions) ? db.toolExecutions : [];
  const toolExecutionsToday = toolExecs.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return (
      e.status === 'initiated' &&
      !isNaN(t) &&
      t >= todayBounds.start.getTime() &&
      t <= todayBounds.end.getTime()
    );
  }).length;

  const toolAnalytics = await getToolAnalyticsAsync(options);

  const recentSuccessfulLogins = loginEvents
    .filter((e) => e.status === 'success' && e.eventType === 'login')
    .slice(0, 10);

  const recentToolActivity = toolExecs.slice(0, 10);

  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(todayBounds.start.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dateStr = getReportingDateString(d);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const views = visits.filter((v) => {
      const t = new Date(v.timestamp).getTime();
      return !isNaN(t) && t >= dayStart && t < dayEnd;
    }).length;

    const tools = toolExecs.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return e.status === 'initiated' && !isNaN(t) && t >= dayStart && t < dayEnd;
    }).length;

    return {
      date: dateStr,
      pageViews: views,
      toolExecutions: tools,
    };
  });

  return {
    activeVisitors: {
      total: activeSessions.totalActive,
      anonymous: activeSessions.anonymousActive,
      authenticated: activeSessions.authenticatedActive,
      sessions: activeSessions.sessions.slice(0, 10),
    },
    totalRegisteredUsers,
    newRegistrationsToday,
    successfulLoginsToday,
    pageViewsToday,
    toolExecutionsToday,
    totalToolExecutionsPeriod: toolAnalytics.summary.totalExecutions,
    distinctToolsUsed: toolAnalytics.summary.distinctToolsUsed,
    mostPopularTools: toolAnalytics.tools.slice(0, 5),
    recentSuccessfulLogins,
    recentToolActivity,
    dailyTrends: past7Days,
  };
}
