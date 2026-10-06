/**
 * ZIP tool - main-thread client.
 *
 * Responsibilities:
 *  1. turn the user's selection into a de-duplicated, sanitized entry list
 *  2. drive the worker, converting its byte chunks into either a stream to disk
 *     (File System Access API) or an in-memory Blob
 *  3. report progress and expose a cancel handle
 *  4. free every buffer and object URL it created
 */

import { JobReporter } from '@/lib/progress';
import { AppError } from '@/lib/errors';
import { allocateUniqueName, entryPathFor, sanitizeArchiveName } from '@/lib/filenames';
import { openDiskSink, supportsFileSystemAccess, type FileSystemWritableSink } from '@/lib/bytes';
import { detectDeviceProfile, type DeviceProfile } from '@/lib/device';
import {
  checkArchiveCeiling,
  checkArchiveMemory,
  estimateArchiveSize,
  toZipEntryRequests,
  type CompressionLevel,
  type ExtractEntry,
  type ZipDestination,
} from './zipCore';

export interface ZipSourceFile {
  /** The original File, kept only for its bytes. */
  file: File;
  /** Sanitized, unique archive path. */
  path: string;
  size: number;
  lastModified: number;
}

export interface CollectOptions {
  keepFolderStructure: boolean;
}

/**
 * Builds the archive entry list.
 *
 * De-duplicates names as `photo (1).jpg`, preserves folder structure for
 * `webkitdirectory` uploads, and sorts shallower paths first so archives look
 * tidy in every extractor.
 */
export function collectZipEntries(
  files: File[],
  options: CollectOptions = { keepFolderStructure: true }
): ZipSourceFile[] {
  const taken = new Set<string>();
  const entries: ZipSourceFile[] = files.map((file) => {
    const desired = entryPathFor(file, options.keepFolderStructure);
    const path = allocateUniqueName(desired, taken);
    return {
      file,
      path,
      size: file.size,
      lastModified: file.lastModified || Date.now(),
    };
  });

  entries.sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
  });

  return entries;
}

/** Total bytes across a selection. */
export function totalBytes(entries: ZipSourceFile[]): number {
  return entries.reduce((sum, entry) => sum + entry.size, 0);
}

/** Serialises disk writes so chunks are never interleaved out of order. */
function createWriteQueue(sink: FileSystemWritableSink): {
  push: (chunk: Uint8Array) => void;
  drain: () => Promise<void>;
} {
  let tail: Promise<void> = Promise.resolve();
  return {
    push(chunk) {
      tail = tail.then(() => sink.write(chunk));
    },
    drain() {
      return tail;
    },
  };
}

export interface CreateZipRequest {
  entries: ZipSourceFile[];
  archiveName: string;
  level: CompressionLevel;
  /** Ask to write straight to disk when the browser supports it. */
  preferDiskStreaming: boolean;
  reporter: JobReporter;
  profile?: DeviceProfile;
}

export interface CreateZipOutcome {
  archiveName: string;
  blob: Blob | null;
  size: number;
  destination: ZipDestination;
  entryCount: number;
  inputSize: number;
  /** Bytes saved versus the raw input (negative when the archive grew). */
  savedBytes: number;
}

/**
 * Creates the archive.
 *
 * Asks the browser to pick a destination file first (a user gesture is still
 * active at this point). When that is unavailable or declined, the chunks are
 * buffered into a Blob and offered as a normal download.
 */
