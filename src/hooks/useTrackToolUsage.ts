'use client';

import { useEffect, useRef } from 'react';

export function useTrackToolUsage(toolSlug: string) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!toolSlug || trackedRef.current) return;
    trackedRef.current = true;

    try {
      fetch('/api/analytics/track/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolSlug }),
      }).catch(() => {
        // Silent catch: tracking must never interrupt user experience
      });
    } catch {
      // Ignore errors
    }
  }, [toolSlug]);
}
