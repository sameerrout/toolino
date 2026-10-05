'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Link2,
  FileText,
  Wifi,
  Mail,
  Phone,
  MessageSquare,
  Contact,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { useAdFreeZone } from '@/components/ads/AdSlot';
import { SITE_URL } from '@/lib/site';

type QrType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard';

export function QrCodeGeneratorTool() {
  const [qrType, setQrType] = useState<QrType>('url');

  // Input states
  const [url, setUrl] = useState(SITE_URL);
  const [plainText, setPlainText] = useState('Hello from Toolnova!');
  const [ssid, setSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiAuth, setWifiAuth] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [phoneNum, setPhoneNum] = useState('');
  const [smsNum, setSmsNum] = useState('');
  const [smsMsg, setSmsMsg] = useState('');
  const [vcardName, setVcardName] = useState('');
  const [vcardPhone, setVcardPhone] = useState('');
  const [vcardEmail, setVcardEmail] = useState('');
  const [vcardOrg, setVcardOrg] = useState('');

  // Styling states
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [size, setSize] = useState(384);

  const [svgString, setSvgString] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useAdFreeZone(true);

  // Compute standard payload string
  const payload = (() => {
    switch (qrType) {
      case 'url':
        return url.trim() || SITE_URL;
      case 'text':
        return plainText || ' ';
      case 'wifi':
        return `WIFI:T:${wifiAuth};S:${ssid};P:${wifiPass};;`;
      case 'email':
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      case 'phone':
        return `tel:${phoneNum.replace(/\s+/g, '')}`;
      case 'sms':
        return `smsto:${smsNum}:${smsMsg}`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nFN:${vcardName}\nORG:${vcardOrg}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
      default:
        return SITE_URL;
    }
  })();

  // Render QR code
  useEffect(() => {
    let active = true;

    async function generate() {
      try {
        const data = await QRCode.toDataURL(payload, {
          width: size,
          margin: 2,
          color: { dark: fgColor, light: bgColor },
          errorCorrectionLevel: errorLevel,
        });
        if (active) setDataUrl(data);

        const svg = await QRCode.toString(payload, {
          type: 'svg',
          width: size,
          margin: 2,
          color: { dark: fgColor, light: bgColor },
          errorCorrectionLevel: errorLevel,
        });
        if (active) setSvgString(svg);
      } catch (err) {
        console.error('QR code generation error:', err);
      }
    }

    generate();
    return () => {
      active = false;
    };
  }, [payload, size, fgColor, bgColor, errorLevel]);

  const handleDownloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    a.click();
  };

  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'qrcode.svg';
    a.click();
    URL.revokeObjectURL(u);
  };

  const handleCopy = async () => {
    if (!dataUrl) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy payload text
      navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'url', label: 'Website URL', icon: Link2 },
          { id: 'text', label: 'Plain Text', icon: FileText },
          { id: 'wifi', label: 'Wi-Fi Network', icon: Wifi },
          { id: 'email', label: 'Email', icon: Mail },
          { id: 'phone', label: 'Phone', icon: Phone },
          { id: 'sms', label: 'SMS', icon: MessageSquare },
          { id: 'vcard', label: 'Contact (vCard)', icon: Contact },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = qrType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQrType(tab.id as QrType)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Inputs & Styles */}
        <div className="card space-y-5 lg:col-span-7">
          <h2 className="text-base font-semibold text-slate-900">QR Code Content</h2>

          {qrType === 'url' && (
            <div>
              <label className="field-label">Website URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="field-input"
                placeholder="https://example.com"
              />
            </div>
          )}

          {qrType === 'text' && (
            <div>
              <label className="field-label">Text Content</label>
              <textarea
                rows={4}
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                className="field-input"
                placeholder="Enter any text message..."
              />
            </div>
          )}

          {qrType === 'wifi' && (
            <div className="space-y-4">
              <div>
                <label className="field-label">Network Name (SSID)</label>
                <input
                  type="text"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  className="field-input"
                  placeholder="MyHomeWifi"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Password</label>
                  <input
                    type="text"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    className="field-input"
                    placeholder="Wireless password"
                  />
                </div>
                <div>
                  <label className="field-label">Encryption</label>
                  <select
                    value={wifiAuth}
                    onChange={(e) => setWifiAuth(e.target.value as 'WPA' | 'WEP' | 'nopass')}
                    className="field-input"
                  >
                    <option value="WPA">WPA/WPA2/WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None (Open)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {qrType === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="field-label">Recipient Email</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="field-input"
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <label className="field-label">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="field-input"
                  placeholder="Inquiry"
                />
              </div>
              <div>
                <label className="field-label">Message Body</label>
                <textarea
                  rows={3}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="field-input"
                  placeholder="Hello..."
                />
              </div>
            </div>
          )}

          {qrType === 'phone' && (
            <div>
              <label className="field-label">Phone Number</label>
              <input
                type="tel"
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
                className="field-input"
                placeholder="+1 234 567 8900"
              />
            </div>
          )}

          {qrType === 'sms' && (
            <div className="space-y-4">
              <div>
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  value={smsNum}
                  onChange={(e) => setSmsNum(e.target.value)}
                  className="field-input"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="field-label">SMS Message</label>
                <textarea
                  rows={3}
                  value={smsMsg}
                  onChange={(e) => setSmsMsg(e.target.value)}
                  className="field-input"
                  placeholder="Type message text..."
                />
              </div>
            </div>
          )}

          {qrType === 'vcard' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="field-label">Full Name</label>
                <input
                  type="text"
                  value={vcardName}
                  onChange={(e) => setVcardName(e.target.value)}
                  className="field-input"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input
                  type="tel"
                  value={vcardPhone}
                  onChange={(e) => setVcardPhone(e.target.value)}
                  className="field-input"
                  placeholder="+1 555 0199"
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={vcardEmail}
                  onChange={(e) => setVcardEmail(e.target.value)}
                  className="field-input"
                  placeholder="jane@example.com"
                />
              </div>
              <div className="col-span-2">
                <label className="field-label">Company / Organization</label>
                <input
                  type="text"
                  value={vcardOrg}
                  onChange={(e) => setVcardOrg(e.target.value)}
                  className="field-input"
                  placeholder="Acme Corp"
                />
              </div>
            </div>
          )}

          <hr className="border-slate-200" />

          {/* Color & Size Controls */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Custom Colors & Error Correction</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="field-label text-xs">Foreground</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <span className="font-mono text-xs">{fgColor}</span>
                </div>
              </div>
              <div>
                <label className="field-label text-xs">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200"
                  />
                  <span className="font-mono text-xs">{bgColor}</span>
                </div>
              </div>
              <div>
                <label className="field-label text-xs">Fault Tolerance</label>
                <select
                  value={errorLevel}
                  onChange={(e) => setErrorLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                  className="field-input text-xs"
                >
                  <option value="L">L (7% recovery)</option>
                  <option value="M">M (15% recovery)</option>
                  <option value="Q">Q (25% recovery)</option>
                  <option value="H">H (30% recovery)</option>
                </select>
              </div>
              <div>
                <label className="field-label text-xs">Export Size</label>
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="field-input text-xs"
                >
                  <option value={256}>256 x 256 px</option>
                  <option value={384}>384 x 384 px</option>
                  <option value={512}>512 x 512 px</option>
                  <option value={1024}>1024 x 1024 px</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Preview */}
        <div className="card flex flex-col items-center justify-center space-y-6 text-center lg:col-span-5">
          <h2 className="text-base font-semibold text-slate-900">Live Scannable Preview</h2>

          <div
            className="flex items-center justify-center rounded-3xl border border-slate-200 p-6 shadow-inner"
            style={{ backgroundColor: bgColor }}
          >
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Generated QR Code"
                className="h-64 w-64 max-w-full rounded-xl object-contain shadow-sm"
              />
            ) : (
              <div className="h-64 w-64 animate-pulse rounded-xl bg-slate-100" />
            )}
          </div>

          <p className="text-xs text-slate-500">
            Scan directly from your screen with your smartphone camera to test.
          </p>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="btn-primary flex-1 justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="btn-secondary flex-1 justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download SVG
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied to clipboard!' : 'Copy image to clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
