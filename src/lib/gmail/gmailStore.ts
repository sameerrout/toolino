/**
 * ToolForForever - Gmail API Storage Store
 * 
 * Manages the authoritative application database stored in Gmail account
 * sameerrout2006@gmail.com using dedicated labels:
 *   - ToolForForever/Metadata (Authoritative database.json snapshot)
 *   - ToolForForever/Users (Individual user records)
 *   - ToolForForever/Visits (Individual visit records)
 *   - ToolForForever/ToolUsage (Tool usage counters)
 *   - ToolForForever/Activity (Audit log events)
 *   - ToolForForever/Contact (Contact form submissions)
 *   - ToolForForever/Backups (Automated hourly rolling backups)
 */

import {
  getGmailStorageConfig,
  insertGmailRecordMessage,
  searchGmailMessages,
  getGmailRecordMessage,
  trashGmailMessage,
  GMAIL_STORAGE_LABELS,
  TARGET_GMAIL_ACCOUNT,
} from './gmailClient';

export { TARGET_GMAIL_ACCOUNT };

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

// Warm in-memory cache configuration
const CACHE_TTL_MS = 60000; // 60s cache in warm lambdas
const DATABASE_METADATA_RECORD_ID = 'authoritative_database_snapshot';

interface GlobalGmailStore {
  __gmail_cached_db__?: DatabaseSchema;
  __gmail_cached_at__?: number;
  __gmail_write_queue__?: Promise<unknown>;
  __gmail_last_backup_at__?: number;
  __gmail_snapshot_message_id__?: string;
}

const globalForStore = globalThis as unknown as GlobalGmailStore;

export class GmailStorageNotConfiguredError extends Error {
  constructor(
    message = 'Gmail Storage API is not configured. Set GMAIL_STORAGE_CLIENT_ID, GMAIL_STORAGE_CLIENT_SECRET, and GMAIL_STORAGE_REFRESH_TOKEN in Vercel.'
  ) {
    super(message);
    this.name = 'GmailStorageNotConfiguredError';
  }
}

/**
 * Checks whether Gmail storage credentials are configured.
 */
export function isGmailStorageConfigured(): boolean {
  return getGmailStorageConfig() !== null;
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
 * Loads the application database from Gmail storage.
 * 1. Checks warm in-memory cache.
 * 2. If not cached, searches Gmail for the authoritative database snapshot message.
 * 3. Falls back to initial empty structure if no snapshot exists yet.
 */
export async function loadGmailDatabase(bypassCache = false): Promise<DatabaseSchema> {
  if (!isGmailStorageConfigured()) {
    throw new GmailStorageNotConfiguredError();
  }

  const now = Date.now();
  if (
    !bypassCache &&
    globalForStore.__gmail_cached_db__ &&
    globalForStore.__gmail_cached_at__ &&
    now - globalForStore.__gmail_cached_at__ < CACHE_TTL_MS
  ) {
    return globalForStore.__gmail_cached_db__;
  }

  // Search for the latest authoritative snapshot in ToolForForever/Metadata
  const query = `label:${GMAIL_STORAGE_LABELS.METADATA} "[ToolForForever:METADATA] ${DATABASE_METADATA_RECORD_ID}"`;
  const messages = await searchGmailMessages({ query, maxResults: 1 });

  if (messages.length === 0) {
    // Initial setup: save initial database
    const initial = { ...INITIAL_DATABASE };
    const saved = await insertGmailRecordMessage<DatabaseSchema>({
      labelName: GMAIL_STORAGE_LABELS.METADATA,
      recordType: 'metadata',
      recordId: DATABASE_METADATA_RECORD_ID,
      payload: initial,
    });
    globalForStore.__gmail_snapshot_message_id__ = saved.messageId;
    globalForStore.__gmail_cached_db__ = initial;
    globalForStore.__gmail_cached_at__ = now;
    return initial;
  }

  const messageId = messages[0].id;
  globalForStore.__gmail_snapshot_message_id__ = messageId;

  const record = await getGmailRecordMessage<DatabaseSchema>(messageId);
  if (!record || !record.payload) {
    const fallback = { ...INITIAL_DATABASE };
    globalForStore.__gmail_cached_db__ = fallback;
    globalForStore.__gmail_cached_at__ = now;
    return fallback;
  }

  const sanitized = sanitizeDatabase(record.payload);
  globalForStore.__gmail_cached_db__ = sanitized;
  globalForStore.__gmail_cached_at__ = now;
  return sanitized;
}

/**
 * Persists the application database to Gmail with sequential queue concurrency protection
 * and automated rolling backups.
 */
export async function saveGmailDatabase(
  data: DatabaseSchema,
  options: { forceBackup?: boolean } = {}
): Promise<void> {
  if (!isGmailStorageConfigured()) {
    throw new GmailStorageNotConfiguredError();
  }

  const sanitized = sanitizeDatabase(data);

  // Optimistically update in-memory cache
  globalForStore.__gmail_cached_db__ = sanitized;
  globalForStore.__gmail_cached_at__ = Date.now();

  // Chain through sequential write queue to prevent concurrent race conditions
  const currentQueue = globalForStore.__gmail_write_queue__ || Promise.resolve();

  const writeOperation = currentQueue
    .catch(() => {})
    .then(async () => {
      // 1. Insert new snapshot record into ToolForForever/Metadata
      const prevMessageId = globalForStore.__gmail_snapshot_message_id__;

      const saved = await insertGmailRecordMessage<DatabaseSchema>({
        labelName: GMAIL_STORAGE_LABELS.METADATA,
        recordType: 'metadata',
        recordId: DATABASE_METADATA_RECORD_ID,
        payload: sanitized,
      });

      globalForStore.__gmail_snapshot_message_id__ = saved.messageId;

      // Clean up previous snapshot message asynchronously (keep newest)
      if (prevMessageId && prevMessageId !== saved.messageId) {
        trashGmailMessage(prevMessageId).catch(() => {});
      }

      // 2. Automated rolling backup (once per hour or when requested)
      const now = Date.now();
      const lastBackup = globalForStore.__gmail_last_backup_at__ || 0;
      const oneHour = 60 * 60 * 1000;

      if (options.forceBackup || now - lastBackup > oneHour) {
        try {
          await createGmailBackup(sanitized, 'database_backup');
          globalForStore.__gmail_last_backup_at__ = now;
        } catch (backupErr) {
          console.warn('Gmail automated backup non-fatal warning:', backupErr);
        }
      }
    });

  globalForStore.__gmail_write_queue__ = writeOperation;
  await writeOperation;
}

/**
 * Atomic mutation helper:
 * Safely fetches latest Gmail database, runs mutator function, and saves back to Gmail.
 */
export async function mutateGmailDatabase<R>(
  mutator: (db: DatabaseSchema) => Promise<R> | R
): Promise<R> {
  const db = await loadGmailDatabase(false);
  const result = await mutator(db);
  await saveGmailDatabase(db);
  return result;
}

/**
 * Creates a rolling timestamped backup in ToolForForever/Backups label.
 */
export async function createGmailBackup(
  content: unknown,
  prefix = 'backup'
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupId = `${prefix}_${timestamp}`;

  const result = await insertGmailRecordMessage({
    labelName: GMAIL_STORAGE_LABELS.BACKUPS,
    recordType: 'backup',
    recordId: backupId,
    payload: content,
  });

  return result.messageId;
}

/**
 * Finds a user by normalized email address in Gmail storage.
 */
export async function findUserByEmailInGmail(email: string): Promise<UserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const db = await loadGmailDatabase();
  return db.users.find((u) => u.email.trim().toLowerCase() === normalized) || null;
}

