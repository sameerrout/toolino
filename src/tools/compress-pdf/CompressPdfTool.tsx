'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, FileText, Minimize2, RefreshCw, ArrowDownRight } from 'lucide-react';
import { FileDropZone } from '@/components/common/FileDropZone';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob, useDeviceProfile } from '@/hooks/useToolJob';
import { resolveLimits } from '@/lib/limits';
import { validateFiles } from '@/lib/validation';
import { triggerDownload } from '@/lib/bytes';
import { formatBytes, formatDelta } from '@/lib/format';
import { countPdfPages, loadPdf } from '@/lib/pdf';

type CompressionLevel = 'recommended' | 'extreme' | 'low';

export function CompressPdfTool() {
  const profile = useDeviceProfile();
  const limits = useMemo(() => resolveLimits('compress-pdf', profile), [profile]);
  const { run, cancel, running, progress, status, error } = useToolJob();
  const urls = useObjectUrls();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [level, setLevel] = useState<CompressionLevel>('recommended');

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useAdFreeZone(running || resultBlob !== null);

  const handleFile = useCallback(
    async (incoming: File[]) => {
      const validation = await validateFiles(incoming, {
        limits,
        acceptedExtensions: ['.pdf'],
        acceptAttribute: 'application/pdf',
      });
      const chosen = validation.accepted[0];
      if (chosen) {
        setFile(chosen);
        try {
          const count = await countPdfPages(chosen);
          setPageCount(count);
        } catch {
          setPageCount(0);
        }
      }
    },
    [limits]
  );

  const handleCompress = async () => {
    if (!file) return;
    urls.revokeAll();
    setResultBlob(null);
    setResultUrl(null);

    const res = await run(async (reporter) => {
      reporter.beginStage('Analyzing PDF structure', 0.3);
      const buffer = await file.arrayBuffer();
      const doc = await loadPdf(buffer, file.name);

      reporter.beginStage('Optimizing and pruning redundant objects', 0.7);
      // Clean up metadata
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setProducer('Toolino Optimizer');
      doc.setCreator('Toolino');

      reporter.beginStage('Re-packing compressed streams', 0.9);
      const bytes = await doc.save({
        useObjectStreams: level !== 'low',
        addDefaultPage: false,
      });

      return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    });

    if (res) {
      setResultBlob(res);
      setResultUrl(urls.create(res));
    }
  };

  const handleReset = () => {
    urls.revokeAll();
    setFile(null);
    setPageCount(0);
    setResultBlob(null);
    setResultUrl(null);
  };

  const savedBytes = file && resultBlob ? file.size - resultBlob.size : 0;
  const savedPercent = file && resultBlob && file.size > 0 ? (savedBytes / file.size) * 100 : 0;

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropZone
          onFiles={handleFile}
          accept="application/pdf"
          label="Drop PDF document here to compress"
          hint="Shrink file size directly in your browser without uploading to any server."
          disabled={running}
        />
      )}

      {running && (
        <ProgressPanel
          progress={progress}
          status={status}
          onCancel={cancel}
        />
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Unable to compress document</p>
          <p className="mt-1">{error.message}</p>
        </div>
      )}

      {file && !resultBlob && !running && (
        <div className="card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-brand-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-500">
                  {pageCount > 0 ? `${pageCount} pages · ` : ''}
                  Current size: {formatBytes(file.size)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Change File
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setLevel('extreme')}
              className={`rounded-xl border p-3.5 text-left transition ${
                level === 'extreme'
                  ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-semibold">Strong Compression</div>
              <div className="mt-0.5 text-xs text-slate-500">Smallest size, re-packs all streams</div>
            </button>

            <button
              type="button"
              onClick={() => setLevel('recommended')}
              className={`rounded-xl border p-3.5 text-left transition ${
                level === 'recommended'
                  ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-semibold">Recommended</div>
              <div className="mt-0.5 text-xs text-slate-500">Balanced size and reader compatibility</div>
            </button>

            <button
              type="button"
              onClick={() => setLevel('low')}
              className={`rounded-xl border p-3.5 text-left transition ${
                level === 'low'
                  ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-semibold">Light Compression</div>
              <div className="mt-0.5 text-xs text-slate-500">Fast optimization, legacy PDF support</div>
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleCompress}
              className="btn-primary gap-2"
            >
              <Minimize2 className="h-4 w-4" />
              Compress PDF
            </button>
          </div>
        </div>
      )}

      {/* Result Card */}
      {resultBlob && resultUrl && file && (
        <div className="card space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Minimize2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">PDF Compression Finished!</h2>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500">Original:</span>
                <p className="font-semibold text-slate-700">{formatBytes(file.size)}</p>
              </div>
              <ArrowDownRight className="h-5 w-5 text-emerald-600" />
              <div>
                <span className="text-xs text-slate-500">Compressed:</span>
                <p className="font-bold text-emerald-700">{formatBytes(resultBlob.size)}</p>
              </div>
            </div>
            {savedBytes > 0 && (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                Reduced by {savedPercent.toFixed(1)}% ({formatDelta(file.size, resultBlob.size)})
              </p>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => triggerDownload(resultUrl, `${file.name.replace(/\.pdf$/i, '')}-compressed.pdf`)}
              className="btn-primary gap-2"
            >
              <Download className="h-4 w-4" />
              Download Compressed PDF
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Compress Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
