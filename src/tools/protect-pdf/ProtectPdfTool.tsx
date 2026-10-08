'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, FileText, Lock, ShieldCheck, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { FileDropZone } from '@/components/common/FileDropZone';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob, useDeviceProfile } from '@/hooks/useToolJob';
import { resolveLimits } from '@/lib/limits';
import { validateFiles } from '@/lib/validation';
import { triggerDownload } from '@/lib/bytes';
import { formatBytes } from '@/lib/format';
import { countPdfPages, loadPdf } from '@/lib/pdf';

export function ProtectPdfTool() {
  const profile = useDeviceProfile();
  const limits = useMemo(() => resolveLimits('protect-pdf', profile), [profile]);
  const { run, cancel, running, progress, status, error } = useToolJob();
  const urls = useObjectUrls();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);

  // Security options
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [algorithm, setAlgorithm] = useState<'AES-256' | 'RC4'>('AES-256');
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);

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

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleProtect = async () => {
    if (!file) return;
    setValidationError(null);
    if (!password) {
      setValidationError('Please enter a password.');
      return;
    }
    if (password.length < 4) {
      setValidationError('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match. Please re-enter.');
      return;
    }

    urls.revokeAll();
    setResultBlob(null);
    setResultUrl(null);

    const res = await run(async (reporter) => {
      reporter.beginStage('Loading document', 0.2);
      const buffer = await file.arrayBuffer();
      const doc = await loadPdf(buffer, file.name);

      reporter.beginStage('Normalizing PDF structure', 0.4);
      doc.setProducer('ToolForForever Security Engine');
      doc.setCreator('ToolForForever');
      const normalizedBytes = await doc.save();

      reporter.beginStage(`Applying ${algorithm} encryption in browser`, 0.85);
      const encryptedBytes = await encryptPDF(normalizedBytes, password, {
        ownerPassword: password,
        algorithm,
        allowPrinting,
        allowCopying,
        allowModifying: false,
        allowAnnotating: true,
      });

      reporter.beginStage('Generating secure document', 0.95);
      return new Blob([new Uint8Array(encryptedBytes)], { type: 'application/pdf' });
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
    setPassword('');
    setConfirmPassword('');
    setValidationError(null);
    setResultBlob(null);
    setResultUrl(null);
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropZone
          onFiles={handleFile}
          accept="application/pdf"
          label="Drop PDF document here to protect"
          hint="Password-protect your PDF locally in your browser using standard PDF encryption."
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
          <p className="font-semibold">Unable to encrypt document</p>
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
                  {formatBytes(file.size)}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label text-xs">Set Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field-input pr-10 text-sm"
                  placeholder="At least 4 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="field-label text-xs">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field-input text-sm"
                placeholder="Re-type password"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
            <div>
              <label className="field-label text-xs">Encryption Standard</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as 'AES-256' | 'RC4')}
                className="field-input text-xs"
              >
                <option value="AES-256">AES-256 (High Security, Modern Readers)</option>
                <option value="RC4">RC4 128-bit (Legacy Compatibility)</option>
              </select>
            </div>

            <div className="space-y-2 pt-4 sm:pt-0">
              <label className="field-label text-xs">Permissions</label>
              <div className="flex gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={(e) => setAllowPrinting(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Allow Printing
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(e) => setAllowCopying(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Allow Text Copying
                </label>
              </div>
            </div>
          </div>

          {validationError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
              {validationError}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleProtect}
              className="btn-primary gap-2"
            >
              <Lock className="h-4 w-4" />
              Encrypt & Protect PDF
            </button>
          </div>
        </div>
      )}

      {/* Result Card */}
      {resultBlob && resultUrl && file && (
        <div className="card space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">PDF Protected Successfully!</h2>
            <p className="mt-1 text-sm text-slate-600">
              Encrypted with {algorithm}. The document now requires the password to open.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => triggerDownload(resultUrl, `${file.name.replace(/\.pdf$/i, '')}-protected.pdf`)}
              className="btn-primary gap-2"
            >
              <Download className="h-4 w-4" />
              Download Protected PDF
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Protect Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
