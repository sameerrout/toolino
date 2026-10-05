import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, legalMetadata, type LegalPageMeta } from '@/components/legal/LegalPage';
import { BRAND } from '@/lib/site';

const META: LegalPageMeta = {
  title: 'Privacy Policy',
  metaTitle: 'Privacy Policy — What Toolino Stores and What It Does Not',
  metaDescription:
    'How Toolino handles your data: files are processed in your browser and never uploaded, plus what cookies we set, how to opt out of ads, and your GDPR rights.',
  path: '/privacy/',
  updated: '2026-01-05',
  intro:
    'This policy explains exactly what happens to your data when you use this site. The short version is that your files are never uploaded to us, because the site has no capability to receive them. The rest of this page is the detail behind that claim, together with the small amount of data that is collected when you agree to it.',
};

export const metadata: Metadata = legalMetadata(META);

export default function PrivacyPolicyPage() {
  return (
    <LegalPage meta={META}>
      <>
            <h2>The short version</h2>
            <ul>
              <li>
                <strong>Your files are never uploaded.</strong> Every tool runs inside your browser.
                There is no server-side processing, no upload endpoint and no storage bucket holding
                your documents.
              </li>
              <li>
                <strong>No account is required</strong> and we do not ask for your name, email
                address or phone number to use any tool.
              </li>
              <li>
                <strong>No analytics run unless you accept them.</strong> If you decline, the only
                thing stored in your browser is your consent choice.
              </li>
              <li>
                <strong>Advertising is optional and controlled by you.</strong> You can refuse
                personalised advertising and still use every tool.
              </li>
              <li>
                <strong>We cannot read your files</strong>, so we cannot lose, leak, sell or share
                them. There is nothing to breach.
              </li>
            </ul>

            <h2>Who we are</h2>
            <p>
              {BRAND.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this website. For the
              purposes of the UK GDPR and the EU GDPR, we are the data controller for the limited
              personal data described below, and the data processor arrangements that would normally
              apply to uploaded files simply do not arise.
            </p>
            <p>
              You can contact us about anything on this page at{' '}
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>.
            </p>

            <h2>Your files</h2>
            <p>
              When you choose a file, your browser reads it from your device into the memory of the
              page you are on. The processing then happens in that tab, or in a Web Worker created by
              that tab, using JavaScript and WebAssembly that was already delivered to your browser.
              At no point does the file, or any part of it, travel over the network.
            </p>
            <p>
              You can verify this yourself. Open your browser&rsquo;s developer tools, select the
              Network tab, and use any tool while watching the requests. You will see requests for the
              page, its stylesheet and its scripts, all served from this domain. You will not see a
              request carrying your file.
            </p>
            <p>
              Two tools download a model file the first time you use them. Background removal fetches
              approximately 40 MB of segmentation weights, and the OCR tool fetches language data for
              the language you select. These are downloads of model data to your browser, not uploads
              of your content, and your browser caches them afterwards. If you would prefer these to
              be served from our own domain rather than a public content network, the project README
              explains how to self-host them.
            </p>

            <h2>What we do collect</h2>
            <h3>Essential storage</h3>
            <p>
              We store one item in your browser&rsquo;s local storage: your cookie consent choice,
              so that we do not ask you on every visit. It contains no identifier and is not
              transmitted to us. This is strictly necessary storage and does not require consent, but
              we tell you about it anyway.
            </p>

            <h3>Analytics (only with your consent)</h3>
            <p>
              If you accept analytics, we use Google Analytics 4 to count visits and understand which
              tools are used, in aggregate. This sets cookies and collects your IP address, an
              approximate location derived from it, your device and browser type, the pages you view
              and how you arrived. We use it to decide which tools to improve. Google acts as our
              processor for this data and may transfer it outside the UK and EEA under the EU-US Data
              Privacy Framework and standard contractual clauses.
            </p>
            <p>
              We do not send filenames, file contents, or anything you type into a tool to Google
              Analytics. If you decline analytics, no analytics script is loaded at all and no
              analytics cookie is set.
            </p>

            <h3>Advertising (only with your consent)</h3>
            <p>
              If you accept advertising, Google AdSense may set cookies and use device identifiers to
              show ads, including personalised ads based on your activity across other sites. Google
              and its partners act as independent controllers for that activity under their own
              privacy policies. If you decline, we do not load the AdSense script, and no
              advertising cookie is set.
            </p>

            <h3>Server logs</h3>
            <p>
              The site is served as static files from a content delivery network. Like any web host,
              that provider records standard request logs - IP address, timestamp, requested URL,
              user agent - for security and operational purposes. These logs relate to the pages you
              request, never to file contents, because file contents are never part of a request.
            </p>

            <h3>Email we receive</h3>
            <p>
              If you email us or use the contact form, we receive your address and whatever you write.
              We keep it only as long as needed to answer you and for our own records of the enquiry.
            </p>

            <h2>Cookies and how to opt out</h2>
            <p>
              We set no cookies before you make a choice in the consent banner. After you choose, the
              cookies that may be set are listed in our <Link href="/cookies/">Cookie Policy</Link>,
              together with their purpose and lifetime.
            </p>
            <p>
              You can change or withdraw your choice at any time using the &ldquo;Change cookie
              settings&rdquo; button in the footer of every page. You can also control cookies
              directly:
            </p>
            <ul>
              <li>
                Google Ads Settings lets you turn off personalised advertising across Google
                properties.
              </li>
              <li>
                Your browser settings let you block or delete cookies; blocking all cookies will not
                stop any tool from working.
              </li>
              <li>
                Industry opt-out pages maintained by the Digital Advertising Alliance and the European
                Interactive Digital Advertising Alliance cover many ad vendors at once.
              </li>
            </ul>

            <h2>Third parties that may receive data</h2>
            <ul>
              <li>
                <strong>Google</strong> (AdSense, Analytics) - only after you consent to the relevant
                category.
              </li>
              <li>
                <strong>Our content delivery network and DNS provider</strong> - for serving the site
                and for security logs.
              </li>
              <li>
                <strong>Public content networks</strong> - serving the optional AI model files
                described above, on the two tools that use them.
              </li>
            </ul>
            <p>
              We do not sell personal data, we do not run a data broker arrangement, and we do not
              share your information with anyone for their own marketing.
            </p>

            <h2>Your rights</h2>
            <p>
              Under the UK and EU GDPR you have the right to access, correct, delete, restrict or
              object to the processing of your personal data, and the right to data portability and to
              withdraw consent at any time. Because we hold almost nothing about you, most of these
              rights are satisfied trivially: withdrawing consent removes the only identifier we
              would otherwise hold.
            </p>
            <p>
              To exercise any right, email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>. You
              also have the right to complain to your national supervisory authority; in the UK that is
              the Information Commissioner&rsquo;s Office.
            </p>

            <h2>Legal bases</h2>
            <ul>
              <li>
                <strong>Consent</strong> (Article 6(1)(a)) for analytics and advertising cookies.
              </li>
              <li>
                <strong>Legitimate interests</strong> (Article 6(1)(f)) for security logging and for
                answering enquiries you send us.
              </li>
              <li>
                <strong>Contract</strong> (Article 6(1)(b)) where you have asked us to do something
                specific, such as respond to a support request.
              </li>
            </ul>

            <h2>Children</h2>
            <p>
              This site is not directed at children under 13, and we do not knowingly collect data
              from them. There is no account system and no user-generated content, so there is no
              mechanism by which a child could provide us with personal information beyond sending an
              email.
            </p>

            <h2>International transfers</h2>
            <p>
              Where consent-based third-party services transfer data outside the UK or EEA, those
              transfers rely on the EU-US Data Privacy Framework, UK Extension, or on standard
              contractual clauses as published by the European Commission.
            </p>

            <h2>Security</h2>
            <p>
              The site is served over HTTPS only, with HTTP Strict Transport Security enabled. There
              is no user database, no authentication system and no upload endpoint, which removes the
              categories of vulnerability that normally put user files at risk. The strongest security
              property here is architectural: data that is never collected cannot be exposed.
            </p>

            <h2>Changes to this policy</h2>
            <p>
              If we change how the site handles data, we will update this page and the date at the
              top, and where the change is significant we will ask for consent again. We will not
              quietly widen what we collect.
            </p>
      </>
    </LegalPage>
  );
}
