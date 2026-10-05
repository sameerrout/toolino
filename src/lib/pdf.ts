/**
 * PDF primitives shared by every PDF tool.
 *
 * PDF-LIB does the document surgery; this module owns the parts that are easy to
 * get wrong and worth testing on their own:
 *
 *  - page-range parsing (`1-5,8,12-`, `odd`, `even`, `all`)
 *  - loading bytes into a `PDFDocument` with consistent error mapping
 *  - saving without object streams (needed by some readers) and with
 *    deterministic metadata
 *  - adding a real page-number / watermark text block using only the standard
 *    Type 1 fonts that every PDF reader already has
 *
 * Nothing here touches the network.
 */

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { AppError, mapBrowserError } from './errors';

export type { PDFDocument, PDFFont, PDFPage };

/** Re-exported so tools do not need a second import for drawing primitives. */
export { PDFDocument as PdfDocument, StandardFonts, degrees, rgb };

/**
 * Parses a human page-range expression into zero-based page indices.
 *
 * Supported syntax, all case-insensitive and whitespace tolerant:
 *   `all`           every page
 *   `1-5`           inclusive range
 *   `3`             a single page
 *   `7-`            from page 7 to the end
 *   `-4`            from the start to page 4
 *   `1-3,8,12-14`   a combination
 *   `odd` / `even`  every odd or even page
 *
 * Page numbers are 1-based in the input because that is what a user sees in
 * their PDF reader. Output indices are 0-based. Duplicates are removed and the
 * result is sorted ascending, which is what merge/split users expect.
 */
export function parsePageRanges(expression: string, pageCount: number): number[] {
  const trimmed = expression.trim().toLowerCase();
  if (pageCount <= 0) return [];
  if (trimmed === '' || trimmed === 'all' || trimmed === '*') {
    return Array.from({ length: pageCount }, (_, index) => index);
  }
  if (trimmed === 'odd') {
    return Array.from({ length: pageCount }, (_, index) => index).filter((index) => index % 2 === 0);
  }
  if (trimmed === 'even') {
    return Array.from({ length: pageCount }, (_, index) => index).filter((index) => index % 2 === 1);
  }

  const pages = new Set<number>();

  for (const rawPart of trimmed.split(',')) {
    const part = rawPart.trim();
    if (part === '') continue;

    const rangeMatch = /^(\d+)?\s*-\s*(\d+)?$/.exec(part);
    if (rangeMatch) {
      const startRaw = rangeMatch[1];
      const endRaw = rangeMatch[2];
      // `-` on its own is meaningless; skip rather than throwing.
      if (startRaw === undefined && endRaw === undefined) continue;

      const start = startRaw === undefined ? 1 : Number(startRaw);
      const end = endRaw === undefined ? pageCount : Number(endRaw);

      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

      const from = Math.max(1, Math.min(start, end));
      const to = Math.min(pageCount, Math.max(start, end));
      for (let page = from; page <= to; page += 1) pages.add(page - 1);
      continue;
    }

    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page >= 1 && page <= pageCount) pages.add(page - 1);
      continue;
    }

    throw new AppError('INVALID_INPUT', `"${part}" is not a valid page range.`, {
      hint: 'Use numbers and ranges, for example 1-3, 7, 10-.',
    });
  }

  return [...pages].sort((a, b) => a - b);
}

/** Formats a page index list back into a compact expression, e.g. `1-3, 7`. */
export function formatPageRanges(indices: number[]): string {
  if (indices.length === 0) return '';
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0] as number;
  let previous = start;

  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index];
    if (current !== undefined && current === previous + 1) {
      previous = current;
      continue;
    }
    parts.push(start === previous ? `${start + 1}` : `${start + 1}-${previous + 1}`);
    if (current === undefined) break;
    start = current;
    previous = current;
  }

  return parts.join(', ');
}

/** Loads a PDF from bytes with consistent, friendly error mapping. */
export async function loadPdf(
  bytes: ArrayBuffer | Uint8Array,
  fileName?: string
): Promise<PDFDocument> {
  try {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    // `ignoreEncryption` lets us open a PDF that only restricts permissions
    // (an empty user password) instead of refusing it outright.
    return await PDFDocument.load(data, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/encrypted|password/i.test(message)) {
      throw new AppError('PASSWORD_REQUIRED', 'This PDF is password protected.', { fileName });
    }
    if (/parse|invalid|header/i.test(message)) {
      throw new AppError('CORRUPT_FILE', 'This file could not be read as a PDF.', { fileName });
    }
    throw mapBrowserError(error, fileName);
  }
}

/** Reads a `File` into a `PDFDocument`. */
export async function loadPdfFromFile(file: File): Promise<PDFDocument> {
  const buffer = await file.arrayBuffer();
  return loadPdf(buffer, file.name);
}

/** Serialises a document and returns it as a Blob. */
export async function savePdf(
  document: PDFDocument,
  options: { title?: string; author?: string; subject?: string } = {}
): Promise<Blob> {
  try {
    if (options.title) document.setTitle(options.title);
    if (options.author) document.setAuthor(options.author);
    if (options.subject) document.setSubject(options.subject);
    document.setProducer(PRODUCER);
    document.setCreator(PRODUCER);
    document.setModificationDate(new Date());

    const bytes = await document.save({
      // `useObjectStreams: false` maximises compatibility with older readers and
      // with print shops, at a small size cost.
      useObjectStreams: false,
      addDefaultPage: false,
    });

    return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  } catch (error) {
    throw mapBrowserError(error);
  }
}

/** Identifies the tool as the producer without leaking a version string. */
const PRODUCER = 'Toolino (browser-based, no upload)';

