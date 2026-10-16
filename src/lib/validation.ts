/**
 * Input validation.
 *
 * Every rule is enforced *before* a file is read into memory, so a 4 GB video
 * dropped on the image resizer is rejected instantly instead of freezing the
 * tab. Validation is deliberately advisory-friendly: it returns structured
 * issues so the UI can show per-file inline errors rather than one alert.
 */

import { AppError } from './errors';
import { formatBytes } from './format';
import { describeFileType } from './filenames';
import type { ToolLimitSpec } from './limits';

export interface ValidationIssue {
  fileName: string;
  code: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'EMPTY_FILE';
  message: string;
}

export interface ValidationResult {
  accepted: File[];
  rejected: ValidationIssue[];
  /** Sum of accepted file sizes in bytes. */
  totalBytes: number;
}

export interface ValidateOptions {
  limits: ToolLimitSpec;
  /** Lowercase extensions including the dot, e.g. `['.pdf']`. Empty = any. */
  acceptedExtensions?: string[];
  /** `accept` attribute value shown by the picker, e.g. `'image/*,.pdf'`. */
  acceptAttribute?: string;
}

/** True when the extension is in the allow-list (or the list is empty/absent). */
export function isExtensionAccepted(fileName: string, acceptedExtensions?: string[]): boolean {
  if (!acceptedExtensions || acceptedExtensions.length === 0) return true;
  const lower = fileName.toLowerCase();
  return acceptedExtensions.some((ext) => lower.endsWith(ext.toLowerCase()));
}

/**
 * Magic-byte sniffing for the few formats where trusting the extension is
 * dangerous (a `.pdf` that is really a ZIP, etc). Cheap: reads at most 8 bytes.
 */
export async function sniffSignature(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const ascii = String.fromCharCode(...head);

  if (ascii.startsWith('%PDF-')) return 'pdf';
  if (head[0] === 0x50 && head[1] === 0x4b) return 'zip'; // PK.. (zip/docx/xlsx/pptx)
  if (head[0] === 0xff && head[1] === 0xd8) return 'jpeg';
  if (head[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'png';
  if (ascii.startsWith('GIF8')) return 'gif';
  if (ascii.startsWith('RIFF') && head[8] === undefined) return 'riff'; // truncated, treat as riff
  if (ascii.slice(0, 4) === 'RIFF') return 'riff'; // webp/wav/avi
  if (head[0] === 0x42 && head[1] === 0x4d) return 'bmp';
  // ISO-BMFF (avif/heic/mp4) - 'ftyp' at offset 4
  if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) return 'isobmff';
  if (head[0] === 0x1f && head[1] === 0x8b) return 'gzip';
  return null;
}

/**
 * Validates a batch of files against a tool's limits.
 *
 * Reports *every* problem rather than throwing on the first one so the user can
 * fix the whole batch in a single pass.
 */
export async function validateFiles(
  files: File[],
  options: ValidateOptions
): Promise<ValidationResult> {
  const { limits, acceptedExtensions } = options;
  const accepted: File[] = [];
  const rejected: ValidationIssue[] = [];
  let totalBytes = 0;

  if (files.length === 0) return { accepted, rejected, totalBytes };

  const remainingSlots = limits.maxFiles > 0 ? limits.maxFiles : Number.POSITIVE_INFINITY;
  const maxFileBytes = limits.maxFileMb * 1024 * 1024;
  const maxTotalBytes = limits.maxTotalMb * 1024 * 1024;

  for (const file of files) {
    if (accepted.length >= remainingSlots) {
      rejected.push({
        fileName: file.name,
        code: 'UNSUPPORTED_TYPE',
        message: `Only ${limits.maxFiles} files can be processed at once on this device.`,
      });
      continue;
    }

    if (file.size === 0) {
      rejected.push({
        fileName: file.name,
        code: 'EMPTY_FILE',
        message: 'This file is empty (0 bytes).',
      });
      continue;
    }

    if (!isExtensionAccepted(file.name, acceptedExtensions)) {
      rejected.push({
        fileName: file.name,
        code: 'UNSUPPORTED_TYPE',
        message: `${describeFileType(file)} files are not supported here. Accepted: ${acceptedExtensions
          ?.join(', ')
          .replace(/\./g, '')
          .toUpperCase()}.`,
      });
      continue;
    }

    if (maxFileBytes > 0 && file.size > maxFileBytes) {
      rejected.push({
        fileName: file.name,
        code: 'FILE_TOO_LARGE',
        message: `${formatBytes(file.size)} is above the ${limits.maxFileMb} MB per-file limit.`,
      });
      continue;
    }

    if (maxTotalBytes > 0 && totalBytes + file.size > maxTotalBytes) {
      rejected.push({
        fileName: file.name,
        code: 'FILE_TOO_LARGE',
        message: `Adding this file would exceed the ${limits.maxTotalMb} MB total for this device.`,
      });
      continue;
    }

    totalBytes += file.size;
    accepted.push(file);
  }

  return { accepted, rejected, totalBytes };
}

/**
 * Throws a single {@link AppError} when nothing usable survived validation.
 * Used by single-file tools where a per-file list would be noise.
 */
export function assertUsable(result: ValidationResult): void {
  if (result.accepted.length > 0) return;
  const first = result.rejected[0];
  if (!first) throw new AppError('NO_FILES', 'Add a file to continue.');
  const code =
    first.code === 'UNSUPPORTED_TYPE'
      ? 'UNSUPPORTED_TYPE'
      : first.code === 'EMPTY_FILE'
        ? 'EMPTY_FILE'
        : 'FILE_TOO_LARGE';
  throw new AppError(code, first.message, { fileName: first.fileName });
}

/**
 * Reads the intrinsic dimensions of an image file without keeping the bitmap
 * alive. Uses `createImageBitmap` when available and falls back to an
 * `<img>` + object URL, always releasing both.
 */
export async function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    try {
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close();
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
      image.src = '';
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AppError('CORRUPT_FILE', `"${file.name}" could not be opened as an image.`));
    };
    image.src = url;
  });
}

/**
 * Rejects when the browser reports a hard memory failure. `performance.memory`
 * is Chromium-only and non-standard, so this is a best-effort guard used to
 * stop a runaway batch before the tab is killed.
 */
export function isMemoryPressureHigh(): boolean {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!perf.memory) return false;
  return perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit > 0.9;
}

export async function validateFileMagicBytes(
  file: File,
  expectedType: 'pdf' | 'zip' | 'image'
): Promise<boolean> {
  const buffer = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (expectedType === 'pdf') {
    // %PDF- (25 50 44 46 2D)
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  if (expectedType === 'zip') {
    // PK\x03\x04 (50 4B 03 04)
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  if (expectedType === 'image') {
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    return isPng || isJpg || isWebp;
  }
  return false;
}

