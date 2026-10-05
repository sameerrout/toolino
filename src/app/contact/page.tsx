import Link from 'next/link';
import type { Metadata } from 'next';
import { Bug, Building2, LifeBuoy, ShieldQuestion } from 'lucide-react';

import { Container } from '@/components/common/Container';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { ContactForm } from '@/components/contact/ContactForm';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, contactPageSchema, faqSchema, webPageSchema } from '@/lib/seo/schema';
import { BRAND } from '@/lib/site';

export const metadata: Metadata = buildMetadata({
  title: `Contact ${BRAND.name} — Support, Bug Reports and Enquiries`,
  description:
    'Reach the Toolino team about a tool, a bug report, a privacy request or a business enquiry. A real email address and a working contact form, answered within two working days.',
  path: '/contact/',
  keywords: ['contact toolino', 'report a bug', 'support', 'privacy request'],
});

const breadcrumbs = [{ name: 'Home', path: '/' }, { name: 'Contact' }];

const ROUTES = [
  {
    icon: Bug,
    title: 'Found a bug?',
    text: 'Tell us which tool, which browser and operating system, and what the file type was. Please do not send the file itself: a description is almost always enough.',
  },
  {
    icon: ShieldQuestion,
    title: 'Privacy or data request?',
    text: 'We hold almost nothing about you, but if you want to exercise a GDPR right or ask what is stored, write to us and we will answer within 30 days.',
  },
  {
    icon: LifeBuoy,
    title: 'Stuck on a tool?',
    text: 'If something will not open or a result looks wrong, describe what you expected and what happened. Include the exact error text if one appeared.',
  },
  {
    icon: Building2,
    title: 'Business or press?',
    text: 'For advertising, partnership or media questions, use the business topic in the form so it reaches the right place.',
  },
] as const;

const CONTACT_FAQS = [
  {
    question: 'Do you need my file to investigate a bug?',
    answer:
      'Almost never, and we would rather you did not send one. Because the site runs entirely on your device, we cannot reproduce your exact environment anyway. Knowing the tool, your browser and operating system, the file type and approximate size, and the exact error message is usually enough to find the cause.',
  },
  {
    question: 'How quickly will I hear back?',
    answer:
      'Usually within two working days. Bug reports about a specific tool tend to be answered fastest because they are concrete. Legal and privacy requests are always answered within 30 days, as the GDPR requires.',
  },
  {
    question: 'Can you recover a file I lost?',
    answer:
      'No. We never receive your files, so there is no copy anywhere for us to recover. If a download failed, the file still exists on your device unless you deleted it: check your browser downloads list and your default downloads folder.',
  },
  {
    question: 'Is the contact form itself private?',
    answer:
      'Yes. The form does not submit to a server. It composes a message in your own email application using a mailto link, so the text goes straight from your mail client to our inbox. Nothing is posted to this website at any point.',
  },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({
            path: '/contact/',
            name: `Contact ${BRAND.name}`,
            description: `How to reach the ${BRAND.name} team.`,
          }),
          breadcrumbSchema(breadcrumbs),
          contactPageSchema(),
          faqSchema(CONTACT_FAQS),
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Contact us
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            {BRAND.name} is run by a small team, and a real person reads every message. The fastest
            route is always email:{' '}
            <a
              href={`mailto:${BRAND.email}`}
              className="font-semibold text-brand-700 underline hover:text-brand-800"
            >
              {BRAND.email}
            </a>
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <ContactForm />

          <aside className="space-y-6">
            <section aria-label="What to include">
              <h2 className="text-base font-semibold text-slate-900">What to write about</h2>
              <ul className="mt-4 space-y-4">
                {ROUTES.map((route) => (
                  <li key={route.title} className="flex gap-3">
                    <route.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <span>
                      <strong className="block text-sm font-semibold text-slate-900">
                        {route.title}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-600">{route.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Other pages" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Before you write</h2>
              <p className="mt-2 text-xs text-slate-600">
                Your question may already be answered on one of these pages.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li>
                  <Link href="/about/" className="text-brand-700 hover:underline">
                    How the site works and why
                  </Link>
                </li>
                <li>
                  <Link href="/privacy/" className="text-brand-700 hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms/" className="text-brand-700 hover:underline">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/cookies/" className="text-brand-700 hover:underline">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link href="/disclaimer/" className="text-brand-700 hover:underline">
                    Disclaimer
                  </Link>
                </li>
                <li>
                  <Link href="/blog/" className="text-brand-700 hover:underline">
                    Guides and articles
                  </Link>
                </li>
              </ul>
            </section>
          </aside>
        </div>

        <div className="mt-14 max-w-3xl">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Questions about contacting us
          </h2>
          <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
            {CONTACT_FAQS.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold text-slate-900">
                  <span>{faq.question}</span>
                  <span aria-hidden="true" className="mt-1 shrink-0 text-slate-400 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[0.9375rem] leading-7 text-slate-700">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
