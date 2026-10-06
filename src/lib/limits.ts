/**
 * Per-tool limits.
 *
 * These are the *desktop / high-end* ceilings. Every numeric value is scaled
 * down at runtime by `navigator.deviceMemory` + `hardwareConcurrency` through
 * `resolveLimits()`, so a 2 GB Android phone automatically gets smaller
 * batches, smaller canvases and fewer PDF pages per chunk instead of an
 * out-of-memory crash.
 *
 * Nothing here may ever cause an upload: all limits are about local memory.
 */

import { detectDeviceProfile, type DeviceProfile, type DeviceTier } from './device';
import type { ToolSlug } from './tools';

export interface ToolLimitSpec {
  /** Hard cap on how many files a single job may contain. */
  maxFiles: number;
  /** Hard cap on a single input file, in MB. */
  maxFileMb: number;
  /** Hard cap on the combined input size of all files in one job, in MB. */
  maxTotalMb: number;
  /** Hard cap on the produced output, in MB. */
  maxOutputMb: number;
  /** Longest edge, in CSS pixels, any canvas may be allocated at. */
  maxCanvasEdge: number;
  /** How many items are processed before the UI yields back to the browser. */
  chunkSize: number;
  /** Default number of parallel workers/decoders. */
  concurrency: number;
  /** Tailwind text + tone for the "Limits" note shown under each tool. */
  note: string;
}

