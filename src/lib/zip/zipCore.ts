/**
 * ZIP engine (fflate).
 *
 * Shared by the "Create ZIP" and "Extract ZIP" tools. All heavy work happens in
 * `zipWorker.ts`; this module holds the pure, testable parts:
 *
 *  - the wire protocol types used by both threads
 *  - compression-level mapping and the already-compressed shortlist
 *  - size estimation
 *  - memory-pressure warnings scaled by `navigator.deviceMemory`
 */

import { isPrecompressed } from '@/lib/filenames';
import { memoryBudgetMb, type DeviceProfile } from '@/lib/device';
import { formatBytes } from '@/lib/format';

/** User-facing compression levels. */
export type CompressionLevel = 'store' | 'fast' | 'best';

export const COMPRESSION_LEVELS: { value: CompressionLevel; label: string; description: string }[] = [
  { value: 'store', label: 'Store (fastest)', description: 'No compression. Instant, and the safest choice for photos, videos and archives.' },
  { value: 'fast', label: 'Fast (balanced)', description: 'Low compression, quick. Good default for mixed folders.' },
  { value: 'best', label: 'Best (smallest)', description: 'Maximum deflate compression. Slower, best for text, code and CSV files.' },
];

/** fflate level numbers: 0 = store, 1 = fastest, 9 = best. */
export function levelToFflate(level: CompressionLevel): 0 | 1 | 9 {
  switch (level) {
    case 'store':
      return 0;
    case 'fast':
      return 1;
    case 'best':
      return 9;
    default:
      return 0;
  }
}

/** One source file described for the worker. */
export interface ZipEntryRequest {
  /** Path inside the archive, already sanitized and de-duplicated. */
  path: string;
  /** Size in bytes. */
  size: number;
  /** Last-modified time in epoch milliseconds. */
  lastModified: number;
  /**
   * When true the file is stored without deflate: it is already compressed, or
   * the user chose "Store", or it is small enough that compression overhead
   * outweighs the gain.
   */
  store: boolean;
  /**
   * Working set of this entry once written, used only for progress accounting:
   * the raw size when stored, a conservative estimate when deflated.
   */
  workSize: number;
}

export interface ZipWorkerOptions {
  entries: ZipEntryRequest[];
  /** Archive name, used for the fallback in-memory download. */
  archiveName: string;
  level: CompressionLevel;
}

/** Messages posted from the worker to the main thread. */
export type ZipWorkerEvent =
  | { type: 'open' }
  | { type: 'chunk'; chunk: Uint8Array }
  | { type: 'close' }
  | { type: 'progress'; progress: number; status?: string }
  | { type: 'result'; result: ZipResult }
  | { type: 'error'; error: unknown };

/**
 * Where the finished archive goes.
 * `disk` uses the File System Access API so memory stays flat even for
 * multi-gigabyte archives; `memory` assembles a Blob and offers a download.
 */
export type ZipDestination = 'disk' | 'memory';

export interface ZipResult {
  archiveName: string;
  /** Byte length produced. */
  size: number;
  /** Where the archive ended up. */
  destination: ZipDestination;
  entryCount: number;
  /** Bytes read from the input files. */
  inputSize: number;
  /** Compressed payload bytes written, excluding the central directory. */
  outputSize: number;
}

/** Message shapes for the Extract ZIP mode. */
export interface ExtractWorkerOptions {
  /** Archive bytes. Transferred, not copied. */
  data: ArrayBuffer;
  /** Keep file contents for entries up to this size (0 = names only). */
  maxEntryBytes: number;
}

export interface ExtractEntry {
  path: string;
  size: number;
  /** Compressed size as stored in the archive. */
  compressedSize: number;
  /** True when the entry is a directory. */
  isDirectory: boolean;
  /** Uncompressed bytes. Only present for entries under `maxEntryBytes`. */
  data?: Uint8Array;
}

export interface ExtractResult {
  entries: ExtractEntry[];
  totalSize: number;
}

/** Builds the worker-ready entry list from files plus their final paths. */
export function toZipEntryRequests(
  files: { path: string; size: number; lastModified: number }[],
  level: CompressionLevel
): ZipEntryRequest[] {
  return files.map((file) => {
    const store = shouldStoreFile(file.path, file.size, level);
    return {
      path: file.path,
      size: file.size,
      lastModified: file.lastModified,
      store,
      workSize: store ? file.size : Math.round(file.size * 0.75),
    };
  });
}

