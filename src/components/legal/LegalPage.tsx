import Link from 'next/link';
import type { ReactNode } from 'react';

import { Container } from '@/components/common/Container';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { buildMetadata } from '@/lib/seo/metadata';
import { BRAND } from '@/lib/site';

/**
 * Shared chrome for the legal and information pages.
 *
 * Legal pages must contain no advertising and no client-side tracking, so this
 * component renders none: no `AdSlot`, no analytics. They also carry a visible
 * "last updated" date, which AdSense review and the GDPR both expect.
 */

export interface LegalPageMeta {
  /** `<h1>` and the breadcrumb label. */
  title: string;
  /** 50-60 character title tag. */
  metaTitle: string;
  /** 140-160 character meta description. */
  metaDescription: string;
  /** Site-relative path, e.g. `/privacy/`. */
  path: string;
  /** ISO date string. */
  updated: string;
  /** Short introductory paragraph shown above the body. */
  intro: string;
}

/** Builds the Next.js `Metadata` for a legal page from its descriptor. */
export function legalMetadata(meta: LegalPageMeta) {
  return buildMetadata({
    title: meta.metaTitle,
    description: meta.metaDescription,
    path: meta.path,
  });
}

export function LegalPage({
  meta,
  children,
}: {
  meta: LegalPageMeta;
  children: ReactNode;
}) {
  const breadcrumbs = [{ name: 'Home', path: '/' }, { name: meta.title }];

  return (
    <Container className="py-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-6 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{meta.title}</h1>
        <p className="mt-3 text-sm text-slate-500">
          Last updated{' '}
          <time dateTime={meta.updated}>
            {new Date(meta.updated).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        </p>
        <p className="mt-5 text-lg text-slate-600">{meta.intro}</p>
      </div>

      <div className="prose-toolino mt-10 max-w-3xl">{children}</div>

      <div className="mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-semibold text-slate-900">Questions about this page</h2>
        <p className="mt-2 text-sm text-slate-600">
          Write to{' '}
          <a
            href={`mailto:${BRAND.email}`}
            className="font-medium text-brand-700 underline hover:text-brand-800"
          >
            {BRAND.email}
          </a>{' '}
          and we will answer, or correct the page if something here is wrong or out of date. You can
          also read the rest of our policies: <Link href="/privacy/">Privacy</Link>,{' '}
          <Link href="/terms/">Terms</Link>, <Link href="/cookies/">Cookies</Link>,{' '}
          <Link href="/disclaimer/">Disclaimer</Link>.
        </p>
      </div>
    </Container>
  );
}
