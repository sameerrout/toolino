'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Module-level tracking map to survive React 19 Strict Mode double-invocation & rapid navigation
const recentClientTrackMap = new Map<string, number>();

function isExcludedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.startsWith('/manager') ||
    lower.startsWith('/admin') ||
    lower.startsWith('/api/') ||
    lower.startsWith('/signin') ||
    lower.startsWith('/signup') ||
    lower.startsWith('/forgot-password') ||
    lower.startsWith('/reset-password')
  );
}

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const lastTrackedTime = useRef<number>(0);

  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return;

    // Do not track internal management, admin, auth, or API routes
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

    const referrer = document.referrer || undefined;

    try {
      fetch('/api/analytics/visit/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathname,
          referrer,
        }),
        keepalive: true,
      }).catch(() => {
        // Silently catch network failures so visitor experience is never impacted
      });
    } catch {
      // Ignore background analytics errors
    }
  }, [pathname]);

  return null;
}
