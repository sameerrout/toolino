import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { isTodayInReportingTimezone, REPORTING_TIMEZONE } from './visitor';

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

export interface EnrichedPageVisitRecord extends PageVisitRecord {
  visitCount: number;
}

export interface VisitorAnalyticsSummary {
  totalVisits: number;
  uniqueVisitors: number;
  todayVisitors: number;
  visits: EnrichedPageVisitRecord[];
}

const globalForVisits = globalThis as unknown as {
  __toolino_visits_cache__?: PageVisitRecord[];
  __toolino_visits_mtime__?: number;
  __toolino_write_queue__?: Promise<void>;
};

/**
 * Resolves the filesystem path for test isolation and local development.
 */
export function getVisitsFilePath(): string {
  if (process.env.VISITS_DATA_PATH) {
    return path.resolve(process.env.VISITS_DATA_PATH);
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join(os.tmpdir(), '.toolino_data');
    return path.join(tmpDir, 'visits.json');
  }
  return path.join(process.cwd(), '.data', 'visits.json');
}

/**
 * Ensures the target visits storage exists for local testing.
 */
function ensureVisitsStorage(): string {
  const filePath = getVisitsFilePath();
  const dirPath = path.dirname(filePath);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      let initialVisits: PageVisitRecord[] = [];
      try {
        const legacyDbPath = path.join(process.cwd(), '.data', 'db.json');
        if (fs.existsSync(legacyDbPath)) {
          const raw = fs.readFileSync(legacyDbPath, 'utf-8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.visits) && parsed.visits.length > 0) {
            initialVisits = parsed.visits;
          }
        }
      } catch {
        // Fall back to empty array
      }

      fs.writeFileSync(filePath, JSON.stringify(initialVisits, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to initialize visits storage directory/file:', err);
  }

  return filePath;
}

/**
 * Loads visits from disk (used for unit test suites and offline development).
 */
export function loadPersistedVisits(): PageVisitRecord[] {
  try {
    const filePath = ensureVisitsStorage();
    if (!fs.existsSync(filePath)) {
      return globalForVisits.__toolino_visits_cache__ || [];
    }

    const stat = fs.statSync(filePath);
    if (
      globalForVisits.__toolino_visits_cache__ &&
      globalForVisits.__toolino_visits_mtime__ === stat.mtimeMs
    ) {
      return globalForVisits.__toolino_visits_cache__;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    if (raw && raw.trim()) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalForVisits.__toolino_visits_cache__ = parsed;
        globalForVisits.__toolino_visits_mtime__ = stat.mtimeMs;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read persisted visits:', err);
  }

  return globalForVisits.__toolino_visits_cache__ || [];
}

/**
 * Writes visits to disk with atomic write and retries.
 */
async function writeVisitsWithRetry(visits: PageVisitRecord[]): Promise<void> {
  const filePath = ensureVisitsStorage();
  const serialized = JSON.stringify(visits, null, 2);
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      fs.writeFileSync(tempPath, serialized, 'utf-8');
      try {
        fs.renameSync(tempPath, filePath);
      } catch {
        fs.writeFileSync(filePath, serialized, 'utf-8');
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch {
            // Ignore
          }
        }
      }

      globalForVisits.__toolino_visits_cache__ = visits;
      try {
        const stat = fs.statSync(filePath);
        globalForVisits.__toolino_visits_mtime__ = stat.mtimeMs;
      } catch {
        // Ignore stat failure
      }
      return;
    } catch (err) {
      if (attempts >= maxAttempts) {
        console.error(`Failed to persist visits after ${maxAttempts} attempts:`, err);
        globalForVisits.__toolino_visits_cache__ = visits;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 20 * attempts));
    }
  }
}

/**
 * Persists a new visit to disk.
 */
export async function persistNewVisit(visit: PageVisitRecord): Promise<void> {
  const currentQueue = globalForVisits.__toolino_write_queue__ || Promise.resolve();

  const writeOperation = currentQueue
    .catch(() => {})
    .then(async () => {
      const existing = loadPersistedVisits();
      if (existing.some((v) => v.id === visit.id)) {
        return;
      }

      const updated = [visit, ...existing].slice(0, 10000);
      await writeVisitsWithRetry(updated);
    });

  globalForVisits.__toolino_write_queue__ = writeOperation;
  return writeOperation;
}

/**
 * Synchronous append fallback for synchronous callers.
 */
export function persistNewVisitSync(visit: PageVisitRecord): void {
  const existing = loadPersistedVisits();
  if (existing.some((v) => v.id === visit.id)) {
    return;
  }
  const updated = [visit, ...existing].slice(0, 10000);
  globalForVisits.__toolino_visits_cache__ = updated;

  try {
    const filePath = ensureVisitsStorage();
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    const stat = fs.statSync(filePath);
    globalForVisits.__toolino_visits_mtime__ = stat.mtimeMs;
  } catch (err) {
    console.error('Failed to sync write visit:', err);
  }
}

/**
 * Durable deduplication check:
 * Returns true if a visit from the same visitor key to the same path
 * was recorded within the debounce window.
 */
export function isRecentDuplicateVisit(
  visitorKey: string,
  normalizedPath: string,
  debounceMs = 5000,
  referenceTime = Date.now(),
  visitList?: PageVisitRecord[]
): boolean {
  const visits = visitList || loadPersistedVisits();
  const cutoff = referenceTime - debounceMs;

  return visits.some((v) => {
    const key = v.visitorSessionId || v.visitorHash;
    if (key !== visitorKey) return false;
    if (v.path.trim().toLowerCase() !== normalizedPath.trim().toLowerCase()) return false;
    const visitTime = new Date(v.timestamp).getTime();
    return visitTime > cutoff;
  });
}

/**
 * Computes authoritative analytics metrics from a list of visits:
 * 1. Total Visits: Count of all valid persisted page views
 * 2. Unique Visitors: Count of distinct stable visitor keys
 * 3. Today's Visitors: Count of distinct visitors who visited today in Asia/Kolkata timezone
 * 4. Visits list enriched with total visitCount per visitor
 */
export function calculateVisitorAnalytics(
  timeZone = REPORTING_TIMEZONE,
  referenceDate = new Date(),
  visitList?: PageVisitRecord[]
): VisitorAnalyticsSummary {
  const visits = visitList || loadPersistedVisits();

  // Map visit count per unique visitor key across all time
  const visitCountsByKey = new Map<string, number>();
  for (const v of visits) {
    const key = v.visitorSessionId || v.visitorHash;
    visitCountsByKey.set(key, (visitCountsByKey.get(key) || 0) + 1);
  }

  const totalVisits = visits.length;
  const uniqueVisitors = visitCountsByKey.size;

  // Today's visitors in the reporting timezone
  const todayVisitorKeys = new Set<string>();
  for (const v of visits) {
    if (isTodayInReportingTimezone(v.timestamp, timeZone, referenceDate)) {
      const key = v.visitorSessionId || v.visitorHash;
      todayVisitorKeys.add(key);
    }
  }
  const todayVisitors = todayVisitorKeys.size;

  const enrichedVisits: EnrichedPageVisitRecord[] = visits.map((v) => {
    const key = v.visitorSessionId || v.visitorHash;
    return {
      ...v,
      visitCount: visitCountsByKey.get(key) || 1,
    };
  });

  return {
    totalVisits,
    uniqueVisitors,
    todayVisitors,
    visits: enrichedVisits,
  };
}
