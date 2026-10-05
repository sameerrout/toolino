/**
 * Typed request/response bridge for Web Workers.
 *
 * Every worker in Toolino speaks the same tiny protocol so that cancellation,
 * error serialization and progress reporting behave identically everywhere:
 *
 *   main -> worker : { id, type, payload }
 *   worker -> main : { id, type: 'progress', progress, status }
 *                    { id, type: 'result',   result }
 *                    { id, type: 'error',    error }
 *
 * The worker is always terminated by {@link WorkerTask.dispose}; that is the
 * only reliable way to reclaim its heap, which matters a lot on 2 GB devices.
 */

import { AppError } from './errors';

export interface WorkerRequest<TType extends string = string, TPayload = unknown> {
  id: number;
  type: TType;
  payload: TPayload;
}

export interface WorkerProgressMessage {
  id: number;
  type: 'progress';
  progress: number;
  status?: string;
}

export interface WorkerResultMessage<TResult = unknown> {
  id: number;
  type: 'result';
  result: TResult;
}

export interface WorkerErrorMessage {
  id: number;
  type: 'error';
  error: unknown;
}

export type WorkerResponse<TResult = unknown> =
  | WorkerProgressMessage
  | WorkerResultMessage<TResult>
  | WorkerErrorMessage;

export interface RunWorkerOptions<TPayload, _TResult = unknown> {
  type: string;
  payload: TPayload;
  /** Structured-cloneable values moved into the worker instead of copied. */
  transfer?: Transferable[];
  signal?: AbortSignal;
  onProgress?: (progress: number, status: string | undefined) => void;
  /** Hard timeout; a hung worker is killed rather than left to freeze the tab. */
  timeoutMs?: number;
  /** Stream chunks posted by the worker before it finishes (ZIP streaming). */
  onChunk?: (chunk: unknown) => void;
}

/** Owns one worker instance and guarantees it is terminated. */
export class WorkerTask {
  private readonly worker: Worker;
  private readonly url: string | null;
  private disposed = false;

  constructor(worker: Worker, url: string | null = null) {
    this.worker = worker;
    this.url = url;
  }

  /** Spawns a module worker from a bundler-resolved URL. */
  static fromModuleUrl(url: string, name?: string): WorkerTask {
    const worker = new Worker(url, { type: 'module', name });
    return new WorkerTask(worker, url);
  }

  /**
   * Spawns a worker from an inline function. Used as a fallback when a bundler
   * URL is unavailable; keeps the worker source in one file for reviewability.
   */
  static fromInlineSource(source: string, name?: string): WorkerTask {
    const blob = new Blob([source], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url, { name });
    return new WorkerTask(worker, url);
  }

  post(message: unknown, transfer?: Transferable[]): void {
    if (this.disposed) throw new AppError('WORKER_FAILED', 'The background worker was stopped.');
    this.worker.postMessage(message, transfer ?? []);
  }

  get raw(): Worker {
    return this.worker;
  }

  /** Terminates the worker and releases its object URL immediately. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    if (this.url) URL.revokeObjectURL(this.url);
  }
}

let requestCounter = 0;

/**
 * Runs one request against a worker and resolves with its result.
 *
 * Guarantees, in every exit path (success, worker error, abort, timeout):
 *  - the worker is terminated
 *  - the event listeners are removed
 *  - the promise settles exactly once
 */
export function runWorkerTask<TPayload, TResult>(
  task: WorkerTask,
  options: RunWorkerOptions<TPayload, TResult>
): Promise<TResult> {
  const id = ++requestCounter;

  return new Promise<TResult>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      task.raw.removeEventListener('message', onMessage);
      task.raw.removeEventListener('error', onError);
      task.raw.removeEventListener('messageerror', onMessageError);
      options.signal?.removeEventListener('abort', onAbort);
      task.dispose();
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onMessage = (event: MessageEvent<WorkerResponse<TResult>>) => {
      const data = event.data;
      if (!data || data.id !== id) return;

      switch (data.type) {
        case 'progress':
          options.onProgress?.(data.progress, data.status);
          return;
        case 'result':
          settle(() => resolve(data.result));
          return;
        case 'error':
          settle(() => reject(AppError.from(data.error)));
          return;
        default:
          // Unknown message type: forward as a stream chunk if a handler exists.
          options.onChunk?.(data);
      }
    };

    const onError = (event: ErrorEvent) => {
      settle(() =>
        reject(
          new AppError('WORKER_FAILED', event.message || 'The background worker stopped unexpectedly.')
        )
      );
    };

    const onMessageError = () => {
      settle(() =>
        reject(new AppError('WORKER_FAILED', 'The background worker sent data that could not be read.'))
      );
    };

    const onAbort = () => {
      settle(() => reject(new AppError('CANCELLED', 'Cancelled.')));
    };

    if (options.signal) {
      if (options.signal.aborted) {
        onAbort();
        return;
      }
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
    timer = setTimeout(() => {
      settle(() =>
        reject(
          new AppError(
            'WORKER_FAILED',
            'The job took too long and was stopped.',
            { hint: 'Try again with fewer or smaller files.' }
          )
        )
      );
    }, timeoutMs);

    task.raw.addEventListener('message', onMessage);
    task.raw.addEventListener('error', onError);
    task.raw.addEventListener('messageerror', onMessageError);

    try {
      task.post({ id, type: options.type, payload: options.payload }, options.transfer);
    } catch (error) {
      settle(() => reject(AppError.from(error)));
    }
  });
}

/**
 * Convenience wrapper: create a worker, run one task, terminate it.
 * This is the pattern used by every tool - one worker per job, never pooled.
 */
export async function runOneShotWorker<TPayload, TResult>(
  createTask: () => WorkerTask,
  options: RunWorkerOptions<TPayload, TResult>
): Promise<TResult> {
  const task = createTask();
  return runWorkerTask(task, options);
}
