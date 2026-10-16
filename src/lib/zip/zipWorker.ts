/// <reference lib="webworker" />
/**
 * ZIP Web Worker.
 *
 * Runs entirely off the main thread, so a 2 GB archive never freezes the UI.
 * Memory stays bounded because:
 *
 *  - input files are read in fixed 4 MiB slices, never fully buffered
 *  - fflate's streaming `Zip` writer emits output chunks immediately, and
 *    `ZipDeflate` / `ZipPassThrough` maintain the CRC32 incrementally
 *  - output chunks are posted to the main thread, which either writes them
 *    straight to the user's chosen file (File System Access API) or folds them
 *    into a Blob
 *
 * Protocol (see `src/lib/workerClient.ts`):
 *   in : { id, type: 'zip' | 'extract', payload }  and  { type: 'files', files }
 *   out: { id, type: 'open' | 'chunk' | 'close' | 'progress' | 'result' | 'error' }
 */

import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import {
  sanitizeZipEntryPath,
  MAX_EXTRACTED_TOTAL_BYTES,
  MAX_FILES_IN_ARCHIVE,
  type ExtractEntry,
  type ExtractWorkerOptions,
  type ZipEntryRequest,
  type ZipWorkerOptions,
} from './zipCore';

/**
 * Bytes of one source file read per iteration.
 * 4 MiB keeps peak memory flat while staying large enough to be fast.
 */
const READ_SLICE_BYTES = 4 * 1024 * 1024;

interface ZipRequestMessage {
  id: number;
  type: 'zip';
  payload: ZipWorkerOptions & { fileCount: number };
}

interface ExtractRequestMessage {
  id: number;
  type: 'extract';
  payload: ExtractWorkerOptions;
}

interface FilesMessage {
  type: 'files';
  files: File[];
}

type IncomingMessage = ZipRequestMessage | ExtractRequestMessage | FilesMessage;

function isFileListMessage(message: IncomingMessage): message is FilesMessage {
  return message.type === 'files';
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

/** Files are posted separately so their backing blobs stay shared, not copied. */
let pendingFiles: File[] = [];

ctx.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as IncomingMessage;

  if (isFileListMessage(data)) {
    pendingFiles = data.files;
    return;
  }

  void handle(data);
});

async function handle(message: ZipRequestMessage | ExtractRequestMessage): Promise<void> {
  const { id } = message;
  try {
    if (message.type === 'zip') {
      const result = await createZip(id, message.payload);
      ctx.postMessage({ id, type: 'result', result });
      return;
    }
    const result = await extractZip(id, message.payload);
    ctx.postMessage({ id, type: 'result', result });
  } catch (error) {
    ctx.postMessage({ id, type: 'error', error: serializeError(error) });
  } finally {
    // Never keep references to the user's File objects after a job.
    pendingFiles = [];
  }
}

function serializeError(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return error;
  }
  if (error instanceof Error) {
    return { name: 'AppError', code: 'WORKER_FAILED', message: error.message };
  }
  return { name: 'AppError', code: 'UNKNOWN', message: String(error) };
}

function reportProgress(id: number, ratio: number, status?: string): void {
  ctx.postMessage({
    id,
    type: 'progress',
    progress: Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0)),
    status,
  });
}

/** Total work bytes, used to turn per-entry progress into a single 0..1 ratio. */
function totalWork(entries: ZipEntryRequest[]): number {
  return entries.reduce((sum, entry) => sum + Math.max(entry.workSize, 1), 0);
}

interface ZipWorkerResult {
  archiveName: string;
  size: number;
  destination: 'memory';
  entryCount: number;
  inputSize: number;
  outputSize: number;
}