/**
 * Saves or updates a user record, updating both the database snapshot and
 * recording an individual structured record under ToolForForever/Users.
 */
export async function saveUserRecordToGmail(user: UserRecord): Promise<void> {
  await mutateGmailDatabase(async (db) => {
    const normalized = user.email.trim().toLowerCase();
    const idx = db.users.findIndex((u) => u.email.trim().toLowerCase() === normalized);
    if (idx >= 0) {
      db.users[idx] = user;
    } else {
      db.users.push(user);
    }
  });

  // Log individual record to ToolForForever/Users
  try {
    await insertGmailRecordMessage({
      labelName: GMAIL_STORAGE_LABELS.USERS,
      recordType: 'user',
      recordId: user.id,
      payload: user,
    });
  } catch (err) {
    console.warn(`[GmailStorage] Individual user record insert warning (${user.id}):`, err);
  }
}

/**
 * Saves a contact message to Gmail storage under ToolForForever/Contact.
 */
export async function saveContactMessageToGmail(message: ContactMessage): Promise<void> {
  await mutateGmailDatabase(async (db) => {
    db.contactMessages.unshift(message);
  });

  try {
    await insertGmailRecordMessage({
      labelName: GMAIL_STORAGE_LABELS.CONTACT,
      recordType: 'contact',
      recordId: message.id,
      payload: message,
    });
  } catch (err) {
    console.warn(`[GmailStorage] Individual contact message insert warning (${message.id}):`, err);
  }
}

/**
 * Exports the entire Gmail database for backups and migrations.
 */
export async function exportGmailDatabase(): Promise<DatabaseSchema> {
  return await loadGmailDatabase(true);
}

/**
 * Imports records into Gmail storage, merging with existing records.
 */
export async function importDatabaseToGmail(data: DatabaseSchema): Promise<{
  importedUsers: number;
  importedVisits: number;
  importedEvents: number;
  importedContacts: number;
  importedToolUsage: number;
}> {
  const sanitized = sanitizeDatabase(data);

  await mutateGmailDatabase((db) => {
    // Merge users without duplicate emails
    const existingEmails = new Set(db.users.map((u) => u.email.toLowerCase()));
    for (const u of sanitized.users) {
      if (!existingEmails.has(u.email.toLowerCase())) {
        db.users.push(u);
        existingEmails.add(u.email.toLowerCase());
      }
    }

    // Merge tool usage counters
    for (const [tool, count] of Object.entries(sanitized.toolUsage)) {
      db.toolUsage[tool] = (db.toolUsage[tool] || 0) + count;
    }

    // Merge visits without duplicate IDs
    const existingVisitIds = new Set(db.visits.map((v) => v.id));
    for (const v of sanitized.visits) {
      if (!existingVisitIds.has(v.id)) {
        db.visits.push(v);
        existingVisitIds.add(v.id);
      }
    }

    // Merge contact messages without duplicate IDs
    const existingMsgIds = new Set(db.contactMessages.map((m) => m.id));
    for (const m of sanitized.contactMessages) {
      if (!existingMsgIds.has(m.id)) {
        db.contactMessages.push(m);
        existingMsgIds.add(m.id);
      }
    }

    // Merge activity events
    db.events = [...sanitized.events, ...db.events].slice(0, 1000);
  });

  return {
    importedUsers: sanitized.users.length,
    importedVisits: sanitized.visits.length,
    importedEvents: sanitized.events.length,
    importedContacts: sanitized.contactMessages.length,
    importedToolUsage: Object.keys(sanitized.toolUsage).length,
  };
}