/** Values are for a comfortable desktop; `resolveLimits` scales them down. */
export const TOOL_LIMITS: Record<ToolSlug, ToolLimitSpec> = {
  'create-zip': {
    maxFiles: 2000,
    maxFileMb: 2048,
    maxTotalMb: 4096,
    maxOutputMb: 4096,
    maxCanvasEdge: 0,
    chunkSize: 24,
    concurrency: 1,
    note: 'Any file type supported. Files above 2 GB each are skipped with a warning.',
  },
  'extract-zip': {
    maxFiles: 1,
    maxFileMb: 2048,
    maxTotalMb: 2048,
    maxOutputMb: 4096,
    maxCanvasEdge: 0,
    chunkSize: 16,
    concurrency: 1,
    note: 'Reads the archive in memory. Password-protected ZIPs are not supported.',
  },
  'merge-pdf': {
    maxFiles: 60,
    maxFileMb: 250,
    maxTotalMb: 500,
    maxOutputMb: 900,
    maxCanvasEdge: 0,
    chunkSize: 5,
    concurrency: 2,
    note: 'Up to 60 documents and 500 MB combined.',
  },
  'split-pdf': {
    maxFiles: 1,
    maxFileMb: 300,
    maxTotalMb: 300,
    maxOutputMb: 900,
    maxCanvasEdge: 0,
    chunkSize: 25,
    concurrency: 2,
    note: 'Documents up to 300 MB. Large ranges are written in chunks.',
  },
  'compress-pdf': {
    maxFiles: 1,
    maxFileMb: 250,
    maxTotalMb: 250,
    maxOutputMb: 250,
    maxCanvasEdge: 2400,
    chunkSize: 3,
    concurrency: 1,
    note: 'Image-heavy PDFs shrink the most. Text-only PDFs barely change.',
  },
  'rotate-pdf': {
    maxFiles: 1,
    maxFileMb: 400,
    maxTotalMb: 400,
    maxOutputMb: 400,
    maxCanvasEdge: 0,
    chunkSize: 40,
    concurrency: 2,
    note: 'Lossless: rotation never re-encodes the pages.',
  },
  'watermark-pdf': {
    maxFiles: 1,
    maxFileMb: 300,
    maxTotalMb: 300,
    maxOutputMb: 300,
    maxCanvasEdge: 0,
    chunkSize: 30,
    concurrency: 1,
    note: 'Text watermarks only - no font files are downloaded.',
  },
  'pdf-page-numbers': {
    maxFiles: 1,
    maxFileMb: 300,
    maxTotalMb: 300,
    maxOutputMb: 300,
    maxCanvasEdge: 0,
    chunkSize: 40,
    concurrency: 1,
    note: 'Works on documents with any number of pages.',
  },
  'organize-pdf': {
    maxFiles: 1,
    maxFileMb: 300,
    maxTotalMb: 300,
    maxOutputMb: 300,
    maxCanvasEdge: 1400,
    chunkSize: 12,
    concurrency: 2,
    note: 'Thumbnails are rendered lazily, a few pages at a time.',
  },
  'protect-pdf': {
    maxFiles: 1,
    maxFileMb: 250,
    maxTotalMb: 250,
    maxOutputMb: 300,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'RC4 128-bit / AES encryption, applied locally with PDF-LIB.',
  },
  'image-to-pdf': {
    maxFiles: 100,
    maxFileMb: 40,
    maxTotalMb: 300,
    maxOutputMb: 400,
    maxCanvasEdge: 4096,
    chunkSize: 8,
    concurrency: 2,
    note: 'Up to 100 images per document.',
  },
  'pdf-to-image': {
    maxFiles: 1,
    maxFileMb: 200,
    maxTotalMb: 200,
    maxOutputMb: 800,
    maxCanvasEdge: 3000,
    chunkSize: 4,
    concurrency: 1,
    note: 'Rendered one page at a time so memory stays flat.',
  },
  'compress-image': {
    maxFiles: 60,
    maxFileMb: 60,
    maxTotalMb: 400,
    maxOutputMb: 400,
    maxCanvasEdge: 6000,
    chunkSize: 6,
    concurrency: 2,
    note: 'Batch up to 60 images. Very large photos are downscaled first.',
  },
  'resize-image': {
    maxFiles: 60,
    maxFileMb: 60,
    maxTotalMb: 400,
    maxOutputMb: 400,
    maxCanvasEdge: 8000,
    chunkSize: 6,
    concurrency: 2,
    note: 'Output is limited to 8000 px on the longest edge.',
  },
  'convert-image': {
    maxFiles: 60,
    maxFileMb: 60,
    maxTotalMb: 400,
    maxOutputMb: 400,
    maxCanvasEdge: 6000,
    chunkSize: 6,
    concurrency: 2,
    note: 'HEIC is not decodable in most browsers; convert it to JPG first.',
  },
  'remove-background': {
    maxFiles: 10,
    maxFileMb: 25,
    maxTotalMb: 120,
    maxOutputMb: 200,
    maxCanvasEdge: 2048,
    chunkSize: 1,
    concurrency: 1,
    note: 'One image at a time. The AI model is ~40 MB and downloads once.',
  },
  'image-to-text': {
    maxFiles: 10,
    maxFileMb: 20,
    maxTotalMb: 80,
    maxOutputMb: 20,
    maxCanvasEdge: 2600,
    chunkSize: 1,
    concurrency: 1,
    note: 'Language data downloads once per language, then is cached.',
  },
  'passport-photo': {
    maxFiles: 20,
    maxFileMb: 30,
    maxTotalMb: 200,
    maxOutputMb: 300,
    maxCanvasEdge: 4000,
    chunkSize: 4,
    concurrency: 2,
    note: 'Prints a 4x6 inch sheet at 300 DPI.',
  },
  'word-counter': {
    maxFiles: 10,
    maxFileMb: 20,
    maxTotalMb: 60,
    maxOutputMb: 10,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Streams text so multi-megabyte documents stay responsive.',
  },
  'json-formatter': {
    maxFiles: 5,
    maxFileMb: 40,
    maxTotalMb: 80,
    maxOutputMb: 60,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Documents above 8 MB switch to a plain-text view automatically.',
  },
  'qr-code-generator': {
    maxFiles: 1,
    maxFileMb: 5,
    maxTotalMb: 5,
    maxOutputMb: 5,
    maxCanvasEdge: 2048,
    chunkSize: 1,
    concurrency: 1,
    note: 'Exports up to 2048 px PNG or infinitely scalable SVG.',
  },
  'age-calculator': {
    maxFiles: 0,
    maxFileMb: 0,
    maxTotalMb: 0,
    maxOutputMb: 0,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Pure date maths - nothing is stored.',
  },
  'percentage-calculator': {
    maxFiles: 0,
    maxFileMb: 0,
    maxTotalMb: 0,
    maxOutputMb: 0,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Pure arithmetic - no data leaves the page.',
  },
  'discount-calculator': {
    maxFiles: 0,
    maxFileMb: 0,
    maxTotalMb: 0,
    maxOutputMb: 0,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Pure arithmetic - no data leaves the page.',
  },
  'emi-calculator': {
    maxFiles: 0,
    maxFileMb: 0,
    maxTotalMb: 0,
    maxOutputMb: 0,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Schedules are capped at 600 instalments (50 years).',
  },
  'gst-calculator': {
    maxFiles: 0,
    maxFileMb: 0,
    maxTotalMb: 0,
    maxOutputMb: 0,
    maxCanvasEdge: 0,
    chunkSize: 1,
    concurrency: 1,
    note: 'Pure arithmetic - no data leaves the page.',
  },
};

