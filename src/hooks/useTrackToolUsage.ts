'use client';

import { useEffect, useRef } from 'react';
import { writeDb } from '@/lib/db';

export function useTrackToolUsage(toolSlug: string) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!toolSlug || trackedRef.current) return;
    trackedRef.current = true;

    try {
      writeDb((draft) => {
        draft.toolUsage.push({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usage_${Date.now()}`,
          slug: toolSlug,
          timestamp: new Date().toISOString(),
          durationMs: 0,
          success: true,
        });
      });
    } catch {
      // Silent catch: tracking must never interrupt user experience
    }
  }, [toolSlug]);
}