/** A safe, human-friendly output filename derived from an input filename. */
export function outputNameFor(inputName: string, suffix: string, extension = 'pdf'): string {
  const dot = inputName.lastIndexOf('.');
  const stem = dot > 0 ? inputName.slice(0, dot) : inputName;
  const safeStem = stem.replace(/[^\w\-. ]+/g, '_').slice(0, 80) || 'document';
  return `${safeStem}-${suffix}.${extension}`;
}

export interface TextStampOptions {
  text: string;
  /** 6-96 pt. */
  fontSize: number;
  /** `#rrggbb`. */
  color: string;
  /** 0..1. */
  opacity: number;
  /** Degrees, typically 0 or 45. */
  rotation: number;
  /** Where to place it, or `tile` to repeat across the page. */
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center' | 'tile';
}

export interface TextStampFonts {
  regular: PDFFont;
  bold: PDFFont;
}

/**
 * Embeds the two standard fonts used for stamps.
 *
 * These are the 14 fonts every PDF reader must provide, so embedding costs a few
 * hundred bytes instead of the 300 KB a full Unicode font would add - and it
 * removes any need to download a font file.
 */
export async function embedStampFonts(document: PDFDocument): Promise<TextStampFonts> {
  const [regular, bold] = await Promise.all([
    document.embedFont(StandardFonts.Helvetica),
    document.embedFont(StandardFonts.HelveticaBold),
  ]);
  return { regular, bold };
}

/** Parses `#rrggbb` into PDF-LIB's 0..1 rgb triple. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((char) => char + char)
          .join('')
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 0.5, g: 0.5, b: 0.5 };
  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255,
  };
}

/**
 * Draws a text stamp on one page.
 *
 * Uses `widthOfTextAtSize` to centre and right-align accurately, so long
 * watermarks do not spill off the edge of the page.
 */
export function stampText(page: PDFPage, options: TextStampOptions, fonts: TextStampFonts): void {
  const { width, height } = page.getSize();
  const { r, g, b } = hexToRgb(options.color);
  const color = rgb(r, g, b);
  const padding = 24;
  const textWidth = fonts.bold.widthOfTextAtSize(options.text, options.fontSize);

  if (options.position === 'tile') {
    const stepX = textWidth + 96;
    const stepY = options.fontSize * 7;
    const angle = options.rotation === 0 ? 45 : options.rotation;
    for (let y = stepY / 2; y < height; y += stepY) {
      for (let x = 0; x < width + stepX; x += stepX) {
        page.drawText(options.text, {
          x,
          y,
          size: options.fontSize,
          font: fonts.bold,
          color,
          opacity: options.opacity,
          rotate: degrees(angle),
        });
      }
    }
    return;
  }

  const positions: Record<
    Exclude<TextStampOptions['position'], 'tile'>,
    { x: number; y: number }
  > = {
    'top-left': { x: padding, y: height - padding - options.fontSize },
    'top-center': { x: (width - textWidth) / 2, y: height - padding - options.fontSize },
    'top-right': { x: width - padding - textWidth, y: height - padding - options.fontSize },
    'bottom-left': { x: padding, y: padding },
    'bottom-center': { x: (width - textWidth) / 2, y: padding },
    'bottom-right': { x: width - padding - textWidth, y: padding },
    center: { x: (width - textWidth) / 2, y: (height - options.fontSize) / 2 },
  };

  const target = positions[options.position];
  page.drawText(options.text, {
    x: target.x,
    y: target.y,
    size: options.fontSize,
    font: fonts.bold,
    color,
    opacity: options.opacity,
    rotate: degrees(options.rotation),
  });
}

/**
 * Builds the numbered label for a page.
 * Supports the formats people actually ask for, including roman numerals.
 */
export function formatPageNumber(
  format: 'n' | 'n-of-total' | 'i' | 'I' | 'a' | 'A' | 'page-n' | 'page-n-of-total',
  pageNumber: number,
  totalPages: number,
  startAt: number
): string {
  const value = pageNumber + startAt - 1;
  const total = totalPages + startAt - 1;

  switch (format) {
    case 'n':
      return String(value);
    case 'n-of-total':
      return `${value} / ${total}`;
    case 'i':
      return toRoman(value).toLowerCase();
    case 'I':
      return toRoman(value);
    case 'a':
      return toAlpha(value).toLowerCase();
    case 'A':
      return toAlpha(value);
    case 'page-n':
      return `Page ${value}`;
    case 'page-n-of-total':
      return `Page ${value} of ${total}`;
    default:
      return String(value);
  }
}

/** 1 -> `I`, 4 -> `IV`, 1990 -> `MCMXC`. Capped at 3999. */
export function toRoman(value: number): string {
  if (!Number.isFinite(value) || value < 1) return '';
  if (value > 3999) return String(value);
  const numerals: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let remaining = Math.floor(value);
  let output = '';
  for (const [amount, symbol] of numerals) {
    while (remaining >= amount) {
      output += symbol;
      remaining -= amount;
    }
  }
  return output;
}

/** 1 -> `a`, 27 -> `aa`, spreadsheet-column style. */
export function toAlpha(value: number): string {
  if (!Number.isFinite(value) || value < 1) return '';
  let remaining = Math.floor(value);
  let output = '';
  while (remaining > 0) {
    const remainder = (remaining - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    remaining = Math.floor((remaining - 1) / 26);
  }
  return output;
}

/** Interprets a `File` size as a PDF page count only by loading it. */
export async function countPdfPages(file: File): Promise<number> {
  const document = await loadPdfFromFile(file);
  return document.getPageCount();
}