export async function createZip(request: CreateZipRequest): Promise<CreateZipOutcome> {
  const { entries, archiveName, level, reporter, preferDiskStreaming } = request;
  const profile = request.profile ?? detectDeviceProfile();

  if (entries.length === 0) {
    throw new AppError('NO_FILES', 'Add at least one file to create a ZIP archive.');
  }

  const inputSize = totalBytes(entries);

  const ceiling = checkArchiveCeiling(inputSize);
  if (ceiling) throw new AppError('TOTAL_TOO_LARGE', ceiling);

  const canStream = supportsFileSystemAccess();
  const memoryCheck = checkArchiveMemory(inputSize, profile, canStream && preferDiskStreaming);
  if (memoryCheck.level === 'blocked') {
    throw new AppError('OUT_OF_MEMORY', memoryCheck.message, {
      hint: 'Use a browser with file-saving support (Chrome, Edge, Opera) to build archives this large.',
    });
  }

  const requests = toZipEntryRequests(entries, level);

  reporter.beginStage('Preparing archive', 0.05);
  reporter.report(0, `${entries.length} files`);

  let sink: FileSystemWritableSink | null = null;
  let destination: ZipDestination = 'memory';

  if (canStream && preferDiskStreaming) {
    reporter.beginStage('Choosing where to save', 0.05, 'writing');
    sink = await openDiskSink(archiveName, 'application/zip');
    if (sink) destination = 'disk';
  }

  const { runZipWorker } = await import('./zipRunner');
  reporter.beginStage(
    destination === 'disk' ? 'Writing archive to disk' : 'Building archive in memory',
    0.9
  );

  const writeQueue = sink ? createWriteQueue(sink) : null;
  const chunks: Uint8Array[] = [];
  let written = 0;

  try {
    const result = await runZipWorker({
      entries: requests,
      files: entries.map((entry) => entry.file),
      archiveName,
      level,
      signal: reporter.signal,
      onOpen: () => reporter.report(0, 'Writing archive header'),
      onChunk: (chunk) => {
        written += chunk.length;
        if (writeQueue) {
          writeQueue.push(chunk);
        } else {
          chunks.push(chunk);
        }
      },
      onClose: () => reporter.report(1, 'Archive finalised'),
      onProgress: (ratio, status) => reporter.report(ratio, status),
    });

    if (sink && writeQueue) {
      await writeQueue.drain();
      await sink.close();
      return {
        archiveName,
        blob: null,
        size: written,
        destination: 'disk',
        entryCount: result.entryCount,
        inputSize: result.inputSize,
        savedBytes: inputSize - written,
      };
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'application/zip' });
    return {
      archiveName,
      blob,
      size: blob.size,
      destination: 'memory',
      entryCount: result.entryCount,
      inputSize: result.inputSize,
      savedBytes: inputSize - blob.size,
    };
  } catch (error) {
    if (sink) {
      try {
        await sink.abort();
      } catch {
        // The sink may already be closed; nothing useful to do.
      }
    }
    throw AppError.from(error);
  } finally {
    // Drop references so the GC can reclaim megabytes immediately.
    chunks.length = 0;
  }
}

export interface ExtractZipRequest {
  file: File;
  reporter: JobReporter;
  /** Keep contents of entries up to this size. 0 = names only. */
  maxEntryBytes?: number;
}

export interface ExtractZipOutcome {
  entries: ExtractEntry[];
  totalSize: number;
}

/** Lists (and optionally buffers) the contents of a ZIP archive. */
export async function extractZip(request: ExtractZipRequest): Promise<ExtractZipOutcome> {
  const { file, reporter } = request;
  const maxEntryBytes = request.maxEntryBytes ?? 32 * 1024 * 1024;

  reporter.beginStage('Reading archive', 0.15);
  const data = await file.arrayBuffer();
  reporter.throwIfCancelled();

  const { runZipExtractWorker } = await import('./zipRunner');

  reporter.beginStage('Decoding entries', 0.85);
  const result = await runZipExtractWorker({
    data,
    maxEntryBytes,
    signal: reporter.signal,
    onProgress: (ratio, status) => reporter.report(ratio, status),
  });

  if (result.entries.length === 0) {
    throw new AppError('CORRUPT_FILE', 'No files were found inside this archive.');
  }

  return { entries: result.entries, totalSize: result.totalSize };
}

/** Estimated output size shown before the job runs. */
export function previewArchiveSize(entries: ZipSourceFile[], level: CompressionLevel): number {
  return estimateArchiveSize(toZipEntryRequests(entries, level), level);
}

/** Default archive name derived from the first file or the current date. */
export function defaultArchiveName(entries: ZipSourceFile[]): string {
  const single = entries.length === 1 ? entries[0] : undefined;
  if (single) {
    const stem = single.path.split('/').pop() ?? 'archive';
    return sanitizeArchiveName(stem);
  }

  if (entries.length > 1) {
    const firstDir = entries[0]?.path.split('/')[0];
    if (firstDir && entries.every((entry) => entry.path.startsWith(`${firstDir}/`))) {
      return sanitizeArchiveName(firstDir);
    }
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return `toolino-${stamp}.zip`;
}

/** Re-exported so tools do not need to import two modules. */
export { checkArchiveMemory, MAX_ARCHIVE_BYTES } from './zipCore';
export type { CompressionLevel, ExtractEntry, ZipDestination } from './zipCore';
