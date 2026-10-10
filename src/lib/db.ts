import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { isManagerEmail } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import {
  loadPersistedVisits,
  persistNewVisitSync,
  isRecentDuplicateVisit,
  calculateVisitorAnalytics,
} from '@/lib/analytics/visitsStore';
import { REPORTING_TIMEZONE, getReportingDayBounds } from '@/lib/analytics/visitor';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  picture?: string;
  authProvider: 'google' | 'email';
  passwordHash?: string;
  role: 'user' | 'manager';
  createdAt: string;
  lastLoginAt: string;
  resetTokenHash?: string;
  resetTokenExpires?: string;
}

export interface ActivityEvent {
  timestamp: string;
  type: 'signup' | 'login' | 'tool_use' | 'member_delete';
  email?: string;
  toolSlug?: string;
}

export type ContactMessageStatus = 'unread' | 'read' | 'replied' | 'resolved';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PageVisitRecord {
  id: string;
  timestamp: string;
  visitorHash: string;
  maskedIp: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  visitorSessionId?: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  toolUsage: Record<string, number>;
  events: ActivityEvent[];
  contactMessages: ContactMessage[];
  visits: PageVisitRecord[];
}

const INITIAL_DB: DatabaseSchema = {
  users: [],
  toolUsage: {},
  events: [],
  contactMessages: [],
  visits: [],
};

// Global in-memory cache on globalThis for fast lookup and serverless resilience across hot-reloads
const globalForDb = globalThis as unknown as {
  __toolino_memory_db__?: DatabaseSchema;
  prisma?: PrismaClient;
};

// Global Prisma instance for connection reuse across hot-reloads
export const prisma =
  globalForDb.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForDb.prisma = prisma;

function getDbFilePath(): string {
  // Use /tmp on Vercel or AWS Lambda where the project root is read-only
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
    // If filesystem write fails, in-memory memoryDb is used
  }
  return filePath;
}

