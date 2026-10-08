import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { Container } from '@/components/common/Container';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { AdSlot } from '@/components/ads/AdSlot';
import { AD_SLOTS } from '@/components/tools/ToolPage';
import { buildMetadata } from '@/lib/seo/metadata';
import { articleSchema, breadcrumbSchema, webPageSchema } from '@/lib/seo/schema';
import { formatDate, toIsoDate } from '@/lib/format';
import { BRAND } from '@/lib/site';
import { getPost, getRelatedPosts, BLOG_POSTS } from '@/content/blog';
import { BLOG_ARTICLE_BODIES } from '@/content/blog/index';
import { getTool } from '@/data/toolRegistry';
import { isToolSlug, toolPath } from '@/lib/tools';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}/`,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt ?? post.publishedAt,
    keywords: [post.category.toLowerCase(), 'guide', BRAND.name.toLowerCase()],
  });
}

/**
 * Blog article page.
 *
 * Two-thirds measure for readability with a sticky sidebar for the related
 * tools, so every article feeds internal links back into the tool pages that it
 * is about. The ad sits between the article body and the related-tools block.
 */
export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params;
  const post = getPost(slug);
  const Article = BLOG_ARTICLE_BODIES[slug];

  if (!post || !Article) notFound();

  const related = getRelatedPosts(slug);
  const tools = post.relatedTools
    .filter(isToolSlug)
    .map((toolSlug) => getTool(toolSlug))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/blog/' },
    { name: post.category, path: '/blog/' },
    { name: post.headline },
  ];

  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({
            path: `/blog/${post.slug}/`,
            name: post.headline,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt ?? post.publishedAt,
          }),
          articleSchema({
            path: `/blog/${post.slug}/`,
            headline: post.headline,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
          }),
          breadcrumbSchema(breadcrumbs),
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <article className="mt-6">
          <header className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
              {post.category}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {post.headline}
            </h1>
            <p className="mt-4 text-lg text-slate-600">{post.description}</p>
            <p className="mt-4 text-sm text-slate-500">
              Published{' '}
              <time dateTime={toIsoDate(post.publishedAt)}>{formatDate(post.publishedAt)}</time>
              {post.updatedAt ? (
                <>
                  {' · updated '}
                  <time dateTime={toIsoDate(post.updatedAt)}>{formatDate(post.updatedAt)}</time>
                </>
              ) : null}{' '}
              · {post.readingMinutes} min read
            </p>
          </header>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <div className="prose-toolforforever">
                <Article />
              </div>

              <AdSlot slot={AD_SLOTS.inArticle} format="horizontal" />

              <div className="prose-toolforforever max-w-3xl">
                <h2>Tools mentioned in this guide</h2>
                <p>
                  Each of these runs in your browser. Nothing is uploaded, and none of them asks you
                  to create an account.
                </p>
                <ul>
                  {tools.map((tool) => (
                    <li key={tool.slug}>
                      <Link href={toolPath(tool.slug)}>{tool.name}</Link> — {tool.tagline}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <section aria-label="Related tools">
                <h2 className="text-base font-semibold text-slate-900">Tools in this guide</h2>
                <ul className="mt-3 space-y-2">
                  {tools.map((tool) => (
                    <li key={tool.slug}>
                      <Link
                        href={toolPath(tool.slug)}
                        className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-300 hover:shadow-sm"
                      >
                        <span className="block text-sm font-semibold text-slate-900">
                          {tool.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-600">{tool.tagline}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              {related.length > 0 ? (
                <section aria-label="Related reading">
                  <h2 className="text-base font-semibold text-slate-900">Keep reading</h2>
                  <ul className="mt-3 space-y-2">
                    {related.map((relatedPost) => (
                      <li key={relatedPost.slug}>
                        <Link
                          href={`/blog/${relatedPost.slug}/`}
                          className="block text-sm text-slate-600 transition hover:text-brand-700"
                        >
                          {relatedPost.headline}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          </div>
        </article>
      </Container>
    </>
  );
}
