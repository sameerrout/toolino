import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, legalMetadata, type LegalPageMeta } from '@/components/legal/LegalPage';
import { BRAND } from '@/lib/site';

const META: LegalPageMeta = {
  title: 'Terms of Service',
  metaTitle: `Terms of Service — The Rules for Using ${BRAND.name} Tools`,
  metaDescription:
    `The terms that govern your use of ${BRAND.name}: free browser-based tools provided as is, no account or fee, your files stay yours, and the limits of our liability.`,
  path: '/terms/',
  updated: '2026-01-05',
  intro:
    `These terms are the agreement between you and ${BRAND.name} when you use this website and the tools on it. The tools run in your browser, they are free, and we never receive your files, so the terms are short. Please read the few obligations they place on you and the limits on what we can promise.`,
};

export const metadata: Metadata = legalMetadata(META);

export default function TermsOfServicePage() {
  return (
    <LegalPage meta={META}>
      <>
        <h2>Acceptance of these terms</h2>
        <p>
          By using <strong>{BRAND.name}</strong>, or any tool or page on it, you agree to these terms.
          If you do not agree, do not use the site. If you use the site for an organisation, you
          confirm you have authority to accept these terms for it. They apply alongside our{' '}
          <Link href="/privacy/">Privacy Policy</Link>, <Link href="/cookies/">Cookie Policy</Link>{' '}
          and <Link href="/disclaimer/">Disclaimer</Link>.
        </p>

        <h2>What this service is</h2>
        <p>
          {BRAND.name} is a set of free tools that run entirely inside your web browser. Converting a
          document, editing an image or working out a percentage happens on your own device, using
          JavaScript and WebAssembly your browser has already downloaded. The site is served as
          static files from a content delivery network and has no application server, no upload
          endpoint, no user database and no account system. That is why we can say plainly that we
          never receive or store the files you work with.
        </p>

        <h2>No account and no fee</h2>
        <p>
          You do not need an account to use any tool, and we do not charge for any of them. We do not
          ask for your name, email address or payment details. If a page asks you to pay for{' '}
          {BRAND.name}, or for card details claiming to be us, it is not ours: report it through our{' '}
          <Link href="/contact/">contact page</Link>
          {BRAND.email ? (
            <>
              {' '}or to <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            </>
          ) : null}
          .
        </p>

        <h2>Acceptable use</h2>
        <ul>
          <li>
            <strong>Do not use the site unlawfully</strong>, or process material you have no right to
            process. Because processing is local, that responsibility rests with you.
          </li>
          <li>
            <strong>Do not attempt to disrupt the site.</strong> That includes denial-of-service
            attempts, deliberate resource exhaustion, probing, or any attempt to gain unauthorised
            access to the site or its hosting.
          </li>
          <li>
            <strong>Do not scrape in a way that harms other visitors.</strong> Automated crawling or
            bulk downloading that degrades the service for others is not permitted; rate-limited
            search engine indexing is welcome.
          </li>
          <li>
            <strong>Do not resell the service as your own.</strong> You may not rebrand or present the
            service as your own product, or remove our notices.
          </li>
          <li>
            <strong>Do not misrepresent the output</strong> as certified, official or professional
            advice, or as issued by a public authority.
          </li>
        </ul>
        <p>We may block traffic that breaches this section and withdraw access without notice.</p>

        <h2>Your content is yours</h2>
        <p>
          You keep every right you hold in the files you select and in anything the tools produce from
          them. We claim no licence over your content and no ownership of your output, because we
          never receive either. A file is read from your device into your browser, transformed there
          and saved back by you.
        </p>

        <h2>Intellectual property in the site itself</h2>
        <p>
          The site itself - its code, design, layout, guides and the {BRAND.name} name and logo -
          belongs to us or is used with permission, and is protected by copyright and other
          intellectual property law. You may use the site for its intended purpose and quote short
          passages from a guide with credit and a link back. You may not copy the site wholesale,
          republish substantial parts of it, or use our name or logo in a way that suggests
          endorsement.
        </p>
        <p>
          Output is different: a document you convert, an image you edit or a calculation you run
          belongs to you.
        </p>

        <h2>Availability and changes to the tools</h2>
        <p>
          We provide the site on a best-efforts basis and do not promise that it will always be
          available, uninterrupted or free of faults. We may add, change, suspend or retire any tool
          at any time. Where we retire something you rely on we will normally say so on the site
          first, but we cannot guarantee advance notice.
        </p>

        <h2>Advertising</h2>
        <p>
          The site is funded by advertising, shown through Google AdSense and loaded only after you
          agree to advertising cookies; the <Link href="/cookies/">Cookie Policy</Link> sets out the
          detail and how to withdraw. Ads are selected by Google, not by us, and do not influence how
          any tool behaves.
        </p>

        <h2>No warranty</h2>
        <p>
          The tools are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without
          warranties of any kind, express or implied, including any implied warranty of fitness for a
          particular purpose or non-infringement, to the fullest extent permitted by law.
        </p>
        <p>
          Output is generated by your browser from your input and your device settings, so results can
          differ between browsers. Where a tool downloads model data for on-device processing -
          background removal and OCR - that data may change over time, and results with it.
        </p>
        <p>
          <strong>
            You must verify anything important before you rely on it, and must not treat output from
            this site as a substitute for your own checks.
          </strong>{' '}
          That applies with particular force to legal, financial, medical and official purposes. Check
          a converted contract or scan against the original before you file or send it. Check a
          calculation against your own figures, or with a qualified professional, before deciding
          anything on the basis of it. Check any photo or measurement against the current requirements
          of the authority you are sending it to. You are responsible for how you use the output.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, we exclude all liability for any loss or damage
          arising out of or in connection with your use of, or inability to use, this site. That
          includes loss of data, loss of profit, loss of business, business interruption and any
          indirect or consequential loss, whether in contract, tort (including negligence), breach of
          statutory duty or otherwise.
        </p>
        <p>
          Nothing here excludes liability where it would be unlawful to do so, including liability for
          death or personal injury caused by our negligence, or for fraud. If you are a consumer, you
          keep every right consumer law gives you.
        </p>

        <h2>Third-party services and links</h2>
        <p>
          The site links to third-party websites and, where you have consented, loads third-party
          services including Google Analytics and Google AdSense. We do not control them and are not
          responsible for their content or practices. Their own terms apply,
          and a link from us is not an endorsement.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms to reflect changes to the site or to the law. When we do, we will
          publish the new version here and change the date at the top. Continuing to use the site
          after a change means you accept the updated terms.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms, and any dispute or claim arising out of or in connection with them or the site,
          are governed by the law of {BRAND.jurisdiction}, whose courts have exclusive jurisdiction.
          If you are a consumer resident elsewhere in the UK or the European Union, you may also bring
          proceedings in your own country.
        </p>

        <h2>How to contact us</h2>
        <p>
          Questions about these terms, formal notices, and reports of a site impersonating{' '}
          {BRAND.name} can be submitted through our <Link href="/contact/">contact page</Link>
          {BRAND.email ? (
            <>
              {' '}or by email to <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            </>
          ) : null}
          . We aim to reply within a few working days. The wider data-protection picture is in our{' '}
          <Link href="/privacy/">Privacy Policy</Link>.
        </p>
      </>
    </LegalPage>
  );
}
