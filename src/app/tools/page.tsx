import Link from 'next/link';
import type { Metadata } from 'next';

import { Container } from '@/components/common/Container';
import { ToolCard } from '@/components/common/ToolCard';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { AdSlot } from '@/components/ads/AdSlot';
import { AD_SLOTS } from '@/components/tools/ToolPage';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { BRAND } from '@/lib/site';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { TOOL_REGISTRY } from '@/data/toolRegistry';

export const metadata: Metadata = buildMetadata({
  title: `All Free Online Tools — ${TOOL_REGISTRY.length} Browser-Based Utilities`,
  description:
    'Every ToolForForever tool in one place: PDF editing, image compression, ZIP archives, OCR, background removal, text utilities and calculators. All free and none of them upload your files.',
  path: '/tools/',
  keywords: ['all online tools', 'free file tools', 'browser tools list', 'pdf and image tools'],
});

const breadcrumbs = [{ name: 'Home', path: '/' }, { name: 'Tools' }];

/**
 * The all-tools index.
 *
 * A Server Component with no client JavaScript: the grid is static HTML and the
 * anchors are real links, which is what makes it useful for crawl depth as well
 * as for people.
 */
export default function ToolsIndexPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({
            path: '/tools/',
            name: `All ${BRAND.name} tools`,
            description: `${TOOL_REGISTRY.length} free browser-based tools that never upload your files.`,
          }),
          breadcrumbSchema(breadcrumbs),
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-5 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            All {TOOL_REGISTRY.length} tools
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Every tool on {BRAND.name} runs inside your browser. Choose one below, or pick a category
            if you know roughly what you need. None of them require an account, and none of them
            upload your files.
          </p>
        </div>

        <nav aria-label="Categories" className="mt-8">
          <ul className="flex flex-wrap gap-2">
            {CATEGORY_ORDER.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/tools/${slug}/`}
                  className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
                >
                  {CATEGORY_META[slug].navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <Container>
        <AdSlot slot={AD_SLOTS.hubTop} format="horizontal" />
      </Container>

      {CATEGORY_ORDER.map((categorySlug) => {
        const meta = CATEGORY_META[categorySlug];
        const tools = TOOL_REGISTRY.filter((tool) => tool.category === categorySlug);
        return (
          <Container key={categorySlug} className="py-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                <Link href={`/tools/${categorySlug}/`} className="hover:text-brand-800">
                  {meta.title}
                </Link>
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{meta.intro}</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <li key={tool.slug}>
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
          </Container>
        );
      })}

      <Container className="py-12">
        <div className="prose-toolforforever max-w-3xl">
          <h2>How to choose the right tool</h2>
          <p>
            If your goal is to make a file smaller, start with what the file actually is. A PDF that
            is mostly scanned images shrinks dramatically when you re-encode those images; a PDF of
            typed text has almost nothing to remove, so compressing it will change very little. A
            photo should be compressed as an image, not as a document. A folder of mixed files is best
            packed into a single archive, which is what the ZIP tool does.
          </p>
          <p>
            If your goal is to change a format, use the converter for that file family rather than
            taking a detour through something else. Converting a PDF to an image and back to a PDF
            throws away the text layer permanently, so only do it when you specifically want a
            picture of a page, for example to paste it into a slide.
          </p>
          <p>
            If your goal is to combine or reorganise, look at the PDF category. Merging, splitting,
            rotating and reordering are all lossless operations: they rearrange the existing page
            objects without re-encoding anything, so there is no quality cost at all. Watermarking
            and page numbering also keep the original page content untouched and simply draw on top of
            it.
          </p>
          <p>
            For anything involving text, the word counter gives you live statistics as you type or
            paste, and the OCR tool reads text out of a photograph or screenshot. Both keep your text
            on your own machine, which matters if you are working on something unpublished or
            confidential.
          </p>
        </div>
      </Container>
    </>
  );
}
