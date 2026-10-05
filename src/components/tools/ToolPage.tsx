import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

import { Container } from '@/components/common/Container';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { AdSlot } from '@/components/ads/AdSlot';
import { ToolCard } from '@/components/common/ToolCard';
import { ToolContentSections } from '@/components/tools/ToolContentSections';
import { TrackToolUsage } from '@/components/tools/TrackToolUsage';

import { buildMetadata } from '@/lib/seo/metadata';
import {
  breadcrumbSchema,
  faqSchema,
  howToSchema,
  softwareApplicationSchema,
  webPageSchema,
} from '@/lib/seo/schema';
import { toolPath } from '@/lib/tools';
import { CATEGORY_META } from '@/data/categories';
import { getRelatedTools, requireTool, type ToolRegistryEntry } from '@/data/toolRegistry';
import type { ToolContent } from '@/content/types';
import type { ToolSlug } from '@/lib/tools';

/**
 * Shared page chrome for every tool.
 *
 * Sections, in order:
 *   1. breadcrumbs + one <h1> + tagline + privacy badge
 *   2. the interactive tool (the only Client Component on the page)
 *   3. one ad slot, below the tool, never on top of it
 *   4. 400-600 words of unique prose, an FAQ block and related tools
 *
 * The ad sits *after* the tool and *before* the prose, so content is always more
 * prominent than advertising, which the AdSense policies require. Tool pages
 * never render an ad while a job is running because the tool component raises an
 * ad-free zone.
 */
export function ToolPage({
  slug,
  content,
  children,
}: {
  slug: ToolSlug;
  content: ToolContent;
  children: React.ReactNode;
}) {
  const tool = requireTool(slug);
  const related = getRelatedTools(slug, 4);
  const category = CATEGORY_META[tool.category];

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Tools', path: '/tools/' },
    { name: category.navLabel, path: `/tools/${tool.category}/` },
    { name: tool.name },
  ];

  return (
    <>
      <TrackToolUsage slug={slug} />
      <JsonLd
        nodes={[
          webPageSchema({
            path: toolPath(slug),
            name: tool.metaTitle,
            description: tool.metaDescription,
          }),
          softwareApplicationSchema(tool),
          breadcrumbSchema(breadcrumbs),
          howToSchema({
            name: content.howTo.heading,
            description: content.howTo.intro,
            steps: content.howTo.steps.map((step) => ({ name: step.name, text: step.text })),
            tool: [`${tool.name} on ${'Toolnova'}`],
          }),
          faqSchema(content.faqs),
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-5 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            {category.navLabel}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {tool.name}
          </h1>
          <p className="mt-3 text-lg text-slate-600">{tool.tagline}</p>

          <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{tool.privacyNote}</span>
          </p>
        </div>

        <div className="mt-8">{children}</div>

        {/* One unit, positioned after the tool and before the long-form content. */}
        <AdSlot slot={AD_SLOTS.afterTool} format="horizontal" />

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ToolContentSections content={content} />

          <aside aria-label="Related tools" className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-base font-semibold text-slate-900">Related tools</h2>
            <ul className="mt-4 space-y-3">
              {related.map((relatedTool) => (
                <li key={relatedTool.slug}>
                  <Link
                    href={toolPath(relatedTool.slug)}
                    className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
                  >
                    <ArrowRight
                      aria-hidden="true"
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {relatedTool.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {relatedTool.tagline}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Browse all tools</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {Object.values(CATEGORY_META).map((meta) => (
                  <li key={meta.slug}>
                    <Link
                      href={`/tools/${meta.slug}/`}
                      className="text-slate-600 transition hover:text-brand-700"
                    >
                      {meta.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}

/** AdSense slot ids, kept in one place so they are easy to swap after approval. */
export const AD_SLOTS = {
  afterTool: '1234567890',
  inArticle: '2345678901',
  hubTop: '3456789012',
} as const;

/** Builds the Next.js metadata for a tool page from the registry entry. */
export function toolMetadata(tool: ToolRegistryEntry): Metadata {
  return buildMetadata({
    title: tool.metaTitle,
    description: tool.metaDescription,
    path: toolPath(tool.slug),
    keywords: [tool.keyword, ...tool.secondaryKeywords],
  });
}

/** Re-exported so tool pages can render a card grid without a second import. */
export { ToolCard };
