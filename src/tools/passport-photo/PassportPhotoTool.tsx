'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, UserSquare, Printer } from 'lucide-react';
import { FileDropZone } from '@/components/common/FileDropZone';
import { ProgressPanel } from '@/components/common/ProgressPanel';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { useObjectUrls, useToolJob } from '@/hooks/useToolJob';
import { triggerDownload } from '@/lib/bytes';
import { decodeImage, bitmapSize } from '@/lib/imageClient';

interface CountryPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx: number; // At 300 DPI
  heightPx: number;
}

const PRESETS: CountryPreset[] = [
  { id: 'us', name: 'United States (2 × 2 in)', widthMm: 51, heightMm: 51, widthPx: 600, heightPx: 600 },
  { id: 'uk', name: 'United Kingdom (35 × 45 mm)', widthMm: 35, heightMm: 45, widthPx: 413, heightPx: 531 },
  { id: 'eu', name: 'Schengen / EU (35 × 45 mm)', widthMm: 35, heightMm: 45, widthPx: 413, heightPx: 531 },
  { id: 'in', name: 'India Passport (35 × 45 mm)', widthMm: 35, heightMm: 45, widthPx: 413, heightPx: 531 },
  { id: 'in-oci', name: 'India OCI / Visa (2 × 2 in)', widthMm: 51, heightMm: 51, widthPx: 600, heightPx: 600 },
  { id: 'ca', name: 'Canada (50 × 70 mm)', widthMm: 50, heightMm: 70, widthPx: 590, heightPx: 827 },
  { id: 'au', name: 'Australia (35 × 45 mm)', widthMm: 35, heightMm: 45, widthPx: 413, heightPx: 531 },
];

