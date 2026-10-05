import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { ToolPage, toolMetadata } from '@/components/tools/ToolPage';
import { CategoryHubPage } from '@/components/tools/CategoryHubPage';
import { TOOL_COMPONENTS } from '@/data/toolComponents';
import { TOOL_CONTENT } from '@/data/toolContent';
import { getTool } from '@/data/toolRegistry';
import { CATEGORY_META, CATEGORY_ORDER } from '@/data/categories';
import { isCategorySlug, isToolSlug, TOOL_SLUGS } from '@/lib/tools';
import { BRAND, SITE_URL } from '@/lib/site';

/**
 * `/tools/<slug>/`
 *
 * One route serves both kinds of page under `/tools/`:
 *   - `/tools/merge-pdf/`  a tool page
 *   - `/tools/pdf-tools/`  a category hub
 *
 * They can safely share a segment because a slug is either a tool or a category
 * and never both; `tests/seo/registry.test.ts` asserts that invariant. Keeping
 * one route means one place to change layout, breadcrumbs and structured data.
 *
 * The interactive part of each tool is a Client Component, but this file is a
 * Server Component, so the prose, metadata and JSON-LD are all in the static
 * HTML and cost no client JavaScript.
 */

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-renders every tool and category page at build time into `out/`.
 * `dynamicParams = false` means anything not in the list is a real 404 rather
 * than an empty page generated on demand - which static export cannot do anyway.
 */
export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return [...TOOL_SLUGS, ...CATEGORY_ORDER].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;

  if (isToolSlug(slug)) {
    const tool = getTool(slug);
    if (tool) return toolMetadata(tool);
  }

  if (isCategorySlug(slug)) {
    const meta = CATEGORY_META[slug];
    return {
      title: meta.metaTitle,
      description: meta.metaDescription,
      alternates: { canonical: `${SITE_URL}/tools/${slug}/` },
      openGraph: {
        title: meta.metaTitle,
        description: meta.metaDescription,
        siteName: BRAND.name,
        type: 'website',
      },
    };
  }

  return {};
}

export default async function ToolsSlugPage({ params }: RouteParams) {
  const { slug } = await params;

  // ---- Category hub ------------------------------------------------------
  if (isCategorySlug(slug)) {
    return <CategoryHubPage category={slug} />;
  }

  // ---- Tool page ---------------------------------------------------------
  if (!isToolSlug(slug)) notFound();

  const tool = getTool(slug);
  const Tool = TOOL_COMPONENTS[slug];
  const content = TOOL_CONTENT[slug];

  if (!tool || !Tool || !content) notFound();

  return (
    <ToolPage slug={slug} content={content}>
      <Tool />
    </ToolPage>
  );
}