/**
 * Returns database state, ensuring backwards compatibility and dev resilience.
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
          // Always use authoritative persisted visits
          parsed.visits = loadPersistedVisits();
          globalForDb.__toolino_memory_db__ = parsed;
          return parsed;
        }
      }
    }
  } catch (error) {
    console.error('Failed to read database store:', error);
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
  // Ensure visits array in saveDb is authoritative and never overwritten by stale state
  data.visits = loadPersistedVisits();
  globalForDb.__toolino_memory_db__ = data;

  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const filePath = ensureDbFile();
      const tempFile = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.renameSync(tempFile, filePath);
      } catch {
        // Fallback for Windows file locking / OneDrive sync
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        if (fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch {
            // ignore cleanup error
          }
        }
      }
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('Failed to save database store after retries:', error);
      }
    }
  }
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

  if (prisma?.user?.upsert && process.env.DATABASE_URL) {
    prisma.user.upsert({
      where: { email: newUser.email },
      update: {
        name: newUser.name,
        passwordHash: newUser.passwordHash || null,
        role: newUser.role,
        lastLoginAt: new Date(newUser.lastLoginAt),
      },
      create: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        authProvider: 'email',
        passwordHash: newUser.passwordHash || null,
        role: newUser.role,
        createdAt: new Date(newUser.createdAt),
        lastLoginAt: new Date(newUser.lastLoginAt),
      },
    }).catch(() => {});
  }

  return { user: newUser };
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

  // If user does not exist in DB:
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
      return { user: activeUser };
    }
    return { error: 'Invalid email or password.' };
  }

  // Match stored password hash in database
  const passwordMatches = user.passwordHash ? verifyPassword(password, user.passwordHash) : false;
  const isEnvManagerValid = isManager && process.env.MANAGER_PASSWORD && password === process.env.MANAGER_PASSWORD;

  if (!passwordMatches && !isEnvManagerValid) {
    return { error: 'Invalid email or password.' };
  }

  // Ensure role is manager if on manager email list
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

  if (prisma?.toolUsage?.upsert && process.env.DATABASE_URL) {
    prisma.toolUsage.upsert({
      where: { slug: toolSlug },
      update: { count: { increment: 1 } },
      create: { slug: toolSlug, count: 1 },
    }).catch(() => {});
  }
  if (prisma?.activityEvent?.create && process.env.DATABASE_URL) {
    prisma.activityEvent.create({
      data: {
        type: 'tool_use',
        toolSlug,
        email: email ? email.toLowerCase() : null,
        timestamp: new Date(),
      },
    }).catch(() => {});
  }
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

  // Prevent deleting manager/admin accounts
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

  if (prisma?.user?.delete && process.env.DATABASE_URL) {
    prisma.user.delete({ where: { id } }).catch(() => {});
  }
  return { success: true, user: deletedUser };
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

// ============================================================
// Password Reset Functionality (Hashed Token Storage)
// ============================================================
export function createPasswordResetToken(email: string): { success: boolean; token?: string; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return { success: false, error: 'No account found with this email address.' };
  }

  // Generate cryptographically secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHashed = hashToken(rawToken);
  const expires = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour validity

  // Store ONLY hashed token in the database
  user.resetTokenHash = tokenHashed;
  user.resetTokenExpires = expires;
  saveDb(db);

  // Return raw token exclusively to the email service
  return { success: true, token: rawToken };
}

export function verifyResetToken(token: string): { valid: boolean; email?: string; error?: string } {
  if (!token) return { valid: false, error: 'Reset token is required.' };
  const db = getDb();
  const tokenHashed = hashToken(token);
  
  // Find by hashed token
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

  // Prepend newest message first
  db.contactMessages.unshift(newMsg);
  saveDb(db);

  if (prisma?.contactMessage?.create && process.env.DATABASE_URL) {
    prisma.contactMessage.create({
      data: {
        id: newMsg.id,
        name: newMsg.name,
        email: newMsg.email,
        category: newMsg.category,
        message: newMsg.message,
        status: newMsg.status,
        createdAt: new Date(newMsg.createdAt),
        updatedAt: new Date(newMsg.updatedAt),
      },
    }).catch(() => {});
  }

  return newMsg;
}

export function getContactMessages(): ContactMessage[] {
  const db = getDb();
  if (!Array.isArray(db.contactMessages)) {
    return [];
  }
  // Return sorted newest first
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

  if (prisma?.contactMessage?.update && process.env.DATABASE_URL) {
    prisma.contactMessage.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    }).catch(() => {});
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

  if (prisma?.contactMessage?.delete && process.env.DATABASE_URL) {
    prisma.contactMessage.delete({ where: { id } }).catch(() => {});
  }

  return { success: true };
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
  const normalizedPath = data.path.trim().toLowerCase();

  // Deduplication / Debounce:
  // If the same visitor key visited the exact same path within the last 5 seconds,
  // ignore as duplicate (covers React 19 Strict Mode effect double-invocation & rapid refresh)
  if (isRecentDuplicateVisit(visitorKey, normalizedPath, 5000)) {
    const existing = loadPersistedVisits().find(
      (v) =>
        (v.visitorSessionId || v.visitorHash) === visitorKey &&
        v.path.trim().toLowerCase() === normalizedPath
    );
    return { success: true, visit: existing, debounced: true };
  }

  const id = `vis_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const newVisit: PageVisitRecord = {
    id,
    timestamp: new Date().toISOString(),
    visitorHash: data.visitorHash,
    maskedIp: data.maskedIp,
    path: data.path.trim(),
    referrer: data.referrer ? data.referrer.trim() : undefined,
    userAgent: data.userAgent ? data.userAgent.slice(0, 150) : undefined,
    visitorSessionId: data.visitorSessionId,
  };

  persistNewVisitSync(newVisit);

  return { success: true, visit: newVisit };
}

export async function recordPageVisitAsync(data: {
  visitorHash: string;
  maskedIp: string;
  path: string;
  referrer?: string;
  userAgent?: string;
  visitorSessionId?: string;
}): Promise<{ success: boolean; visit?: PageVisitRecord; debounced?: boolean }> {
  // If Prisma is configured, attempt direct database persistence with atomic deduplication
  if (prisma && process.env.DATABASE_URL) {
    try {
      const fiveSecondsAgo = new Date(Date.now() - 5000);
      const duplicate = await prisma.pageVisit.findFirst({
        where: {
          path: data.path.trim(),
          timestamp: { gte: fiveSecondsAgo },
          OR: [
            ...(data.visitorSessionId ? [{ visitorSessionId: data.visitorSessionId }] : []),
            { visitorHash: data.visitorHash },
          ],
        },
      });

      if (duplicate) {
        return {
          success: true,
          visit: {
            id: duplicate.id,
            timestamp: duplicate.timestamp.toISOString(),
            visitorHash: duplicate.visitorHash,
            maskedIp: duplicate.maskedIp,
            path: duplicate.path,
            referrer: duplicate.referrer || undefined,
            userAgent: duplicate.userAgent || undefined,
            visitorSessionId: duplicate.visitorSessionId || undefined,
          },
          debounced: true,
        };
      }

      const id = `vis_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date();
      const created = await prisma.pageVisit.create({
        data: {
          id,
          timestamp: now,
          visitorHash: data.visitorHash,
          maskedIp: data.maskedIp,
          path: data.path.trim(),
          referrer: data.referrer ? data.referrer.trim() : null,
          userAgent: data.userAgent ? data.userAgent.slice(0, 150) : null,
          visitorSessionId: data.visitorSessionId || null,
        },
      });

      const record: PageVisitRecord = {
        id: created.id,
        timestamp: created.timestamp.toISOString(),
        visitorHash: created.visitorHash,
        maskedIp: created.maskedIp,
        path: created.path,
        referrer: created.referrer || undefined,
        userAgent: created.userAgent || undefined,
        visitorSessionId: created.visitorSessionId || undefined,
      };

      // Also mirror to local queue/store for offline callers and test consistency
      persistNewVisitSync(record);

      return { success: true, visit: record };
    } catch (err) {
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_STORAGE_IN_PROD) {
        console.error('Failed to persist page visit to production database:', err);
        throw err;
      }
      // Fallback to local store in dev/offline
    }
  }

  // Fallback for local development and test environment
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
}> {
  if (prisma && process.env.DATABASE_URL) {
    try {
      const { start, end } = getReportingDayBounds(REPORTING_TIMEZONE);

      const [totalVisits, todayVisits, recentVisits] = await Promise.all([
        prisma.pageVisit.count(),
        prisma.pageVisit.findMany({
          where: {
            timestamp: {
              gte: start,
              lt: end,
            },
          },
          select: {
            visitorSessionId: true,
            visitorHash: true,
          },
        }),
        prisma.pageVisit.findMany({
          take: 500,
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      const todayKeys = new Set<string>();
      for (const v of todayVisits) {
        todayKeys.add(v.visitorSessionId || v.visitorHash);
      }

      // Compute distinct visitors across all time
      let uniqueVisitors = 0;
      try {
        const distinctRows = await prisma.pageVisit.findMany({
          select: {
            visitorSessionId: true,
            visitorHash: true,
          },
          distinct: ['visitorSessionId', 'visitorHash'],
        });
        const allKeys = new Set(distinctRows.map((r) => r.visitorSessionId || r.visitorHash));
        uniqueVisitors = allKeys.size;
      } catch {
        uniqueVisitors = todayKeys.size;
      }

      // Map visit counts for recent visits
      const visitsFormatted: (PageVisitRecord & { visitCount: number })[] = recentVisits.map((v) => ({
        id: v.id,
        timestamp: v.timestamp.toISOString(),
        visitorHash: v.visitorHash,
        maskedIp: v.maskedIp,
        path: v.path,
        referrer: v.referrer || undefined,
        userAgent: v.userAgent || undefined,
        visitorSessionId: v.visitorSessionId || undefined,
        visitCount: 1,
      }));

      return {
        totalVisits,
        uniqueVisitors,
        todayVisitors: todayKeys.size,
        visits: visitsFormatted,
      };
    } catch (dbErr) {
      if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_STORAGE_IN_PROD) {
        console.error('Production database query failed:', dbErr);
        throw new Error('Database connection failed. Unable to retrieve storage records.');
      }
      // Fall through to local calculation in dev/test
    }
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_LOCAL_STORAGE_IN_PROD) {
    throw new Error('Database connection failed. No persistent database connection in production.');
  }

  return getVisitorStats();
}

export function getRegisteredMembersCount(): number {
  const db = getDb();
  return Array.isArray(db.users) ? db.users.length : 0;
}


