'use client';

import { useCallback, useState } from 'react';
import { Download, Sparkles, RefreshCw } from 'lucide-react';
import { FileDropZone } from '@/components/common/FileDropZone';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob } from '@/hooks/useToolJob';
import { triggerDownload } from '@/lib/bytes';
import { formatBytes } from '@/lib/format';

export function RemoveBackgroundTool() {
  const { run, cancel, running, progress, status, error } = useToolJob();
  const urls = useObjectUrls();

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useAdFreeZone(running || resultBlob !== null);

  const handleFile = useCallback(
    (incoming: File[]) => {
      const chosen = incoming[0];
      if (!chosen) return;
      urls.revokeAll();
      setFile(chosen);
      setOriginalUrl(urls.create(chosen));
      setResultBlob(null);
      setResultUrl(null);
    },
    [urls]
  );

  const handleRemoveBg = async () => {
    if (!file) return;

    const res = await run(async (reporter) => {
      reporter.beginStage('Preparing AI model (downloaded once and cached locally)', 0.2);

      let removeBackground;
      try {
        const mod = await import('@imgly/background-removal');
        removeBackground = mod.removeBackground;
      } catch {
        throw new Error('Unable to load background removal library. Please check your internet connection and try again.');
      }

      reporter.beginStage('Analyzing subject and removing background', 0.85);

      try {
        const blob = await removeBackground(file, {
          progress: (key: string, current: number, total: number) => {
            if (total > 0) {
              reporter.report(
                0.2 + 0.7 * (current / total),
                `Processing ${key.replace(/^fetch:/, 'model ')}...`
              );
            }
          },
        });
        return blob;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
          throw new Error('Unable to download AI model files from CDN. Please check your internet connection and try again.');
        }
        throw new Error(msg || 'Failed to remove image background.');
      }
    });

    if (res) {
      setResultBlob(res);
      setResultUrl(urls.create(res));
    }
  };

  const handleReset = () => {
    urls.revokeAll();
    setFile(null);
    setOriginalUrl(null);
    setResultBlob(null);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropZone
          onFiles={handleFile}
          accept="image/jpeg,image/png,image/webp,image/avif"
          label="Drop an image here to remove background"
          hint="AI-powered background removal processes your image locally in your browser. No files are uploaded to any server."
          disabled={running}
        />
      )}

      {running && (
        <div className="space-y-3">
          <ProgressPanel
            progress={progress}
            status={status}
            onCancel={cancel}
          />
          <p className="text-center text-xs text-slate-500">
            Initial run downloads the lightweight neural model once and caches it in your browser.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Unable to remove background</p>
          <p className="mt-1">{error.message}</p>
        </div>
      )}

      {file && originalUrl && !resultBlob && !running && (
        <div className="card space-y-5 text-center">
          <div className="flex justify-center">
            <div className="max-h-72 max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xs">
              <img
                src={originalUrl}
                alt="Source preview"
                className="max-h-64 rounded-xl object-contain"
              />
            </div>
          </div>

          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{file.name}</span> ({formatBytes(file.size)})
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={handleRemoveBg}
              className="btn-primary gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Remove Background Now
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary gap-2"
            >
              Choose Different Image
            </button>
          </div>
        </div>
      )}

      {/* Result View with Checkerboard Transparency Background */}
      {resultBlob && resultUrl && (
        <div className="card space-y-5 text-center">
          <h2 className="text-lg font-bold text-slate-900">Background Removed Successfully!</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {originalUrl && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Original</span>
                <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase text-emerald-600">Transparent Result</span>
              <div
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
                className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-inner"
              >
                <img
                  src={resultUrl}
                  alt="Transparent PNG"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => triggerDownload(resultUrl, `${file ? file.name.replace(/\.[^/.]+$/, '') : 'image'}-transparent.png`)}
              className="btn-primary gap-2"
            >
              <Download className="h-4 w-4" />
              Download Transparent PNG
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Process Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