export function PassportPhotoTool() {
  const { run, cancel, running, progress, status, error } = useToolJob();
  const urls = useObjectUrls();

  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | HTMLImageElement | null>(null);
  const [preset, setPreset] = useState<CountryPreset>(PRESETS[0]);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const [singleUrl, setSingleUrl] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useAdFreeZone(running || singleUrl !== null);

  const handleFile = useCallback(async (incoming: File[]) => {
    const chosen = incoming[0];
    if (!chosen) return;
    setFile(chosen);
    try {
      const bmp = await decodeImage(chosen);
      setBitmap(bmp);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
      setSingleUrl(null);
      setSheetUrl(null);
    } catch (e) {
      console.error('Failed to decode portrait image:', e);
    }
  }, []);

  // Update preview canvas
  useEffect(() => {
    if (!bitmap || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    canvas.width = preset.widthPx;
    canvas.height = preset.heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw scaled & centered portrait
    const { width: bWidth, height: bHeight } = bitmapSize(bitmap);
    const scale = (Math.max(canvas.width / bWidth, canvas.height / bHeight)) * zoom;
    const w = bWidth * scale;
    const h = bHeight * scale;
    const x = (canvas.width - w) / 2 + offsetX;
    const y = (canvas.height - h) / 2 + offsetY;

    ctx.drawImage(bitmap, x, y, w, h);
  }, [bitmap, preset, bgColor, zoom, offsetX, offsetY]);

  const handleGenerate = async () => {
    if (!previewCanvasRef.current || !bitmap) return;
    urls.revokeAll();

    const res = await run(async (reporter) => {
      reporter.beginStage('Rendering 300 DPI single ID photo', 0.4);

      const singleBlob = await new Promise<Blob>((resolve) => {
        previewCanvasRef.current?.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      reporter.beginStage('Composing 4×6 inch multi-photo print sheet', 0.8);
      // 4x6 inch at 300 DPI = 1200 x 1800 px (or 1800 x 1200 landscape)
      const sheetCanvas = document.createElement('canvas');
      sheetCanvas.width = 1800;
      sheetCanvas.height = 1200;
      const sheetCtx = sheetCanvas.getContext('2d');
      if (!sheetCtx) throw new Error('Could not create sheet canvas');

      sheetCtx.fillStyle = '#ffffff';
      sheetCtx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

      // Tile photos with cutting margins
      const cols = Math.floor(sheetCanvas.width / (preset.widthPx + 40));
      const rows = Math.floor(sheetCanvas.height / (preset.heightPx + 40));
      const startX = (sheetCanvas.width - cols * (preset.widthPx + 40)) / 2 + 20;
      const startY = (sheetCanvas.height - rows * (preset.heightPx + 40)) / 2 + 20;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = startX + c * (preset.widthPx + 40);
          const py = startY + r * (preset.heightPx + 40);

          sheetCtx.drawImage(previewCanvasRef.current!, px, py, preset.widthPx, preset.heightPx);

          // Draw faint cut boundary lines
          sheetCtx.strokeStyle = '#e2e8f0';
          sheetCtx.lineWidth = 1;
          sheetCtx.strokeRect(px, py, preset.widthPx, preset.heightPx);
        }
      }

      const sheetBlob = await new Promise<Blob>((resolve) => {
        sheetCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      return {
        single: singleBlob,
        sheet: sheetBlob,
      };
    });

    if (res) {
      setSingleUrl(urls.create(res.single));
      setSheetUrl(urls.create(res.sheet));
    }
  };

  const handleReset = () => {
    urls.revokeAll();
    setFile(null);
    setBitmap(null);
    setSingleUrl(null);
    setSheetUrl(null);
  };

  return (
    <div className="space-y-6">
      {!file && (
        <FileDropZone
          onFiles={handleFile}
          accept="image/*"
          label="Drop portrait photo here to create passport photo"
          hint="Prepare passport-style photos using common US, UK, Schengen, and Indian size standards ready to print."
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
          <p className="font-semibold">Unable to generate passport photo</p>
          <p className="mt-1">{error.message}</p>
        </div>
      )}

      {file && !singleUrl && !running && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Settings Card */}
          <div className="card space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-semibold text-slate-900">Format & Biometric Settings</h2>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Change Photo
              </button>
            </div>

            <div>
              <label className="field-label text-xs">Standard Country Document Preset</label>
              <select
                value={preset.id}
                onChange={(e) => {
                  const p = PRESETS.find((x) => x.id === e.target.value);
                  if (p) setPreset(p);
                }}
                className="field-input text-xs"
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label text-xs">Background Color</label>
              <div className="flex gap-2">
                {[
                  { label: 'White', color: '#ffffff' },
                  { label: 'Off-White', color: '#f8fafc' },
                  { label: 'Light Blue', color: '#e0f2fe' },
                  { label: 'Light Grey', color: '#f1f5f9' },
                ].map((bg) => (
                  <button
                    key={bg.color}
                    type="button"
                    onClick={() => setBgColor(bg.color)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      bgColor === bg.color
                        ? 'border-brand-500 bg-brand-50 text-brand-900'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: bg.color }}
                      className="h-3.5 w-3.5 rounded-full border border-slate-300"
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">Fine Position Alignment</h3>

              <div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Zoom / Scale</span>
                  <span>{zoom.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Horizontal Offset</span>
                    <span>{offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    value={offsetX}
                    onChange={(e) => setOffsetX(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Vertical Offset</span>
                    <span>{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    value={offsetY}
                    onChange={(e) => setOffsetY(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="btn-primary gap-2"
              >
                <UserSquare className="h-4 w-4" />
                Generate Photos & Sheet
              </button>
            </div>
          </div>

          {/* Interactive Preview with Biometric Oval Guide */}
          <div className="card flex flex-col items-center justify-center p-6 text-center lg:col-span-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Biometric Guide ({preset.widthMm} × {preset.heightMm} mm)
            </h3>

            <div className="relative overflow-hidden rounded-xl border border-slate-300 shadow-md">
              <canvas
                ref={previewCanvasRef}
                style={{
                  maxHeight: '260px',
                  aspectRatio: `${preset.widthPx} / ${preset.heightPx}`,
                }}
                className="block max-w-full"
              />

              {/* Dotted biometric alignment oval */}
              <div
                style={{
                  left: '18%',
                  top: '12%',
                  width: '64%',
                  height: '76%',
                }}
                className="pointer-events-none absolute rounded-[50%] border-2 border-dashed border-brand-500/70"
              />
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Align chin with the bottom of the oval and crown of head inside the top edge.
            </p>
          </div>
        </div>
      )}

      {/* Result View */}
      {singleUrl && sheetUrl && (
        <div className="card space-y-6 text-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Passport Photos Ready!</h2>
            <p className="mt-1 text-sm text-slate-600">
              Download the single digital ID photo or the printable 4×6 inch multi-photo sheet.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Single 300 DPI ID Photo</h3>
              <div className="flex h-52 items-center justify-center">
                <img
                  src={singleUrl}
                  alt="Single Passport Photo"
                  className="max-h-full rounded-lg shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => triggerDownload(singleUrl, 'passport-photo.jpg')}
                className="btn-primary w-full justify-center gap-2 text-xs"
              >
                <Download className="h-4 w-4" />
                Download Single ID Photo
              </button>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Printable 4×6 Inch Sheet (Kiosk Ready)</h3>
              <div className="flex h-52 items-center justify-center">
                <img
                  src={sheetUrl}
                  alt="Printable Sheet"
                  className="max-h-full rounded-lg shadow-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => triggerDownload(sheetUrl, 'passport-photo-sheet-4x6.jpg')}
                className="btn-secondary w-full justify-center gap-2 text-xs"
              >
                <Printer className="h-4 w-4" />
                Download 4×6 Print Sheet
              </button>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
              Make Another Passport Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
