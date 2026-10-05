'use client';

import { useTrackToolUsage } from '@/hooks/useTrackToolUsage';

export function TrackToolUsage({ slug }: { slug: string }) {
  useTrackToolUsage(slug);
  return null;
}
