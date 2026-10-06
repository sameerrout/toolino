import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, legalMetadata, type LegalPageMeta } from '@/components/legal/LegalPage';
import { BRAND } from '@/lib/site';

const META: LegalPageMeta = {
  title: 'Cookie Policy',
  metaTitle: 'Cookie Policy — The Cookies Toolino Sets and How to Refuse',
  metaDescription:
    'Every cookie and local storage item Toolino may set, who sets it, why, and how long it lasts, plus how to refuse cookies and still use every tool.',
  path: '/cookies/',
  updated: '2026-01-05',
  intro:
    'This page lists every cookie and every item of local storage this site can place on your device, who sets it, what it is for and how long it lasts. Nothing at all is set before you make a choice, and no tool stops working if you refuse everything.',
};

export const metadata: Metadata = legalMetadata(META);

export default function CookiePolicyPage() {
  return (
    <LegalPage meta={META}>
      <>
        <h2>Our approach in one paragraph</h2>
        <p>
          We set no cookies before you make a choice in the consent banner. Until you answer it,
          nothing is written to your device and no third-party script is loaded. After you answer, the
          only cookies that can appear are those listed below, and only for the categories you
          allowed. The one exception is a single local-storage entry that records your decision, so
          that we do not ask again on every page.
        </p>

        <h2>Cookies and storage we may set</h2>
        <p>
          The table below covers all cookies and local-storage entries used by this site. Names
          beginning with an underscore are set by Google. The exact set can vary with your country and
          with whether Google is running an experiment, but the purpose and lifetime of each item
          stays within what is described here.
        </p>
        <div className="overflow-x-auto">
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                  Name
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                  Set by
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                  Purpose
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                  Type
                </th>
                <th scope="col" className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>toolino.consent.v1</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  {BRAND.name}
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Stores your cookie consent choice so that we do not ask on every visit
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Strictly necessary (local storage, not a cookie)
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Until you clear it or the policy version changes
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>_ga</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Google Analytics
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Distinguishes users so that visits can be counted in aggregate
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Analytics
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Up to 2 years
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>_ga_&lt;container-id&gt;</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Google Analytics
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Maintains session state for this site&rsquo;s Analytics property
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Analytics
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  2 years
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>__gads</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Google AdSense
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Ad delivery, frequency capping and fraud prevention
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Advertising
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Up to 13 months
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>__gpi</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Google AdSense
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Ad delivery, frequency capping and fraud prevention
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Advertising
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Up to 13 months
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>IDE</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Google DoubleClick
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Measures ad effectiveness and helps show relevant ads
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Advertising
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Up to 13 months
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  <code>_gcl_au</code>
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Google Ads
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Conversion linker: attributes an ad click to a later action on the site
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  Advertising
                </td>
                <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700">
                  90 days
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Strictly necessary</h3>
        <p>
          The only entry here is <code>toolino.consent.v1</code>, which we write to local storage
          rather than as a cookie. It records two booleans, one for analytics and one for advertising,
          plus the time of your decision and a version number. It carries no identifier and is never
          sent to us. We treat it as strictly necessary because without it we could not remember a
          refusal.
        </p>

        <h3>Analytics</h3>
        <p>
          If you allow analytics, we load Google Analytics 4, which sets the two <code>_ga</code>{' '}
          cookies above. They let us count visits and see which tools are used, in aggregate. We never
          send filenames, file contents or anything you type into a tool to Analytics. If you decline,
          the Analytics script is never loaded and neither cookie is set.
        </p>

        <h3>Advertising</h3>
        <p>
          If you allow advertising, Google AdSense may set the advertising cookies above and use
          device identifiers to show ads, including personalised ads based on your activity on other
          sites. Google and its partners act as independent controllers for that activity. If you
          decline, we never load the AdSense script and none of those cookies appear.
        </p>

        <h2>Before you make a choice, nothing is set</h2>
        <p>
          Before you touch the consent banner, this site sets no cookies at all, writes no
          local-storage entry, and loads no Analytics or AdSense script. The banner is rendered by our
          own code, which is why it can appear without any tracking behind it. We also avoid the
          common trick of dropping a region-detection cookie.
        </p>

        <h2>Refusing cookies does not break the tools</h2>
        <p>
          Every tool is JavaScript and WebAssembly that runs locally. None of them depends on a
          cookie, on Analytics or on advertising. If you reject both optional categories, or block
          cookies in your browser, conversion, compression, image editing, OCR, background removal and
          every calculator keep working. The only thing you lose is the scripts you did not want.
        </p>

        <h2>Your files are never uploaded, whatever you choose</h2>
        <p>
          Your cookie choice has no bearing on how files are handled. Files are read into your
          browser, processed on your device and saved back to your device. They are never uploaded,
          with or without consent. Cookies are used only to remember your choices and, if you allow
          it, to measure visits and serve ads.
        </p>

        <h2>How to manage or withdraw consent</h2>
        <p>You can change your mind at any time, as often as you like, in three ways.</p>
        <ol>
          <li>
            <strong>Our own control.</strong> Every page has a &ldquo;Change cookie settings&rdquo;
            button in the footer. It reopens the consent panel, where you can switch analytics or
            advertising on or off, or withdraw both. Withdrawing takes effect immediately: the scripts
            stop loading and we ask Google to delete the cookies it set, though a cookie already
            written may remain until it expires or you delete it.
          </li>
          <li>
            <strong>Your browser.</strong> All major browsers let you view, block and delete cookies
            and site data, and private modes discard them at the end of a session. Clearing site data
            for this domain also removes the local-storage entry recording your choice, so the banner
            will appear again.
          </li>
          <li>
            <strong>Advertising industry controls.</strong> Google Ads Settings turns off personalised
            advertising across Google properties. The opt-out pages run by the Digital Advertising
            Alliance and the European Interactive Digital Advertising Alliance cover many ad vendors
            at once. These affect advertising generally, not this site alone.
          </li>
        </ol>

        <h2>Cookies we deliberately do not use</h2>
        <ul>
          <li>
            <strong>No fingerprinting.</strong> We do not read canvas, WebGL, audio, font or device
            characteristics to build an identifier for you.
          </li>
          <li>
            <strong>No cross-site tracking pixels beyond the Google ad stack.</strong> There are no
            Meta, TikTok, LinkedIn, X or other social pixels, and no marketing tags of any other kind.
          </li>
          <li>
            <strong>No session recording or heatmaps.</strong> We do not replay your clicks, scrolls
            or keystrokes.
          </li>
          <li>
            <strong>No social media trackers</strong>, and no embedded social widgets that would send
            data about your visit to a social network.
          </li>
          <li>
            <strong>No first-party analytics of our own.</strong> We run no self-hosted analytics
            package and keep no visitor logs of our own.
          </li>
        </ul>

        <h2>Consent records and version changes</h2>
        <p>
          Your decision is stored with a version number. If we materially change what we set or why,
          we increase that number, which invalidates the stored choice and shows the banner again so
          that you can decide afresh. We do not silently widen what we collect. The stored record
          contains no identifier, so we cannot connect it to a person or look up your individual
          choice.
        </p>

        <h2>Where to read more</h2>
        <p>
          This page covers cookies and local storage only. The wider picture - what little data we
          hold, the lawful bases for holding it, retention and your rights - is in our{' '}
          <Link href="/privacy/">Privacy Policy</Link>. Your use of the site is also governed by our{' '}
          <Link href="/terms/">Terms of Service</Link>, and the limits on what the tools can tell you
          are in our <Link href="/disclaimer/">Disclaimer</Link>. If anything here is unclear or
          inaccurate, email <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> and we will correct
          it.
        </p>
      </>
    </LegalPage>
  );
}
