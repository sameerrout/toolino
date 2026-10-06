import Link from 'next/link';
import type { Metadata } from 'next';

import { Container } from '@/components/common/Container';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { AdSlot } from '@/components/ads/AdSlot';
import { AD_SLOTS } from '@/components/tools/ToolPage';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { formatDate } from '@/lib/format';
import { BRAND } from '@/lib/site';
import { getPostsByDate } from '@/content/blog';

export const metadata: Metadata = buildMetadata({
  title: 'Guides — Practical Advice on Files, PDFs and Images',
  description:
    'Original, practical guides on merging PDFs privately, compressing images for the web, creating ZIP files on any device, and what file metadata actually reveals.',
  path: '/blog/',
  keywords: ['file format guides', 'pdf guides', 'image compression guide', 'privacy guides'],
});

const breadcrumbs = [{ name: 'Home', path: '/' }, { name: 'Guides' }];

/** Blog index. Server Component: no client JavaScript at all. */
export default function BlogIndexPage() {
  const posts = getPostsByDate();

  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({
            path: '/blog/',
            name: `${BRAND.name} guides`,
            description:
              'Practical, original guides about file formats, compression, archiving and file privacy.',
          }),
          breadcrumbSchema(breadcrumbs),
          {
            '@type': 'Blog',
            name: `${BRAND.name} guides`,
            description:
              'Practical guides about file formats, compression and privacy, written for people who want to understand the trade-offs rather than just click a button.',
            url: `${BRAND.name} /blog/`,
            blogPost: posts.map((post) => ({
              '@type': 'BlogPosting',
              headline: post.headline,
              description: post.description,
              datePublished: post.publishedAt,
            })),
          },
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-5 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Guides</h1>
          <p className="mt-4 text-lg text-slate-600">
            Longer pieces about the things our tools do, written to explain the trade-offs rather than
            to sell you something. Every guide is original and specific to the tools on this site.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            {posts.length} articles · no newsletter, no pop-ups, no reading-time padding
          </p>
        </div>
      </Container>

      <Container>
        <AdSlot slot={AD_SLOTS.hubTop} format="horizontal" />
      </Container>

      <Container className="py-10">
        <ul className="grid gap-5 sm:grid-cols-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                  {post.category}
                </p>
                <h2 className="mt-2 text-lg font-semibold leading-snug text-slate-900">
                  <Link href={`/blog/${post.slug}/`} className="hover:text-brand-800">
                    {post.headline}
                  </Link>
                </h2>
                <p className="mt-2 flex-1 text-sm text-slate-600">{post.excerpt}</p>
                <p className="mt-4 text-xs text-slate-500">
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> ·{' '}
                  {post.readingMinutes} min read
                </p>
              </article>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="pb-14">
        <div className="prose-toolino max-w-3xl">
          <h2>What these guides are for</h2>
          <p>
            Most &ldquo;how to&rdquo; articles about file formats are written to rank rather than to
            help, and they rarely tell you the part that matters: when the obvious approach is the
            wrong one. These guides try to do the opposite. Where a format has a real limitation, it
            is stated. Where a technique only works in some situations, that is explained rather than
            glossed over.
          </p>
          <p>
            They are also written to be useful independently of the tools. If you read the guide on
            compressing images and decide to use desktop software instead, the guidance about format
            choice and target file size still applies, because it is about how the formats work
            rather than about this particular website.
          </p>
        </div>
      </Container>
    </>
  );
}
