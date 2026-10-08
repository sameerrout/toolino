/**
 * ZIP tool - worker bootstrap.
 *
 * Isolated from `zipClient.ts` so that the worker constructor (and therefore
 * fflate) is only ever pulled in through a dynamic `import()`. Opening any other
 * page in the site never downloads this code.
 *
 * The worker is created with `new Worker(new URL('./zipWorker.ts', import.meta.url))`,
 * which webpack statically detects and bundles into its own chunk containing
 * fflate. That keeps the worker strictly first-party: no CDN, nothing fetched at
 * runtime, and it inherits the same long-term cache headers as the rest of
 * `/_next/static`.
 */

import { runWorkerTask, WorkerTask } from '@/lib/workerClient';
import type { ExtractEntry, ZipEntryRequest } from './zipCore';

interface ZipWorkerResult {
  archiveName: string;
  size: number;
  destination: 'disk' | 'memory';
  entryCount: number;
  inputSize: number;
  outputSize: number;
}

interface ZipWorkerCallbacks {
  entries: ZipEntryRequest[];
  files: File[];
  archiveName: string;
  level: 'store' | 'fast' | 'best';
  signal?: AbortSignal;
  onOpen?: () => void;
  onChunk: (chunk: Uint8Array) => void;
  onClose?: () => void;
  onProgress?: (ratio: number, status?: string) => void;
}

type ZipStreamMessage =
  | { type: 'open' }
  | { type: 'chunk'; chunk: Uint8Array }
  | { type: 'close' }
  | { type: 'progress'; progress: number; status?: string };

/**
 * Creates the ZIP worker.
 *
 * `new URL(..., import.meta.url)` must appear literally here: the bundler looks
 * for that exact shape at build time to emit the worker chunk.
 */
function createZipWorker(): WorkerTask {
  return new WorkerTask(
    new Worker(new URL('./zipWorker.ts', import.meta.url), {
      type: 'module',
      name: 'toolforforever-zip',
    })
  );
}

/**
 * Runs the archive job.
 *
 * Two-message handshake: the `File` list is posted once up front (structured
 * clone shares the underlying data instead of copying it), then the metadata
 * request starts the job.
 */
export async function runZipWorker(callbacks: ZipWorkerCallbacks): Promise<ZipWorkerResult> {
  const task = createZipWorker();

  // Posted before the request so the worker has the blobs when it starts.
  task.post({ type: 'files', files: callbacks.files });

  return runWorkerTask<
    {
      entries: ZipEntryRequest[];
      archiveName: string;
      level: string;
      fileCount: number;
    },
    ZipWorkerResult
  >(task, {
    type: 'zip',
    payload: {
      entries: callbacks.entries,
      archiveName: callbacks.archiveName,
      level: callbacks.level,
      fileCount: callbacks.files.length,
    },
    signal: callbacks.signal,
    onProgress: callbacks.onProgress,
    onChunk: (raw) => {
      const message = raw as ZipStreamMessage;
      switch (message.type) {
        case 'open':
          callbacks.onOpen?.();
          return;
        case 'chunk':
          if (message.chunk) callbacks.onChunk(message.chunk);
          return;
        case 'close':
          callbacks.onClose?.();
          return;
        default:
          return;
      }
    },
  });
}

export interface ZipExtractCallbacks {
  data: ArrayBuffer;
  maxEntryBytes: number;
  signal?: AbortSignal;
  onProgress?: (ratio: number, status?: string) => void;
}

/** Runs the Extract ZIP job in its own worker. */
export async function runZipExtractWorker(
  callbacks: ZipExtractCallbacks
): Promise<{ entries: ExtractEntry[]; totalSize: number }> {
  const task = createZipWorker();

  return runWorkerTask<
    { data: ArrayBuffer; maxEntryBytes: number },
    { entries: ExtractEntry[]; totalSize: number }
  >(task, {
    type: 'extract',
    payload: { data: callbacks.data, maxEntryBytes: callbacks.maxEntryBytes },
    transfer: [callbacks.data],
    signal: callbacks.signal,
    onProgress: callbacks.onProgress,
  });
}
