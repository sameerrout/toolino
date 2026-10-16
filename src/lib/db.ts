export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: 'user' | 'manager';
  createdAt: string;
  lastLoginAt?: string;
}

export interface ToolUsageRecord {
  id: string;
  slug: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
}

export interface DatabaseSchema {
  users: UserRecord[];
  logins: { id: string; email: string; role: string; timestamp: string }[];
  pageviews: { path: string; timestamp: string; visitorId: string }[];
  toolUsage: ToolUsageRecord[];
  messages: { id: string; name: string; email: string; message: string; createdAt: string }[];
}

const DB_STORAGE_KEY = 'toolino_client_db_v2';

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  logins: [],
  pageviews: [],
  toolUsage: [],
  messages: [],
};

function getStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (k: string) => ((globalThis as unknown as Record<string, string>)[`__mem_${k}`] ?? null),
    setItem: (k: string, v: string) => { (globalThis as unknown as Record<string, string>)[`__mem_${k}`] = v; },
    removeItem: (k: string) => { delete (globalThis as unknown as Record<string, string>)[`__mem_${k}`]; },
  };
}

// Safe, defensive read that never throws or returns undefined arrays
export function readDb(): DatabaseSchema {
  try {
    const storage = getStorage();
    const raw = storage.getItem(DB_STORAGE_KEY);
    if (!raw || raw.trim() === '' || raw === 'undefined') {
      return structuredClone(DEFAULT_DB);
    }
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed?.users) ? parsed.users : [],
      logins: Array.isArray(parsed?.logins) ? parsed.logins : [],
      pageviews: Array.isArray(parsed?.pageviews) ? parsed.pageviews : [],
      toolUsage: Array.isArray(parsed?.toolUsage) ? parsed.toolUsage : [],
      messages: Array.isArray(parsed?.messages) ? parsed.messages : [],
    };
  } catch (err) {
    console.warn('[Toolino DB] Corrupted state detected, resetting safely.', err);
    return structuredClone(DEFAULT_DB);
  }
}

// Ring-buffer cap prevents localStorage 5MB quota overflow over time
const MAX_LOG_ITEMS = 500;

export function writeDb(updater: (draft: DatabaseSchema) => DatabaseSchema | void): DatabaseSchema {
  const current = readDb();
  const updated = updater(current) || current;
  // Cap high-frequency arrays so localStorage never hits QuotaExceededError
  updated.logins = updated.logins.slice(-MAX_LOG_ITEMS);
  updated.pageviews = updated.pageviews.slice(-MAX_LOG_ITEMS);
  updated.toolUsage = updated.toolUsage.slice(-MAX_LOG_ITEMS);
  try {
    const storage = getStorage();
    storage.setItem(DB_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[Toolino DB] Storage quota reached, pruning oldest logs.', err);
    updated.pageviews = updated.pageviews.slice(-100);
    updated.toolUsage = updated.toolUsage.slice(-100);
    const storage = getStorage();
    storage.setItem(DB_STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function clearDb(): void {
  const storage = getStorage();
  storage.removeItem(DB_STORAGE_KEY);
}
