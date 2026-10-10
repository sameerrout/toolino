'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const lastTrackedTime = useRef<number>(0);

  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return;

    // Do not track internal manager dashboard pages
    if (pathname.startsWith('/manager')) return;

    const now = Date.now();
    // Prevent double execution from React 19 Strict Mode and rapid duplicate triggers
    if (lastTrackedPath.current === pathname && now - lastTrackedTime.current < 4000) {
      return;
    }

    lastTrackedPath.current = pathname;
    lastTrackedTime.current = now;

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
