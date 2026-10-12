'use client';

/**
 * Extract ZIP — bonus mode of the archive tool.
 *
 * Reads an existing archive in a worker, lists every entry with its path and
 * size, and lets the user save individual files or all of them. Entries below a
 * memory threshold keep their bytes so they can be downloaded directly; larger
 * ones are listed without being buffered, which is what keeps a 2 GB archive
 * openable on a phone.
 */

import { useCallback, useMemo, useState } from 'react';
import { Download, FileArchive, FolderOpen, Loader2 } from 'lucide-react';

import { FileDropZone } from '@/components/common/FileDropZone';
import { FileList, type FileListEntry } from '@/components/common/FileList';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob, useDeviceProfile } from '@/hooks/useToolJob';
import { resolveLimits } from '@/lib/limits';
import { formatBytes } from '@/lib/format';
import { getExtension } from '@/lib/filenames';
import { validateFiles } from '@/lib/validation';
import { triggerDownload } from '@/lib/bytes';
import { extractZip } from '@/lib/zip/zipClient';
import type { ExtractEntry } from '@/lib/zip/zipCore';

export function ExtractZipTool() {
  const profile = useDeviceProfile();
  const limits = useMemo(() => resolveLimits('extract-zip', profile), [profile]);
  const { run, cancel, running, progress, status, error, cancelled } = useToolJob('extract-zip');
  const urls = useObjectUrls();

  const [archiveName, setArchiveName] = useState<string | null>(null);
  const [entries, setEntries] = useState<ExtractEntry[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  useAdFreeZone(running || entries.length > 0);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const validation = await validateFiles(files, {
        limits,
        acceptedExtensions: ['.zip'],
        acceptAttribute: '.zip',
      });

      const chosen = validation.accepted[0];
      if (!chosen) {
        return;
      }

      urls.revokeAll();
      setEntries([]);
      setTotalSize(0);
      setArchiveName(chosen.name);

      await run(async (reporter) => {
        const result = await extractZip({
          file: chosen,
          reporter,
          // Small entries keep their bytes so they can be downloaded instantly.
          maxEntryBytes: 32 * 1024 * 1024,
        });
        setEntries(result.entries);
        setTotalSize(result.totalSize);
        return result;
      });
    },
    [limits, run, urls]
  );

  const downloadEntry = useCallback(
    (entry: ExtractEntry) => {
      if (!entry.data) return;
      const blob = new Blob([entry.data as unknown as BlobPart], {
        type: 'application/octet-stream',
      });
      const url = urls.create(blob);
      triggerDownload(url, entry.path.split('/').pop() ?? entry.path);
    },
    [urls]
  );

  const downloadAll = useCallback(async () => {
    // Rebuild a ZIP on the fly with fflate so the user gets the whole tree.
    const { zipSync } = await import('fflate');
    const payload: Record<string, Uint8Array> = {};
    for (const entry of entries) {
      if (entry.data && !entry.isDirectory) payload[entry.path] = entry.data;
    }
    if (Object.keys(payload).length === 0) return;

    const zipped = zipSync(payload, { level: 0 });
    const blob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
    const url = urls.create(blob);
    triggerDownload(url, archiveName ? `extracted-${archiveName}` : 'extracted.zip');
  }, [entries, archiveName, urls]);

  const listEntries: FileListEntry[] = entries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      id: entry.path,
      name: entry.path,
      path: entry.path,
      size: entry.size,
      type: (getExtension(entry.path) || '.bin').slice(1).toUpperCase(),
      detail:
        entry.compressedSize > 0 && entry.size !== entry.compressedSize
          ? `${formatBytes(entry.compressedSize)} compressed`
          : undefined,
      warning: entry.data ? undefined : 'Too large to hold in memory — listed only.',
    }));

  return (
    <div className="space-y-6">
      <FileDropZone
        onFiles={(files) => void handleFiles(files)}
        accept=".zip,application/zip,application/x-zip-compressed"
        multiple={false}
        disabled={running}
        label="Drop a ZIP archive here"
        hint="One archive at a time. It is decoded on this device and never uploaded."
      />

      {running ? (
        <ProgressPanel progress={progress} status={status} onCancel={cancel} />
      ) : null}

      {cancelled ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Cancelled. The worker has been stopped.
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{error.message}</p>
          {error.hint ? <p className="mt-1 text-red-800">{error.hint}</p> : null}
        </div>
      ) : null}

      {entries.length > 0 && !running ? (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-base font-semibold text-emerald-900">
              <FolderOpen aria-hidden="true" className="h-5 w-5" />
              {listEntries.length} {listEntries.length === 1 ? 'file' : 'files'} found
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              {formatBytes(totalSize)} uncompressed in {archiveName}
            </p>
            <button type="button" onClick={() => void downloadAll()} className="btn-primary mt-4">
              <FileArchive aria-hidden="true" className="h-4 w-4" />
              Download all as a new ZIP
            </button>
          </div>

          <FileList
            entries={listEntries}
            emptyLabel="This archive contains only folders."
            totalLabel={`· ${formatBytes(totalSize)} total`}
          />

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-900">Individual files</h2>
            <p className="mt-1 text-xs text-slate-600">
              Files up to 32 MB are held in memory so you can save them one at a time.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {entries
                .filter((entry) => !entry.isDirectory && entry.data)
                .slice(0, 100)
                .map((entry) => (
                  <li key={entry.path}>
                    <button
                      type="button"
                      onClick={() => downloadEntry(entry)}
                      className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-slate-50"
                    >
                      <Download aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="min-w-0 flex-1 truncate">{entry.path}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatBytes(entry.size)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </>
      ) : null}

      {running ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Reading the archive…
        </p>
      ) : null}
    </div>
  );
}

/** Re-exported so the file-list type stays in one place for consumers. */
export type { ExtractEntry };
