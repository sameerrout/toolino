'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { writeDb } from '@/lib/db';

// Module-level tracking map to survive React 19 Strict Mode double-invocation & rapid navigation
const recentClientTrackMap = new Map<string, number>();

function isExcludedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('/manager') ||
    lower.startsWith('/login') ||
    lower.startsWith('/signup') ||
    lower.startsWith('/forgot-password') ||
    lower.startsWith('/reset-password')
  );
}

function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let vid = window.localStorage.getItem('toolino_vid');
    if (!vid) {
      vid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `vid_${Date.now()}`;
      window.localStorage.setItem('toolino_vid', vid);
    }
    return vid;
  } catch {
    return 'anonymous';
  }
}

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const lastTrackedTime = useRef<number>(0);

  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return;

    // Do not track internal management, auth, or admin routes
    if (isExcludedPath(pathname)) return;

    const now = Date.now();

    // Check component-level and module-level deduplication window (4000ms)
    const moduleLastTime = recentClientTrackMap.get(pathname) || 0;
    if (now - moduleLastTime < 4000) {
      return;
    }

    if (lastTrackedPath.current === pathname && now - lastTrackedTime.current < 4000) {
      return;
    }

    lastTrackedPath.current = pathname;
    lastTrackedTime.current = now;
    recentClientTrackMap.set(pathname, now);

    // Periodic cleanup of expired client map entries
    if (recentClientTrackMap.size > 100) {
      for (const [k, v] of recentClientTrackMap.entries()) {
        if (now - v > 60000) recentClientTrackMap.delete(k);
      }
    }

    try {
      const visitorId = getOrCreateVisitorId();
      writeDb((draft) => {
        draft.pageviews.push({
          path: pathname,
          timestamp: new Date().toISOString(),
          visitorId,
        });
      });
    } catch {
      // Ignore background analytics errors
    }
  }, [pathname]);

  return null;
}
