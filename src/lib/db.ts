import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { isManagerEmail } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

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

export interface DatabaseSchema {
  users: UserRecord[];
  toolUsage: Record<string, number>;
  events: ActivityEvent[];
}

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const INITIAL_DB: DatabaseSchema = {
  users: [],
  toolUsage: {},
  events: [],
};

// Global Prisma instance for connection reuse across hot-reloads
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
  }
}

/**
 * Returns database state, ensuring backwards compatibility and dev resilience.
 */
export function getDb(): DatabaseSchema {
  try {
    ensureDbFile();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed.users) parsed.users = [];
    if (!parsed.toolUsage) parsed.toolUsage = {};
    if (!parsed.events) parsed.events = [];
    return parsed;
  } catch (error) {
    console.error('Failed to read database store:', error);
    return INITIAL_DB;
  }
}

export function saveDb(data: DatabaseSchema): void {
  try {
    ensureDbFile();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tempFile, DB_FILE);
    } catch {
      // Fallback for Windows file locking / OneDrive sync
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {
          // ignore cleanup error
        }
      }
    }
  } catch (error) {
    console.error('Failed to save database store:', error);
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

  // Special secure manager handling
  if (isManagerEmail(normalizedEmail)) {
    const envManagerPassword = process.env.MANAGER_PASSWORD;
    const isEnvPasswordValid = envManagerPassword && password === envManagerPassword;
    const isDbPasswordValid = user?.passwordHash && verifyPassword(password, user.passwordHash);

    if (isEnvPasswordValid || isDbPasswordValid) {
      const activeUser: UserRecord = user || {
        id: `mgr_${Date.now()}`,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        authProvider: 'email',
        role: 'manager',
        createdAt: now,
        lastLoginAt: now,
      };

      if (!user) {
        db.users.push(activeUser);
      } else {
        activeUser.lastLoginAt = now;
      }

      db.events.unshift({
        timestamp: now,
        type: 'login',
        email: activeUser.email,
      });
      if (db.events.length > 200) db.events = db.events.slice(0, 200);
      saveDb(db);

      return { user: activeUser };
    }
  }

  // Normal user verification
  if (!user || !user.passwordHash) {
    return { error: 'Invalid email or password.' };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { error: 'Invalid email or password.' };
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
