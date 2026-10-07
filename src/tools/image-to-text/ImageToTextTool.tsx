'use client';

import { useCallback, useState } from 'react';
import { Download, Copy, Check, ScanText, RefreshCw } from 'lucide-react';
import { FileDropZone } from '@/components/common/FileDropZone';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob } from '@/hooks/useToolJob';
import { triggerDownload } from '@/lib/bytes';
import { formatBytes } from '@/lib/format';

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'hin', name: 'Hindi' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'jpn', name: 'Japanese' },
];

export function ImageToTextTool() {
  const { run, cancel, running, progress, status, error } = useToolJob();
  const urls = useObjectUrls();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState('eng');
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useAdFreeZone(running || extractedText.length > 0);

  const handleFile = useCallback(
    (incoming: File[]) => {
      const chosen = incoming[0];
      if (!chosen) return;
      urls.revokeAll();
      setFile(chosen);
      setPreviewUrl(urls.create(chosen));
      setExtractedText('');
      setConfidence(null);
    },
    [urls]
  );

  const handleOcr = async () => {
    if (!file) return;

    const res = await run(async (reporter) => {
      reporter.beginStage('Loading Tesseract.js OCR engine', 0.2);
      const { createWorker } = await import('tesseract.js');

      let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
      try {
        try {
          worker = await createWorker(language, 1, {
            logger: (m: { status?: string; progress?: number }) => {
              if (m.status === 'recognizing text') {
                reporter.report(0.2 + 0.75 * (m.progress || 0), `Scanning text: ${Math.round((m.progress || 0) * 100)}%`);
              } else if (m.status) {
                reporter.report(0.15, `Preparing OCR (${m.status})...`);
              }
            },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
            throw new Error('Unable to load the OCR language model. Please check your internet connection and try again.');
          }
          throw new Error(msg || 'Unable to initialize OCR engine.');
        }

        reporter.beginStage('Extracting character matrix', 0.9);
        const { data } = await worker.recognize(file);
        return {
          text: data.text,
          confidence: data.confidence,
        };
      } finally {
        if (worker) {
          try {
            await worker.terminate();
          } catch {
            // Ignore termination errors on dispose
          }
        }
      }
    });

    if (res) {
      setExtractedText(res.text);
      setConfidence(Math.round(res.confidence));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    triggerDownload(u, `${file ? file.name.replace(/\.[^/.]+$/, '') : 'extracted'}.txt`);
    URL.revokeObjectURL(u);
  };

  const handleReset = () => {
    urls.revokeAll();
    setFile(null);
    setPreviewUrl(null);
    setExtractedText('');
    setConfidence(null);
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropZone
          onFiles={handleFile}
          accept="image/*"
          label="Drop image here to extract text (OCR)"
          hint="Extract editable text from receipts, documents, screenshots, and photos."
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
            Initial run downloads the language OCR model and caches it locally in your browser.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Unable to extract text</p>
          <p className="mt-1">{error.message}</p>
        </div>
      )}

      {file && previewUrl && !extractedText && !running && (
        <div className="card space-y-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
              <img
                src={previewUrl}
                alt="Upload preview"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
              </div>

              <div>
                <label className="field-label text-xs">Document Primary Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="field-input text-xs"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleOcr}
                  className="btn-primary gap-2 text-xs"
                >
                  <ScanText className="h-4 w-4" />
                  Extract Text (OCR)
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-secondary gap-2 text-xs"
                >
                  Choose Different Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Text View */}
      {extractedText && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Extracted Text</h3>
              {confidence !== null && (
                <p className="text-xs text-slate-500">
                  Recognition confidence: <span className="font-semibold text-emerald-600">{confidence}%</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="btn-primary gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download .txt
              </button>
            </div>
          </div>

          <textarea
            rows={12}
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            className="field-input font-mono text-xs leading-relaxed"
            placeholder="Extracted text will appear here..."
          />

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Scan Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