/**
 * Files smaller than this are stored rather than deflated: below a few hundred
 * bytes the deflate header costs more than the saving, and it keeps huge
 * batches of tiny files fast.
 */
export const STORE_BELOW_BYTES = 512;

/** Decides whether one entry should skip deflate. */
export function shouldStoreFile(
  fileName: string,
  size: number,
  level: CompressionLevel
): boolean {
  if (level === 'store') return true;
  if (size <= STORE_BELOW_BYTES) return true;
  return isPrecompressed(fileName);
}

/**
 * Rough compressed-size estimate so the UI can show "estimated size" before the
 * job runs. Deliberately conservative - it is better to over-promise size and
 * deliver smaller.
 */
export function estimateArchiveSize(entries: ZipEntryRequest[], level: CompressionLevel): number {
  if (level === 'store') return entries.reduce((sum, entry) => sum + entry.size + 90, 0);

  const ratio = level === 'best' ? 0.62 : 0.8;
  const stored = entries.filter((entry) => entry.store);
  const deflated = entries.filter((entry) => !entry.store);

  const storedBytes = stored.reduce((sum, entry) => sum + entry.size + 90, 0);
  const deflatedBytes = deflated.reduce((sum, entry) => sum + entry.size * ratio + 90, 0);
  return Math.round(storedBytes + deflatedBytes);
}

export interface ZipMemoryWarning {
  level: 'none' | 'warning' | 'blocked';
  message: string;
}

/**
 * Warns *before* the job starts when the archive is likely to exhaust the
 * device's memory. Uses `navigator.deviceMemory` (via {@link DeviceProfile}).
 *
 * `blocked` is reserved for cases where the archive cannot possibly be built in
 * memory AND disk streaming is unavailable - the UI then refuses to start
 * instead of crashing the tab.
 */
export function checkArchiveMemory(
  totalBytes: number,
  profile: DeviceProfile,
  diskStreamingAvailable: boolean
): ZipMemoryWarning {
  const budgetBytes = memoryBudgetMb(profile) * 1024 * 1024;

  if (diskStreamingAvailable && totalBytes > budgetBytes) {
    return {
      level: 'none',
      message: 'Large archive: it will be streamed straight to disk, so memory use stays low.',
    };
  }

  if (totalBytes > budgetBytes) {
    return {
      level: diskStreamingAvailable ? 'warning' : 'blocked',
      message: `This archive is about ${formatBytes(
        totalBytes
      )} but this device has roughly ${formatBytes(
        budgetBytes
      )} of usable memory for the job. Save it straight to disk, or split it into smaller archives.`,
    };
  }

  if (totalBytes > budgetBytes * 0.7) {
    return {
      level: 'warning',
      message: `This is a large archive for your device (about ${formatBytes(
        totalBytes
      )}). Close other tabs to free memory, and keep the tab in the foreground.`,
    };
  }

  return { level: 'none', message: '' };
}

export const MAX_EXTRACTED_TOTAL_BYTES = 250 * 1024 * 1024; // 250 MB max uncompressed total
export const MAX_FILES_IN_ARCHIVE = 500;

export function sanitizeZipEntryPath(rawPath: string): string {
  // Strip leading slashes and parent directory traversal (../)
  return rawPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/');
}

/**
 * fflate tracks offsets in 32-bit numbers, so a single archive must stay below
 * the 4 GiB ZIP32 ceiling. We stop well before that and tell the user to split.
 */
export const MAX_ARCHIVE_BYTES = 3.5 * 1024 * 1024 * 1024;

export function checkArchiveCeiling(totalBytes: number): string | null {
  if (totalBytes <= MAX_ARCHIVE_BYTES) return null;
  return `A single ZIP cannot exceed ${formatBytes(
    MAX_ARCHIVE_BYTES
  )}. Split your files into two or more archives.`;
}

/** Formats a byte-per-second rate for the progress line. */
export function formatThroughput(bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '';
  return `${formatBytes(bytesPerSecond)}/s`;
}

/** Estimates the remaining time of the job, for the progress line. */
export function formatEta(remainingBytes: number, bytesPerSecond: number): string {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return '';
  const seconds = remainingBytes / bytesPerSecond;
  if (seconds < 1) return 'almost done';
  if (seconds < 60) return `about ${Math.max(1, Math.round(seconds))} s left`;
  const minutes = Math.round(seconds / 60);
  return `about ${minutes} min left`;
}
