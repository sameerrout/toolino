import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { BRAND, COPYRIGHT_YEAR } from '@/lib/site';
import { getToolsByCategory } from '@/data/toolRegistry';
import { toolPath } from '@/lib/tools';
import { ConsentSettingsLink } from '@/components/consent/ConsentSettingsLink';

/**
 * Toolino Footer.
 *
 * Official Toolino deep blue theme (bg-blue-900 / border-blue-800),
 * comprehensive category columns, legal compliance links, and copyright text.
 */
export function Footer() {
  return (
    <footer className="bg-blue-900 text-white py-12 border-t border-blue-800 mt-16 font-sans">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-sm">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Tool<span className="text-blue-400">ino</span>
              </span>
            </div>
            <p className="text-blue-200 text-xs leading-relaxed">
              Free, fast, and privacy-conscious online tools. Convert, edit, and optimize PDFs,
              images, and files inside your browser without uploading to any servers.
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl bg-blue-950/60 border border-blue-700/60 px-3 py-2 text-xs text-blue-200">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Client-Side Privacy: Files are processed locally in your browser.</span>
            </div>
          </div>

          {/* PDF Tools */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm mb-3">
              <Link href="/tools/pdf-tools/" className="hover:text-blue-300 transition">
                PDF Tools
              </Link>
            </h3>
            <ul className="space-y-1.5 text-xs text-blue-200">
              {getToolsByCategory('pdf-tools').slice(0, 6).map((tool) => (
                <li key={tool.slug}>
                  <Link href={toolPath(tool.slug)} className="hover:text-white transition block">
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Image & File Tools */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm mb-3">
              <Link href="/tools/image-tools/" className="hover:text-blue-300 transition">
                Image &amp; Files
              </Link>
            </h3>
            <ul className="space-y-1.5 text-xs text-blue-200">
              <li>
                <Link href="/tools/create-zip/" className="hover:text-white transition block">
                  Create ZIP Archive
                </Link>
              </li>
              <li>
                <Link href="/tools/compress-image/" className="hover:text-white transition block">
                  Compress Image
                </Link>
              </li>
              <li>
                <Link href="/tools/resize-image/" className="hover:text-white transition block">
                  Resize Image
                </Link>
              </li>
              <li>
                <Link href="/tools/remove-background/" className="hover:text-white transition block">
                  Remove Background
                </Link>
              </li>
              <li>
                <Link href="/tools/convert-image/" className="hover:text-white transition block">
                  Convert Image
                </Link>
              </li>
              <li>
                <Link href="/tools/passport-photo/" className="hover:text-white transition block">
                  Passport Photo Maker
                </Link>
              </li>
            </ul>
          </div>

          {/* Calculators & Text Tools */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm mb-3">
              <Link href="/tools/calculators/" className="hover:text-blue-300 transition">
                Calculators &amp; Text
              </Link>
            </h3>
            <ul className="space-y-1.5 text-xs text-blue-200">
              <li>
                <Link href="/tools/emi-calculator/" className="hover:text-white transition block">
                  EMI Calculator
                </Link>
              </li>
              <li>
                <Link href="/tools/gst-calculator/" className="hover:text-white transition block">
                  GST Calculator
                </Link>
              </li>
              <li>
                <Link href="/tools/age-calculator/" className="hover:text-white transition block">
                  Age Calculator
                </Link>
              </li>
              <li>
                <Link href="/tools/percentage-calculator/" className="hover:text-white transition block">
                  Percentage Calculator
                </Link>
              </li>
              <li>
                <Link href="/tools/json-formatter/" className="hover:text-white transition block">
                  JSON Formatter
                </Link>
              </li>
              <li>
                <Link href="/tools/qr-code-generator/" className="hover:text-white transition block">
                  QR Code Generator
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links & Legal */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm mb-3">Company &amp; Legal</h3>
            <ul className="space-y-1.5 text-xs text-blue-200">
              <li>
                <Link href="/about/" className="hover:text-white transition block">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact/" className="hover:text-white transition block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/blog/" className="hover:text-white transition block">
                  Guides &amp; Articles
                </Link>
              </li>
              <li>
                <Link href="/privacy/" className="hover:text-white transition block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms/" className="hover:text-white transition block">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies/" className="hover:text-white transition block">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer/" className="hover:text-white transition block">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Cookie settings & bottom */}
        <div className="mt-10 pt-6 border-t border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-300">
          <p>© {COPYRIGHT_YEAR} {BRAND.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <ConsentSettingsLink className="text-blue-300 hover:text-white transition underline" />
            <span>•</span>
            <span className="text-blue-400">All file processing happens locally.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
