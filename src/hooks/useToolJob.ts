'use client';

/**
 * React bindings for the client-side job primitives.
 *
 * These hooks are the only way tools touch {@link JobReporter} and
 * {@link UrlRegistry}, which guarantees every tool gets the same
 * progress/cancel/cleanup behaviour without repeating any of it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JobReporter } from '@/lib/progress';
import { UrlRegistry } from '@/lib/bytes';
import { AppError } from '@/lib/errors';
import { detectDeviceProfile, type DeviceProfile } from '@/lib/device';
import { resolveLimits, type ToolLimitSpec } from '@/lib/limits';
import type { ToolSlug } from '@/lib/tools';

export interface ToolJobState {
  /** True while work is running: disables the form and shows the progress bar. */
  running: boolean;
  /** 0..1. */
  progress: number;
  /** Human status line, e.g. "Compressing 3 of 12". */
  status: string;
  /** Items completed / total when the job is a batch, else 0. */
  completed: number;
  total: number;
  /** Set when the last run failed; cleared on the next run. */
  error: AppError | null;
  /** True when the user cancelled the last run. */
  cancelled: boolean;
}

const IDLE: ToolJobState = {
  running: false,
  progress: 0,
  status: '',
  completed: 0,
  total: 0,
  error: null,
  cancelled: false,
};

export interface UseToolJobResult extends ToolJobState {
  /**
   * Runs `work`, wiring up progress, cancellation and error handling.
   * Returns the value produced by `work`, or `undefined` when it failed or was
   * cancelled - callers should therefore only apply their result inside the
   * callback.
   */
  run: <T>(work: (reporter: JobReporter) => Promise<T>) => Promise<T | undefined>;
  cancel: () => void;
  reset: () => void;
  resultUrl?: string;
  setResultUrl: (url: string | null) => void;
}

/**
 * Drives one tool run at a time.
 *
 * The reporter's `AbortSignal` is what makes Cancel work: loops call
 * `reporter.throwIfCancelled()`, and workers are torn down by `workerClient`
 * when the signal fires.
 */
export function useToolJob(): UseToolJobResult {
  const [state, setState] = useState<ToolJobState>(IDLE);
  const [resultUrl, setResultUrlState] = useState<string | undefined>(undefined);
  const reporterRef = useRef<JobReporter | null>(null);

  useEffect(() => {
    return () => {
      // Automatically free Blob memory when component unmounts or job resets
      if (resultUrl && resultUrl.startsWith('blob:')) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  useEffect(() => {
    // Any in-flight job is cancelled when the tool unmounts, so navigating away
    // can never leave a worker running in the background.
    return () => {
      reporterRef.current?.dispose();
      reporterRef.current = null;
    };
  }, []);

  const run = useCallback<ToolJobResultRunner>(async (work) => {
    reporterRef.current?.dispose();

    const reporter = new JobReporter({
      onUpdate: (next) => {
        setState({
          running: next.phase !== 'done' && next.phase !== 'error' && next.phase !== 'idle',
          progress: next.progress,
          status: next.status,
          completed: next.completed,
          total: next.total,
          error: null,
          cancelled: false,
        });
      },
    });
    reporterRef.current = reporter;

    setState({ ...IDLE, running: true, status: 'Starting' });

    try {
      const result = await work(reporter);
      reporter.succeed();
      setState({ ...IDLE, progress: 1, status: 'Done' });
      return result;
    } catch (error) {
      const appError = AppError.from(error);
      if (appError.code === 'CANCELLED') {
        setState({ ...IDLE, cancelled: true, status: 'Cancelled' });
      } else {
        setState({ ...IDLE, error: appError, status: appError.message });
      }
      return undefined;
    } finally {
      reporter.dispose();
      if (reporterRef.current === reporter) reporterRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    reporterRef.current?.cancel();
  }, []);

  const reset = useCallback(() => {
    reporterRef.current?.dispose();
    reporterRef.current = null;
    setResultUrlState(undefined);
    setState(IDLE);
  }, []);

  const setResultUrl = useCallback((url: string | null) => {
    setResultUrlState(url ?? undefined);
  }, []);

  return { ...state, run, cancel, reset, resultUrl, setResultUrl };
}

type ToolJobResultRunner = <T>(work: (reporter: JobReporter) => Promise<T>) => Promise<T | undefined>;

/**
 * Owns the tool's object URLs.
 *
 * Every URL created through `urls.create()` is revoked automatically on
 * unmount, and `urls.revokeAll()` can be called earlier (for example right
 * after a download) to release memory on a low-end device immediately.
 */
export function useObjectUrls(): UrlRegistry {
  const registry = useMemo(() => new UrlRegistry(), []);
  useEffect(() => () => registry.revokeAll(), [registry]);
  return registry;
}

/**
 * Reads the device profile once on mount.
 *
 * Renders with the SSR-safe mid-tier default on the server and first paint,
 * then upgrades after hydration, so the markup never mismatches.
 */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() => detectDeviceProfile());
  useEffect(() => {
    setProfile(detectDeviceProfile());
  }, []);
  return profile;
}

/** Resolved, device-scaled limits for one tool. */
export function useToolLimits(slug: ToolSlug): ToolLimitSpec {
  const profile = useDeviceProfile();
  return useMemo(() => resolveLimits(slug, profile), [slug, profile]);
}

/**
 * `true` once the component has hydrated.
 *
 * Used to gate anything that must not run during SSR (canvas, `File`, workers).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
