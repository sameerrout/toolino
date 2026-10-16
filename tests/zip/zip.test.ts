import { describe, it, expect } from 'vitest';
import { allocateUniqueName } from '@/lib/filenames';
import {
  checkArchiveMemory,
  shouldStoreFile,
  levelToFflate,
  sanitizeZipEntryPath,
  MAX_EXTRACTED_TOTAL_BYTES,
  MAX_FILES_IN_ARCHIVE,
} from '@/lib/zip/zipCore';

describe('ZIP Architecture & Entry Logic', () => {
  it('deduplicates duplicate filenames sequentially', () => {
    const existing = new Set<string>();
    const first = allocateUniqueName('document.txt', existing);
    const second = allocateUniqueName('document.txt', existing);
    const third = allocateUniqueName('document.txt', existing);

    expect(first).toBe('document.txt');
    expect(second).toBe('document (1).txt');
    expect(third).toBe('document (2).txt');
  });

  it('preserves existing extension when appending deduplication numbers', () => {
    const existing = new Set<string>();
    allocateUniqueName('archive.tar.gz', existing);
    const dup = allocateUniqueName('archive.tar.gz', existing);

    expect(dup).toBe('archive.tar (1).gz');
  });

  it('selects Store for already-compressed formats', () => {
    const mediaFiles = ['photo.jpg', 'image.png', 'video.mp4', 'doc.pdf', 'backup.zip', 'book.docx'];
    for (const name of mediaFiles) {
      const store = shouldStoreFile(name, 50000, 'best');
      expect(store).toBe(true);
    }
  });

  it('applies selected compression level for uncompressed text/code formats', () => {
    const textFiles = ['notes.txt', 'script.js', 'styles.css', 'data.json', 'log.csv'];
    for (const name of textFiles) {
      const store = shouldStoreFile(name, 50000, 'fast');
      expect(store).toBe(false);
    }
    expect(levelToFflate('store')).toBe(0);
    expect(levelToFflate('fast')).toBe(1);
    expect(levelToFflate('best')).toBe(9);
  });

  it('warns when total size exceeds safe device memory threshold', () => {
    // 2 GB phone profile
    const lowEndProfile = {
      tier: 'low' as const,
      memoryGb: 2,
      cores: 2,
      scale: 0.5,
      saveData: false,
      effectiveType: '3g',
      prefersReducedMotion: false,
      summary: 'Low-memory device',
    };

    // 1.5 GB in-memory ZIP job on a 2 GB phone should trigger blocked warning
    const memoryWarning = checkArchiveMemory(1500 * 1024 * 1024, lowEndProfile, false);
    expect(memoryWarning.level).toBe('blocked');
    expect(memoryWarning.message.length).toBeGreaterThan(0);

    // Small 5 MB job should pass without warning
    const safeCheck = checkArchiveMemory(5 * 1024 * 1024, lowEndProfile, false);
    expect(safeCheck.level).toBe('none');
  });

  it('sanitizes zip entry paths preventing path traversal and leading slashes', () => {
    expect(sanitizeZipEntryPath('../../etc/passwd')).toBe('etc/passwd');
    expect(sanitizeZipEntryPath('/absolute/path/file.txt')).toBe('absolute/path/file.txt');
    expect(sanitizeZipEntryPath('folder/./subfolder/../file.txt')).toBe('folder/subfolder/file.txt');
    expect(sanitizeZipEntryPath('normal\\windows\\path.txt')).toBe('normal/windows/path.txt');
  });

  it('defines safe extraction thresholds', () => {
    expect(MAX_EXTRACTED_TOTAL_BYTES).toBe(250 * 1024 * 1024);
    expect(MAX_FILES_IN_ARCHIVE).toBe(500);
  });
});
