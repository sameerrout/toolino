import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ShieldCheck, Zap, Lock, Sparkles, Search } from 'lucide-react';
import { TOOL_REGISTRY, type ToolRegistryEntry } from '@/data/toolRegistry';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { toolPath } from '@/lib/tools';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/seo/JsonLd';
import { websiteSchema, organizationSchema } from '@/lib/seo/schema';
import { BRAND } from '@/lib/site';

/**
 * Toolino Homepage (Server Component).
 *
 * Official Toolino visual design:
 * - Animated wave hero section with blue gradient
 * - Signature Toolino search bar
 * - Original card styling with emoji badges, hover lift, and blue accents
 * - Full categorized tools directory
 * - "Why Choose Toolino" value propositions
 *
 * Kept as a Server Component to ensure zero unnecessary JavaScript overhead
 * and lightning-fast LCP (< 1.5s).
 */
export const metadata: Metadata = buildMetadata({
  title: `${BRAND.name} - All-in-One Free Online Tools`,
  description:
    'Free, fast, and privacy-conscious online tools. Convert, edit, and optimize PDFs, images, files, and calculators easily inside your browser without uploading files to servers.',
  path: '/',
  keywords: [
    'free online tools',
    'Toolino',
    'browser based tools',
    'create zip online',
    'merge pdf free',
    'compress image',
    'client side pdf tools',
  ],
});

// Signature Toolino tool icon mapping
const TOOL_ICONS: Record<string, string> = {
  'create-zip': '📦',
  'extract-zip': '📂',
  'merge-pdf': '📑',
  'split-pdf': '✂️',
  'rotate-pdf': '🔄',
  'watermark-pdf': '💧',
  'pdf-page-numbers': '🔢',
  'organize-pdf': '📋',
  'compress-pdf': '🗜️',
  'pdf-to-image': '📸',
  'image-to-pdf': '🖼️',
  'protect-pdf': '🔒',
  'compress-image': '🗜️',
  'resize-image': '📐',
  'convert-image': '🔄',
  'remove-background': '🪄',
  'image-to-text': '📝',
  'passport-photo': '👤',
  'word-counter': '📊',
  'json-formatter': '⚡',
  'qr-code-generator': '🔳',
  'age-calculator': '🎂',
  'percentage-calculator': '％',
  'discount-calculator': '🏷️',
  'emi-calculator': '🏦',
  'gst-calculator': '🧾',
};

export default function HomePage() {
  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <JsonLd nodes={[websiteSchema(), organizationSchema()]} />

      {/* Hero Section with animated gradient and clean presentation */}
      <section className="relative text-white py-20 sm:py-28 overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700">
        {/* Background wave SVG */}
        <div className="absolute bottom-0 left-0 w-full opacity-20 pointer-events-none">
          <svg viewBox="0 0 1440 320" className="w-full h-auto" preserveAspectRatio="none">
            <path
              fill="#ffffff"
              fillOpacity="0.3"
              d="M0,224L80,218.7C160,213,320,203,480,192C640,181,800,171,960,186.7C1120,203,1280,245,1360,266.7L1440,288L1440,320L0,320Z"
            />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto text-center px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-blue-100 mb-6 border border-white/20 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            <span>Private In-Browser Processing — No Server File Uploads</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 tracking-tight drop-shadow-xs">
            All-in-One Free Online Tools
          </h1>

          <p className="mb-10 text-base sm:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Choose from browser-based tools and fast client-side utilities. Toolino runs everything
            privately inside your browser without uploading files to servers.
          </p>

          {/* Search bar */}
          <form action="/tools/" method="GET" className="flex justify-center max-w-2xl mx-auto">
            <div className="flex w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-1 border border-white/40 transition-all focus-within:ring-4 focus-within:ring-blue-400/40">
              <input
                type="text"
                name="q"
                className="w-full px-5 py-3.5 text-gray-700 focus:outline-hidden text-sm sm:text-base placeholder-gray-400"
                placeholder="Search tools (e.g. Create ZIP, Merge PDF, Compress Image)..."
              />
              <button
                type="submit"
                className="bg-blue-600 px-6 sm:px-8 py-3 text-white font-semibold rounded-xl hover:bg-blue-700 transition cursor-pointer text-sm sm:text-base shadow-xs shrink-0 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Main Tools Catalog Section */}
      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                Explore Our Tools
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select any of our {TOOL_REGISTRY.length} available high-performance client tools
              </p>
            </div>
            <Link
              href="/tools/"
              className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>View All Categories</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Tool Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {TOOL_REGISTRY.map((tool: ToolRegistryEntry) => (
              <Link key={tool.slug} href={toolPath(tool.slug)} className="group block">
                <div className="h-full bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer">
                  <div>
                    <div className="mb-4">
                      <div className="inline-block text-3xl p-2.5 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition">
                        {TOOL_ICONS[tool.slug] || '📄'}
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2">
                      {tool.tagline}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                    <span>Use Tool</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Category Highlights */}
      <section className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tools by Category
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Browse dedicated category hubs designed for everyday digital workflows
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CATEGORY_ORDER.map((catKey) => {
              const meta = CATEGORY_META[catKey];
              const count = TOOL_REGISTRY.filter((t) => t.category === catKey).length;
              return (
                <Link
                  key={catKey}
                  href={`/tools/${catKey}/`}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition text-center space-y-2 group"
                >
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                    {meta.navLabel}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {meta.intro}
                  </p>
                  <span className="inline-block text-xs font-semibold text-blue-600">
                    {count} tools →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Toolino Section */}
      <section className="py-16 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Why Users Choose Toolino
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              Engineered with a client-first philosophy so your sensitive documents stay private.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-blue-100 text-blue-600">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Zero Server File Uploads</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                All image compression, PDF operations, and conversions run locally inside your
                browser. Files never reach remote servers. Practical limits depend on your device memory.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-blue-100 text-blue-600">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Ultra-Fast Execution</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                By removing upload and download bottlenecks, files process directly with your device's
                hardware at maximum local disk and CPU speeds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-blue-100 text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Free to Use</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No subscription paywalls, no mandatory registrations, and no artificial daily caps. Simply
                open the tool you need and complete your work privately.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
