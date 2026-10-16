import { describe, it, expect } from 'vitest';
import {
  parsePageRanges,
  formatPageRanges,
  formatPageNumber,
  toRoman,
  toAlpha,
} from '@/lib/pdf';
import { validateFileMagicBytes } from '@/lib/validation';

describe('PDF Engine Primitives', () => {
  describe('Page Range Parsing', () => {
    it('parses numeric ranges and individual pages', () => {
      const parsed = parsePageRanges('1-3, 5, 8-10', 12);
      expect(parsed).toEqual([0, 1, 2, 4, 7, 8, 9]);
    });

    it('parses "odd" and "even" keywords', () => {
      expect(parsePageRanges('odd', 6)).toEqual([0, 2, 4]);
      expect(parsePageRanges('even', 6)).toEqual([1, 3, 5]);
    });

    it('parses open-ended ranges like "7-" and "-4"', () => {
      expect(parsePageRanges('8-', 10)).toEqual([7, 8, 9]);
      expect(parsePageRanges('-3', 10)).toEqual([0, 1, 2]);
    });

    it('removes duplicate page entries and clamps to document bounds', () => {
      expect(parsePageRanges('1, 1, 2, 2, 99', 5)).toEqual([0, 1]);
    });

    it('formats 0-based page indices back into compact string ranges', () => {
      expect(formatPageRanges([0, 1, 2, 4, 7, 8, 9])).toBe('1-3, 5, 8-10');
      expect(formatPageRanges([])).toBe('');
      expect(formatPageRanges([2])).toBe('3');
    });
  });

  describe('Page Number Formatting', () => {
    it('formats standard arabic numerals and n-of-total', () => {
      expect(formatPageNumber('n', 3, 10, 1)).toBe('3');
      expect(formatPageNumber('n-of-total', 3, 10, 1)).toBe('3 / 10');
      expect(formatPageNumber('page-n-of-total', 3, 10, 1)).toBe('Page 3 of 10');
    });

    it('converts integers to Roman numerals correctly', () => {
      expect(toRoman(1)).toBe('I');
      expect(toRoman(4)).toBe('IV');
      expect(toRoman(9)).toBe('IX');
      expect(toRoman(14)).toBe('XIV');
      expect(toRoman(40)).toBe('XL');
      expect(toRoman(90)).toBe('XC');
      expect(toRoman(2026)).toBe('MMXXVI');
    });

    it('formats roman page numbers with correct casing', () => {
      expect(formatPageNumber('i', 4, 10, 1)).toBe('iv');
      expect(formatPageNumber('I', 4, 10, 1)).toBe('IV');
    });

    it('converts integers to spreadsheet-style alpha labels', () => {
      expect(toAlpha(1)).toBe('A');
      expect(toAlpha(26)).toBe('Z');
      expect(toAlpha(27)).toBe('AA');
    });
  });

  describe('File Magic Byte Inspection', () => {
    it('validates pdf magic bytes correctly', async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
      const pdfFile = new File([pdfBytes], 'test.pdf', { type: 'application/pdf' });
      expect(await validateFileMagicBytes(pdfFile, 'pdf')).toBe(true);

      const fakeFile = new File([new Uint8Array([0, 1, 2, 3])], 'fake.pdf');
      expect(await validateFileMagicBytes(fakeFile, 'pdf')).toBe(false);
    });

    it('validates zip magic bytes correctly', async () => {
      const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
      const zipFile = new File([zipBytes], 'test.zip');
      expect(await validateFileMagicBytes(zipFile, 'zip')).toBe(true);
    });

    it('validates image magic bytes correctly', async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const pngFile = new File([pngBytes], 'test.png');
      expect(await validateFileMagicBytes(pngFile, 'image')).toBe(true);
    });
  });
});