/** Tier-based hard overrides, applied after scaling. */
const TIER_CAPS: Record<DeviceTier, { maxFiles: number; maxTotalMb: number; maxCanvasEdge: number }> = {
  low: { maxFiles: 25, maxTotalMb: 100, maxCanvasEdge: 2048 },
  mid: { maxFiles: 120, maxTotalMb: 400, maxCanvasEdge: 4096 },
  high: { maxFiles: 4000, maxTotalMb: 8192, maxCanvasEdge: 8192 },
};

/**
 * Scales the desktop limits in {@link TOOL_LIMITS} to the current device.
 * Call once per job and memoize - it is not free (reads `matchMedia`).
 */
export function resolveLimits(
  slug: ToolSlug,
  profile: DeviceProfile = detectDeviceProfile()
): ToolLimitSpec {
  const base = TOOL_LIMITS[slug];
  const cap = TIER_CAPS[profile.tier];
  const scale = profile.scale;

  // Fields that describe *counts* scale by device, but a spec of 0 means
  // "not applicable" (calculators) and must stay 0 rather than becoming 1.
  const scaleCount = (value: number, floor: number) =>
    value === 0 ? 0 : Math.max(floor, Math.round(value * scale));

  const maxFiles = Math.min(scaleCount(base.maxFiles, 2), cap.maxFiles);
  const maxTotalMb = Math.min(
    Math.max(20, Math.round(base.maxTotalMb * scale)),
    cap.maxTotalMb
  );
  const maxFileMb = Math.min(base.maxFileMb, maxTotalMb);
  const maxCanvasEdge =
    base.maxCanvasEdge === 0
      ? 0
      : Math.min(Math.max(1024, Math.round(base.maxCanvasEdge * Math.max(scale, 0.5))), cap.maxCanvasEdge);

  return {
    ...base,
    maxFiles,
    maxFileMb,
    maxTotalMb,
    maxOutputMb: Math.min(base.maxOutputMb, Math.max(maxTotalMb, 64)),
    maxCanvasEdge,
    chunkSize: Math.max(1, Math.round(base.chunkSize * Math.max(scale, 0.5))),
    concurrency: Math.max(
      1,
      Math.min(Math.round(base.concurrency * Math.max(scale, 0.5)), Math.max(1, profile.cores - 1))
    ),
  };
}

/** Human-readable one-liner rendered under the tool heading. */
export function limitSummary(slug: ToolSlug, limits: ToolLimitSpec): string {
  if (limits.maxFiles === 0) return limits.note;
  if (limits.maxFiles === 1) {
    return `${limits.note} Single file up to ${limits.maxFileMb} MB.`;
  }
  return `${limits.note} Up to ${limits.maxFiles} files / ${limits.maxTotalMb} MB total on this device.`;
}
