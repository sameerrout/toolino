/**
 * ToolForForever Google Drive Storage Store
 * 
 * Manages the authoritative application database stored exclusively
 * in Google Drive folder "ToolForForever_Data" under "database.json".
 */

import {
  getGoogleDriveConfig,
  readJsonFromDrive,
  writeJsonToDrive,
  createDriveBackup,
  DEFAULT_FOLDER_NAME,
  TARGET_GOOGLE_ACCOUNT,
} from './googleDriveClient';

export { DEFAULT_FOLDER_NAME, TARGET_GOOGLE_ACCOUNT };

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

export const INITIAL_DATABASE: DatabaseSchema = {
  users: [],
  toolUsage: {},
  events: [],
  contactMessages: [],
  visits: [],
};

const DATABASE_FILE_NAME = 'database.json';
const CACHE_TTL_MS = 5000; // 5-second in-memory read cache to handle request bursts

interface GlobalDriveStore {
  __drive_cached_db__?: DatabaseSchema;
  __drive_cached_at__?: number;
  __drive_write_queue__?: Promise<unknown>;
  __drive_last_backup_at__?: number;
}

const globalForStore = globalThis as unknown as GlobalDriveStore;

export class GoogleDriveNotConfiguredError extends Error {
  constructor(message = 'Google Drive API is not configured. Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN in Vercel.') {
    super(message);
    this.name = 'GoogleDriveNotConfiguredError';
  }
}

/**
 * Checks whether Google Drive credentials are fully present.
 */
export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveConfig() !== null;
}

/**
 * Sanitizes and fills any missing arrays/objects on a loaded database schema.
 */
export function sanitizeDatabase(raw: Partial<DatabaseSchema> | null | undefined): DatabaseSchema {
  if (!raw || typeof raw !== 'object') {
    return { ...INITIAL_DATABASE };
  }

  return {
    users: Array.isArray(raw.users) ? raw.users : [],
    toolUsage: raw.toolUsage && typeof raw.toolUsage === 'object' ? raw.toolUsage : {},
    events: Array.isArray(raw.events) ? raw.events : [],
    contactMessages: Array.isArray(raw.contactMessages) ? raw.contactMessages : [],
    visits: Array.isArray(raw.visits) ? raw.visits : [],
  };
}

/**
 * Loads the application database strictly from Google Drive.
 * Throws GoogleDriveNotConfiguredError if Drive credentials are missing.
 */
export async function loadDriveDatabase(bypassCache = false): Promise<DatabaseSchema> {
  if (!isGoogleDriveConfigured()) {
    throw new GoogleDriveNotConfiguredError();
  }

  const now = Date.now();
  if (
    !bypassCache &&
    globalForStore.__drive_cached_db__ &&
    globalForStore.__drive_cached_at__ &&
    now - globalForStore.__drive_cached_at__ < CACHE_TTL_MS
  ) {
    return globalForStore.__drive_cached_db__;
  }

  const result = await readJsonFromDrive<DatabaseSchema>(DATABASE_FILE_NAME);

  if (!result || !result.data) {
    // database.json does not yet exist in ToolForForever_Data. Create initial empty database.
    const initial = { ...INITIAL_DATABASE };
    await writeJsonToDrive(DATABASE_FILE_NAME, initial);
    globalForStore.__drive_cached_db__ = initial;
    globalForStore.__drive_cached_at__ = now;
    return initial;
  }

  const sanitized = sanitizeDatabase(result.data);
  globalForStore.__drive_cached_db__ = sanitized;
  globalForStore.__drive_cached_at__ = now;

  return sanitized;
}

/**
 * Persists the application database to Google Drive with sequential queue concurrency protection
 * and automated rolling backups.
 */
export async function saveDriveDatabase(
  data: DatabaseSchema,
  options: { forceBackup?: boolean } = {}
): Promise<void> {
  if (!isGoogleDriveConfigured()) {
    throw new GoogleDriveNotConfiguredError();
  }

  const sanitized = sanitizeDatabase(data);

  // Optimistically update in-memory cache
  globalForStore.__drive_cached_db__ = sanitized;
  globalForStore.__drive_cached_at__ = Date.now();

  // Chain through sequential write queue to prevent concurrent race conditions
  const currentQueue = globalForStore.__drive_write_queue__ || Promise.resolve();

  const writeOperation = currentQueue
    .catch(() => {})
    .then(async () => {
      // 1. Write updated database.json to ToolForForever_Data in Drive
      await writeJsonToDrive(DATABASE_FILE_NAME, sanitized);

      // 2. Automated rolling backup (once per hour or when requested)
      const now = Date.now();
      const lastBackup = globalForStore.__drive_last_backup_at__ || 0;
      const oneHour = 60 * 60 * 1000;

      if (options.forceBackup || now - lastBackup > oneHour) {
        try {
          await createDriveBackup(sanitized, 'database-backup');
          globalForStore.__drive_last_backup_at__ = now;
        } catch (backupErr) {
          console.warn('Google Drive automated backup failed (non-fatal):', backupErr);
        }
      }
    });

  globalForStore.__drive_write_queue__ = writeOperation;
  await writeOperation;
}

/**
 * Atomic mutation helper:
 * Safely fetches latest Drive database, runs mutator function, and saves back to Drive.
 */
export async function mutateDriveDatabase<R>(
  mutator: (db: DatabaseSchema) => Promise<R> | R,
  options: { forceBackup?: boolean } = {}
): Promise<R> {
  const currentQueue = globalForStore.__drive_write_queue__ || Promise.resolve();

  let result!: R;
  const operation = currentQueue
    .catch(() => {})
    .then(async () => {
      // Always bypass cache when beginning an atomic mutation
      const db = await loadDriveDatabase(true);
      result = await mutator(db);
      await saveDriveDatabase(db, options);
    });

  globalForStore.__drive_write_queue__ = operation;
  await operation;
  return result;
}

/**
 * Invalidate cache manually (used on new writes or test resets).
 */
export function invalidateDriveCache(): void {
  delete globalForStore.__drive_cached_db__;
  delete globalForStore.__drive_cached_at__;
}

/**
 * Returns Drive metadata for status reporting.
 */
export function getDriveMetadata() {
  return {
    targetAccount: TARGET_GOOGLE_ACCOUNT,
    folderName: DEFAULT_FOLDER_NAME,
    databaseFileName: DATABASE_FILE_NAME,
    isConfigured: isGoogleDriveConfigured(),
  };
}
