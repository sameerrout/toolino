import Link from 'next/link';
import type { Metadata } from 'next';
import { Home, Search, FileText, Image as ImageIcon, Calculator, FolderArchive } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { TOOL_REGISTRY } from '@/data/toolRegistry';
import { toolPath, type ToolSlug } from '@/lib/tools';

export const metadata: Metadata = buildMetadata({
  title: 'Page Not Found — Try One of Our Free Tools Instead',
  description:
    'That page does not exist. Browse Toolino\u2019s free browser-based PDF, image, file, text and calculator tools instead, all of which run without uploading your files.',
  path: '/404/',
  noIndex: true,
});

/** Popular destinations, so a 404 is never a dead end. */
const SUGGESTED: ToolSlug[] = [
  'create-zip',
  'merge-pdf',
  'compress-image',
  'image-to-pdf',
  'word-counter',
  'age-calculator',
];

const HUB_ICONS = {
  'file-tools': FolderArchive,
  'pdf-tools': FileText,
  'image-tools': ImageIcon,
  'text-tools': Search,
  calculators: Calculator,
} as const;

/**
 * Custom 404.
 *
 * S3 + CloudFront serves this for any unmatched key via the distribution's
 * custom error response (see `deploy/cloudfront/README.md`). It is `noIndex`,
 * offers real navigation, and never shows an ad: ad code on an error page is an
 * AdSense policy violation.
 */
export default function NotFound() {
  const suggested = SUGGESTED.map((slug) => TOOL_REGISTRY.find((tool) => tool.slug === slug)).filter(
    (tool): tool is (typeof TOOL_REGISTRY)[number] => Boolean(tool)
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-4 text-base text-slate-600">
        The link may be broken, or the page may have been renamed or removed. Some tools were
        retired during a recent rebuild, and their old addresses now redirect to the relevant
        category.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">
          <Home aria-hidden="true" className="h-4 w-4" />
          Back to the homepage
        </Link>
        <Link href="/tools/" className="btn-secondary">
          Browse all tools
        </Link>
      </div>

      <h2 className="mt-12 text-lg font-semibold text-slate-900">Popular tools</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {suggested.map((tool) => {
          const Icon = HUB_ICONS[tool.category];
          return (
            <li key={tool.slug}>
              <Link
                href={toolPath(tool.slug)}
                className="flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{tool.name}</span>
                  <span className="mt-1 block text-xs text-slate-600">{tool.tagline}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-sm text-slate-600">
        Still stuck?{' '}
        <Link href="/contact/" className="font-medium text-brand-700 underline">
          Tell us which page you were looking for
        </Link>{' '}
        and we will point you in the right direction.
      </p>
    </div>
  );
}
