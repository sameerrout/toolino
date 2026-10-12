'use client';

/**
 * All Files to ZIP — the flagship tool.
 *
 * Behaviour worth noting:
 *  - accepts any file type, individually, by drag-and-drop, or as a whole
 *    folder tree via `webkitdirectory`
 *  - de-duplicates names as `file (1).txt` and preserves folder structure
 *  - three compression levels, with already-compressed formats stored as-is
 *  - streams straight to disk where the browser supports it, so a multi-gigabyte
 *    archive never has to fit in memory
 *  - real progress, a genuine Cancel button, and an estimated output size
 *  - warns before starting when the job is large for the device
 *  - revokes every object URL and terminates the worker when it is done
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Download, FileArchive, Info, Loader2, TriangleAlert } from 'lucide-react';

import { FileDropZone } from '@/components/common/FileDropZone';
import { FileList, type FileListEntry } from '@/components/common/FileList';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob, useDeviceProfile } from '@/hooks/useToolJob';
import { resolveLimits } from '@/lib/limits';
import { formatBytes, formatDelta } from '@/lib/format';
import { describeFileType } from '@/lib/filenames';
import { validateFiles } from '@/lib/validation';
import { supportsFileSystemAccess, triggerDownload } from '@/lib/bytes';
import {
  collectZipEntries,
  createZip,
  defaultArchiveName,
  previewArchiveSize,
  totalBytes,
  type ZipSourceFile,
} from '@/lib/zip/zipClient';
import { COMPRESSION_LEVELS, checkArchiveMemory, type CompressionLevel } from '@/lib/zip/zipCore';

interface CompletedArchive {
  name: string;
  size: number;
  inputSize: number;
  destination: 'disk' | 'memory';
  entryCount: number;
}

export function CreateZipTool() {
  const profile = useDeviceProfile();
  const limits = useMemo(() => resolveLimits('create-zip', profile), [profile]);
  const { run, cancel, running, progress, status, completed, total, error, cancelled } = useToolJob('create-zip');
  const urls = useObjectUrls();

  const [entries, setEntries] = useState<ZipSourceFile[]>([]);
  const [archiveName, setArchiveName] = useState('archive.zip');
  const [nameEdited, setNameEdited] = useState(false);
  const [level, setLevel] = useState<CompressionLevel>('fast');
  const [keepStructure, setKeepStructure] = useState(true);
  const [preferDisk, setPreferDisk] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [archive, setArchive] = useState<CompletedArchive | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  // Suppress ads while a job is running or a result is on screen: an accidental
  // click next to a "download" button is exactly what AdSense penalises.
  useAdFreeZone(running || archive !== null);

  const diskAvailable = useRef(false);
  useEffect(() => {
    diskAvailable.current = supportsFileSystemAccess();
    // Default to streaming when the browser supports it: lower memory, and the
    // user gets a normal save dialog instead of a blob download.
    setPreferDisk(diskAvailable.current);
  }, []);

  const totalSize = useMemo(() => totalBytes(entries), [entries]);
  const estimatedSize = useMemo(
    () => (entries.length > 0 ? previewArchiveSize(entries, level) : 0),
    [entries, level]
  );

  const memoryWarning = useMemo(
    () => checkArchiveMemory(totalSize, profile, diskAvailable.current && preferDisk),
    [totalSize, profile, preferDisk]
  );

  // Reset the archive name when the contents change, unless the user typed one.
  useEffect(() => {
    if (nameEdited || entries.length === 0) return;
    setArchiveName(defaultArchiveName(entries));
  }, [entries, nameEdited]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const result = await validateFiles(files, {
        limits,
        // Any file type is accepted: this tool genuinely handles all of them.
        acceptAttribute: '*/*',
      });

      setRejected(result.rejected.map((issue) => `${issue.fileName}: ${issue.message}`));

      if (result.accepted.length === 0) return;

      setEntries((current) => {
        const merged = collectZipEntries(
          [...current.map((entry) => entry.file), ...result.accepted],
          { keepFolderStructure: keepStructure }
        );
        return merged;
      });
      setArchive(null);
      setUrl(null);
    },
    [limits, keepStructure]
  );

  const handleReorderStructure = useCallback(
    (nextKeep: boolean) => {
      setKeepStructure(nextKeep);
      if (entries.length > 0) {
        setEntries(collectZipEntries(entries.map((entry) => entry.file), {
          keepFolderStructure: nextKeep,
        }));
      }
    },
    [entries]
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.path !== id));
    setArchive(null);
  }, []);

  const clearAll = useCallback(() => {
    setEntries([]);
    setRejected([]);
    setArchive(null);
    urls.revokeAll();
    setUrl(null);
  }, [urls]);

  const handleCreate = useCallback(async () => {
    // Release the previous result first so we never hold two archives at once.
    urls.revokeAll();
    setUrl(null);
    setArchive(null);
    setRejected([]);

    const finished = await run(async (reporter) => {
      const outcome = await createZip({
        entries,
        archiveName,
        level,
        preferDiskStreaming: preferDisk,
        reporter,
        profile,
      });

      // For the in-memory path, build the object URL here so the effect that
      // owns it can revoke it on unmount or on the next run.
      if (outcome.blob) {
        const objectUrl = urls.create(outcome.blob);
        setUrl(objectUrl);
      }

      setArchive({
        name: outcome.archiveName,
        size: outcome.size,
        inputSize: outcome.inputSize,
        destination: outcome.destination,
        entryCount: outcome.entryCount,
      });

      return outcome;
    });

    if (!finished) setArchive(null);
  }, [archiveName, entries, level, preferDisk, profile, run, urls]);

  const handleDownload = useCallback(() => {
    if (url && archive) triggerDownload(url, archive.name);
  }, [url, archive]);

  const listEntries: FileListEntry[] = entries.map((entry) => ({
    id: entry.path,
    name: entry.path,
    path: entry.path,
    size: entry.size,
    type: describeFileType(entry.file),
  }));

  const canCreate = entries.length > 0 && !running && memoryWarning.level !== 'blocked';

  return (
    <div className="space-y-6">
      <FileDropZone
        onFiles={(files) => void addFiles(files)}
        accept="*/*"
        multiple
        allowFolder
        disabled={running}
        label="Drop any files or folder here"
        hint="Any file type. Folder uploads keep their structure. Nothing is uploaded — compression happens on this device."
      />

      {rejected.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            {rejected.length} {rejected.length === 1 ? 'file was' : 'files were'} skipped
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {rejected.slice(0, 6).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          {rejected.length > 6 ? (
            <p className="mt-1 text-xs text-amber-800">and {rejected.length - 6} more…</p>
          ) : null}
        </div>
      ) : null}

      <FileList
        entries={listEntries}
        onRemove={removeEntry}
        onClear={clearAll}
        totalLabel={
          entries.length > 0
            ? `· ${formatBytes(totalSize)} total · about ${formatBytes(estimatedSize)} archived`
            : undefined
        }
        totalWarning={memoryWarning.level !== 'none' ? memoryWarning.message : undefined}
        emptyLabel="No files added yet. Drop files, pick them, or choose a whole folder."
      />

      {entries.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="text-sm font-semibold text-slate-900">Archive settings</h2>

            <div className="mt-4">
              <label htmlFor="zip-name" className="field-label">
                ZIP file name
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="zip-name"
                  type="text"
                  value={archiveName.replace(/\.zip$/i, '')}
                  disabled={running}
                  onChange={(event) => {
                    setNameEdited(true);
                    setArchiveName(`${event.target.value}.zip`);
                  }}
                  className="field-input"
                  placeholder="archive"
                  autoComplete="off"
                  spellCheck={false}
                />
                <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-2.5 text-sm text-slate-600">
                  .zip
                </span>
              </div>
            </div>

            <fieldset className="mt-4">
              <legend className="field-label">Compression level</legend>
              <div className="space-y-2">
                {COMPRESSION_LEVELS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                  >
                    <input
                      type="radio"
                      name="compression-level"
                      value={option.value}
                      checked={level === option.value}
                      disabled={running}
                      onChange={() => setLevel(option.value)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-600">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-900">Options</h2>

            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={keepStructure}
                disabled={running}
                onChange={(event) => handleReorderStructure(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="font-medium text-slate-900">Keep folder structure</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  Recreate the subfolders inside the archive. Turn this off to place every file at the
                  top level.
                </span>
              </span>
            </label>

            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={preferDisk}
                disabled={running || !diskAvailable.current}
                onChange={(event) => setPreferDisk(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="font-medium text-slate-900">Stream straight to disk</span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  {diskAvailable.current
                    ? 'Asks where to save the file first, then writes it as it is produced. Keeps memory flat for very large archives.'
                    : 'Not available in this browser. The archive is built in memory instead, which is fine up to a few hundred megabytes.'}
                </span>
              </span>
            </label>

            <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Files</dt>
                <dd className="font-medium tabular-nums text-slate-900">{entries.length}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Total size</dt>
                <dd className="font-medium tabular-nums text-slate-900">{formatBytes(totalSize)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Estimated ZIP</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  ≈ {formatBytes(estimatedSize)}
                </dd>
              </div>
            </dl>

            {memoryWarning.level === 'warning' ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {memoryWarning.message}
              </p>
            ) : null}
            {memoryWarning.level === 'blocked' ? (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-900">
                <TriangleAlert aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {memoryWarning.message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={!canCreate}
              className="btn-primary mt-5 w-full"
            >
              {running ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <FileArchive aria-hidden="true" className="h-4 w-4" />
              )}
              {running ? 'Creating archive…' : 'Create ZIP file'}
            </button>

            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
              <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Already-compressed files such as JPG, MP4 and PDF are stored without re-compressing,
                because deflating them again would only make the archive slower to build.
              </span>
            </p>
          </div>
        </div>
      ) : null}

      {running ? (
        <ProgressPanel
          progress={progress}
          status={status}
          completed={completed}
          total={total}
          onCancel={cancel}
        />
      ) : null}

      {cancelled ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Cancelled. Nothing was saved, and the worker has been stopped.
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <p className="font-semibold">{error.message}</p>
          {error.hint ? <p className="mt-1 text-red-800">{error.hint}</p> : null}
        </div>
      ) : null}

      {archive && !running ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 text-base font-semibold text-emerald-900">
            <Archive aria-hidden="true" className="h-5 w-5" />
            {archive.destination === 'disk' ? 'Archive saved' : 'Your ZIP is ready'}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {archive.entryCount} {archive.entryCount === 1 ? 'file' : 'files'} ·{' '}
            {formatBytes(archive.inputSize)} → {formatBytes(archive.size)}
            {archive.inputSize > 0 ? ` (${formatDelta(archive.inputSize, archive.size)})` : ''}
          </p>

          {archive.destination === 'disk' ? (
            <p className="mt-3 text-sm text-emerald-900">
              The archive was streamed straight to the file you chose. No copy was kept in this tab.
            </p>
          ) : (
            <button type="button" onClick={handleDownload} className="btn-primary mt-4">
              <Download aria-hidden="true" className="h-4 w-4" />
              Download {archive.name}
            </button>
          )}

          <button
            type="button"
            onClick={clearAll}
            className="mt-4 block text-sm font-medium text-emerald-900 underline underline-offset-2"
          >
            Start a new archive
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Exported so tests can assert the estimate shown in the UI. */
export function estimateForDisplay(entries: ZipSourceFile[], level: CompressionLevel): number {
  return previewArchiveSize(entries, level);
}
