import Link from 'next/link';
import type { Metadata } from 'next';
import { ShieldCheck, Code, Users, Mail, Gauge, HeartHandshake } from 'lucide-react';

import { Container } from '@/components/common/Container';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, organizationSchema, webPageSchema } from '@/lib/seo/schema';
import { BRAND } from '@/lib/site';
import { TOOL_REGISTRY } from '@/data/toolRegistry';

export const metadata: Metadata = buildMetadata({
  title: `About ${BRAND.name} — Who Runs This Site and Why`,
  description:
    'Why Toolino exists, how the browser-only approach works, what it costs to run, and the principles behind every tool on the site. No accounts, no uploads, no dark patterns.',
  path: '/about/',
  keywords: ['about toolino', 'privacy first tools', 'browser based file tools'],
});

const breadcrumbs = [{ name: 'Home', path: '/' }, { name: 'About' }];

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: 'Your files are none of our business',
    text: 'The single design decision behind this site is that we never want to be in a position to lose your data. Not collecting it is stronger than promising to protect it.',
  },
  {
    icon: Gauge,
    title: 'It has to work on a cheap phone',
    text: 'Every tool is tested against the low end: 2 GB of RAM, a slow CPU, a slow connection. Limits scale down automatically rather than the tab crashing.',
  },
  {
    icon: Code,
    title: 'No dark patterns, ever',
    text: 'No fake download buttons, no countdown timers, no "your file is ready" pages, no email capture before a download, no watermarks added to your output.',
  },
  {
    icon: HeartHandshake,
    title: 'Honest about what a browser cannot do',
    text: 'Where a browser genuinely cannot match desktop software, the page says so. We would rather lose a visitor than oversell a result and waste their time.',
  },
  {
    icon: Users,
    title: 'No accounts, no email harvesting',
    text: 'There is no sign-up, no login, no newsletter pop-up and no reason for us to know who you are. The tools work the same for everyone.',
  },
  {
    icon: Mail,
    title: 'Reachable when something breaks',
    text: 'A real address that a real person reads. If a tool produces a wrong result on your file, we want to know, because that is how the site improves.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageSchema({
            path: '/about/',
            name: `About ${BRAND.name}`,
            description: `Who runs ${BRAND.name}, why the tools run entirely in the browser, and the principles behind them.`,
          }),
          breadcrumbSchema(breadcrumbs),
          organizationSchema(),
        ]}
      />

      <Container className="py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            About {BRAND.name}
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            {BRAND.name} is a small collection of {TOOL_REGISTRY.length} free tools for everyday file
            work: combining and shrinking PDFs, compressing and converting images, building ZIP
            archives, reading text out of a photo, and running the sums people actually need. Every
            one of them runs inside your browser.
          </p>
        </div>

        <div className="prose-toolnova mt-10 max-w-3xl">
          <h2>Creators</h2>
          <p>
            {BRAND.name} was created by <strong>Sameer Rout</strong> and <strong>Sampangi Sony</strong>. Built with a focus on speed, accessibility, and complete privacy, the platform provides everyday online utilities that execute 100% inside your browser so your files and sensitive data never leave your device.
          </p>

          <h2>Why this site exists</h2>
          <p>
            Searching for something as ordinary as &ldquo;merge two PDFs&rdquo; returns a wall of
            sites that all work the same way: you upload your file to their server, wait, download the
            result, and hope that the copy they kept is deleted on the schedule their privacy policy
            claims. For a restaurant menu that is fine. For a rental contract, a passport scan, a
            medical letter or a client&rsquo;s accounts, it is a bad trade, and it is a trade most
            people never consciously agreed to.
          </p>
          <p>
            The uncomfortable part is that the upload is usually unnecessary. Browsers have been able
            to manipulate files locally for years: canvas for images, WebAssembly for serious
            computation, Web Workers for keeping the interface responsive, and mature libraries for
            PDF and archive formats. Once those pieces exist, the server stops being a technical
            requirement and becomes a business decision - a way to meter usage, build an email list,
            or train a model on other people&rsquo;s documents.
          </p>
          <p>
            {BRAND.name} is the version where that decision goes the other way. There is no upload
            endpoint anywhere in the application, because there is nothing on the server to receive a
            file. The site is a set of static pages, and the work happens on your machine.
          </p>

          <h2>How it works, concretely</h2>
          <p>
            You load a page. Your browser downloads the HTML, a stylesheet, and a small amount of
            JavaScript. When you open a specific tool, that tool&rsquo;s code is fetched - and only
            that tool&rsquo;s code, which is why opening the word counter does not download a PDF
            engine. When you choose a file, your browser reads it from disk on your instruction. The
            conversion runs in the tab, or in a Web Worker that the tab creates so the page stays
            responsive.
          </p>
          <p>
            The actual computation is done by four ordinary web technologies depending on the task:
            the canvas API for anything image-related, PDF-LIB and pdf.js for documents, fflate for
            ZIP archives, and WebAssembly for OCR and background removal. None of them is capable of
            transmitting your file, because transmitting requires a network request and none is made.
          </p>
          <p>
            Two tools do download something the first time you use them: the background remover
            fetches roughly 40 MB of machine-learning weights, and OCR fetches the language data for
            the language you pick. Those are downloads of model data to your browser, and they are
            cached afterwards. Your photograph or scan is still read locally and still never leaves
            your device. We would rather state that plainly than claim &ldquo;nothing is ever
            downloaded&rdquo;, which would not be true.
          </p>

          <h2>How the site is paid for</h2>
          <p>
            Hosting a static site is inexpensive, which is deliberate: it means the site does not need
            to monetise your documents to survive. Running costs are covered by advertising through
            Google AdSense, shown on content pages to visitors who consent to it.
          </p>
          <p>
            Ads are never shown while a tool is processing or on a result screen, where a misplaced
            click would be likely. They are always labelled as advertising, never styled to look like
            a button or a download link, and there are never more than three on a page. Advertising
            has no influence on the tools, and there is no &ldquo;premium&rdquo; tier that produces
            better output - everybody gets the same result.
          </p>

          <h2>Principles we hold to</h2>
          <p>
            These are not aspirations; they are constraints the code is written against, and they are
            checked before anything ships.
          </p>
        </div>

        <ul className="mt-8 grid max-w-4xl gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <li key={principle.title} className="flex gap-3">
              <principle.icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span>
                <strong className="block text-sm font-semibold text-slate-900">
                  {principle.title}
                </strong>
                <span className="mt-1 block text-sm text-slate-600">{principle.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="prose-toolnova mt-12 max-w-3xl">
          <h2>What we are not</h2>
          <p>
            We are not affiliated with Google, Adobe, Microsoft, Apple or any other company whose
            product names appear on this site. Those names are used only to describe compatibility,
            because that is how people search for what they need. We are not a document management
            service, we do not offer cloud storage, and we cannot recover a file you have lost.
          </p>
          <p>
            We are also not infallible. Conversion and compression are produced by your browser, and
            different browsers vary slightly in how they encode images. If an output matters - a
            document you are filing, a photo for an official application - check it before you rely
            on it. Every relevant page says so, and the{' '}
            <Link href="/disclaimer/">Disclaimer</Link> sets out the limits in full.
          </p>

          <h2>Getting in touch</h2>
          <p>
            Bug reports are genuinely welcome, especially when a specific file produces a wrong
            result. Because we never see your files, a description of the file and what went wrong is
            far more useful than the file itself, and we would rather you did not send us anything
            confidential.
          </p>
          <p>
            For questions, corrections to a guide, or anything else, use the{' '}
            <Link href="/contact/">contact page</Link> or email{' '}
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>. We read everything and answer most
            things within a couple of days.
          </p>
        </div>

        <div className="mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Start with something useful</h2>
          <p className="mt-2 text-sm text-slate-600">
            If you came here to get something done rather than to read about us, these are the tools
            people use most.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {TOOL_REGISTRY.filter((tool) => tool.featured)
              .slice(0, 6)
              .map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}/`}
                    className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-800"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </Container>
    </>
  );
}