async function createZip(
  id: number,
  payload: ZipWorkerOptions & { fileCount: number }
): Promise<ZipWorkerResult> {
  const { entries, archiveName, level } = payload;
  const work = totalWork(entries);

  let compressedBytes = 0;
  let inputBytes = 0;
  let produced = 0;
  let streamClosed = false;

  const zip = new Zip((error, chunk, final) => {
    if (error) throw error;
    compressedBytes += chunk.length;
    // Transfer the buffer instead of copying it - matters on low-RAM devices.
    ctx.postMessage({ id, type: 'chunk', chunk }, [chunk.buffer]);
    if (final) {
      streamClosed = true;
      ctx.postMessage({ id, type: 'close' });
    }
  });

  ctx.postMessage({ id, type: 'open' });

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as ZipEntryRequest;
    const file = pendingFiles[index];
    if (!file) throw new Error(`Missing file data for "${entry.path}".`);

    const mtime = new Date(entry.lastModified || Date.now());

    if (entry.store) {
      // `ZipPassThrough` computes the CRC32 itself as chunks are pushed.
      const stream = new ZipPassThrough(entry.path);
      stream.mtime = mtime;
      zip.add(stream);

      const size = file.size;
      if (size === 0) {
        stream.push(new Uint8Array(0), true);
      } else {
        let offset = 0;
        while (offset < size) {
          const end = Math.min(offset + READ_SLICE_BYTES, size);
          const slice = new Uint8Array(await file.slice(offset, end).arrayBuffer());
          stream.push(slice, end >= size);
          offset = end;
          inputBytes += slice.length;
          reportProgress(
            id,
            (produced + entry.workSize * (offset / size)) / work,
            `${index + 1} of ${entries.length} — ${entry.path}`
          );
        }
      }
    } else {
      const stream = new ZipDeflate(entry.path, { level: level === 'best' ? 9 : 1 });
      stream.mtime = mtime;
      zip.add(stream);

      const size = file.size;
      if (size === 0) {
        stream.push(new Uint8Array(0), true);
      } else {
        let offset = 0;
        while (offset < size) {
          const end = Math.min(offset + READ_SLICE_BYTES, size);
          const slice = new Uint8Array(await file.slice(offset, end).arrayBuffer());
          stream.push(slice, end >= size);
          offset = end;
          inputBytes += slice.length;
          reportProgress(
            id,
            (produced + entry.workSize * (offset / size)) / work,
            `${index + 1} of ${entries.length} — ${entry.path}`
          );
        }
      }
    }

    produced += entry.workSize;
  }

  zip.end();
  if (!streamClosed) {
    // `end()` is synchronous for the streaming Zip, but keep the contract
    // explicit so the main thread always receives the closing message.
    ctx.postMessage({ id, type: 'close' });
  }
  reportProgress(id, 1, 'Finalising archive');

  return {
    archiveName,
    size: compressedBytes,
    destination: 'memory',
    entryCount: entries.length,
    inputSize: inputBytes,
    outputSize: compressedBytes,
  };
}

interface ExtractWorkerResult {
  entries: ExtractEntry[];
  totalSize: number;
}

/**
 * Reads an archive and lists its entries.
 *
 * Entries below `maxEntryBytes` keep their bytes so the UI can offer a preview
 * or a per-file download; larger ones are reported by name and size only, which
 * is what keeps a 2 GB archive openable on a phone.
 */
async function extractZip(id: number, payload: ExtractWorkerOptions): Promise<ExtractWorkerResult> {
  const { data, maxEntryBytes } = payload;
  const entries: ExtractEntry[] = [];
  let totalSize = 0;

  const unzip = new Unzip((file) => {
    const chunks: Uint8Array[] = [];
    let kept = 0;
    let size = 0;

    file.ondata = (error, chunk, final) => {
      if (error) throw error;

      size += chunk.length;
      if (kept + chunk.length <= maxEntryBytes) {
        chunks.push(chunk);
        kept += chunk.length;
      } else if (chunks.length > 0) {
        // Crossed the keep-threshold: release what we buffered.
        chunks.length = 0;
        kept = 0;
      }

      if (final) {
        if (entries.length >= MAX_FILES_IN_ARCHIVE) {
          throw new Error(`Archive exceeds maximum file limit of ${MAX_FILES_IN_ARCHIVE} entries.`);
        }
        if (totalSize + size > MAX_EXTRACTED_TOTAL_BYTES) {
          throw new Error('Archive exceeds maximum uncompressed size limit of 250 MB.');
        }

        const safePath = sanitizeZipEntryPath(file.name);
        const entry: ExtractEntry = {
          path: safePath,
          size,
          compressedSize: file.size ?? 0,
          isDirectory: file.name.endsWith('/'),
        };
        if (kept > 0) entry.data = concat(chunks, kept);
        entries.push(entry);
        totalSize += size;
        reportProgress(
          id,
          Math.min(0.95, entries.length / Math.max(entries.length + 4, 10)),
          `Reading ${safePath}`
        );
      }
    };

    file.start();
  });

  unzip.register(UnzipInflate);
  unzip.push(new Uint8Array(data), true);

  reportProgress(id, 1, 'Archive read');
  return { entries, totalSize };
}

function concat(chunks: Uint8Array[], totalLength: number): Uint8Array {
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
