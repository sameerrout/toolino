import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, legalMetadata, type LegalPageMeta } from '@/components/legal/LegalPage';
import { BRAND } from '@/lib/site';

const META: LegalPageMeta = {
  title: 'Disclaimer',
  metaTitle: `Disclaimer — ${BRAND.name} Tools Are Not Professional Advice`,
  metaDescription:
    `${BRAND.name} provides general information and browser-based estimates only, not legal, financial, tax, medical or accounting advice. Verify important results.`,
  path: '/disclaimer/',
  updated: '2026-01-05',
  intro:
    'This page explains the limits of what this site and its tools can tell you. In short: the tools are useful, they run on your own device, and their output is an estimate or a transformation of what you gave them, not professional advice and not an official determination. Please read this before you rely on a result.',
};

export const metadata: Metadata = legalMetadata(META);

export default function DisclaimerPage() {
  return (
    <LegalPage meta={META}>
      <>
        <h2>General information only</h2>
        <p>
          This site, its tools and the guides published alongside them are provided for general
          information and general utility. They are written to be helpful to a wide audience, which
          means they cannot take account of your particular circumstances. Nothing on this site is
          tailored to you, and no relationship of adviser and client is created by your use of it.
        </p>
        <p>
          The calculators, converters and editors are practical instruments. They apply the formulas
          or transformations shown on the page to the figures or files you supply. They do not assess
          your situation, and they do not know anything about you beyond what you type in.
        </p>

        <h2>No professional advice</h2>
        <p>
          <strong>
            Nothing on this site is legal, financial, tax, medical or accounting advice, and nothing
            here should be relied on as a substitute for advice from a qualified professional.
          </strong>{' '}
          We are not a firm of solicitors, accountants, tax advisers, financial advisers or medical
          practitioners, and we do not hold ourselves out as any of those.
        </p>
        <p>
          The calculators deserve a specific warning because they look authoritative. The age
          calculator, the percentage calculator, the discount calculator, the EMI (loan instalment)
          calculator and the GST calculator all produce <em>estimates</em> derived from the numbers
          you enter and the formulas shown on the page. They cannot see the rest of your finances,
          your tax position, your credit agreement, your residency or the rules that apply to you.
        </p>
        <ul>
          <li>
            An EMI or loan result is a mathematical amortisation of the figures you supplied. It is
            not an offer of credit, not a quotation, and not a statement of what a lender will charge
            you. Your lender&rsquo;s own figures govern, and they may include fees, insurance, a
            different day-count convention, a variable rate or a different compounding method.
          </li>
          <li>
            A GST or tax result is a calculation, not tax advice. Rates, thresholds, exemptions,
            place-of-supply rules and rounding conventions vary by country, by state and over time.
            Your tax authority&rsquo;s published rules govern, and a qualified accountant or tax
            adviser should be consulted before you file, invoice or remit anything.
          </li>
          <li>
            A discount or percentage result is arithmetic. It does not tell you whether a price,
            interest rate or offer is fair, lawful or suitable for you.
          </li>
          <li>
            An age result is a date difference. It does not determine legal age, eligibility, pension
            entitlement or any status that a law, scheme or authority defines in its own terms.
          </li>
        </ul>
        <p>
          For anything that carries legal, financial, medical or other professional consequences,
          consult a qualified professional in your jurisdiction before you act.
        </p>

        <h2>Verify official requirements before you submit anything</h2>
        <p>
          Some tools here produce output intended for an official process, most obviously the passport
          and visa photo tools. Photo specifications differ between countries and between document
          types, and issuing authorities change them without notice. Head size as a percentage of the
          frame, background colour, expression, glasses, head covering, resolution in dots per inch,
          file size limits and file format all vary, and a photograph that satisfies one authority may
          be rejected by another.
        </p>
        <p>
          <strong>
            Always check the current published requirements of the specific authority you are applying
            to before you submit a photo produced here.
          </strong>{' '}
          We aim to reflect common published standards and to help you meet them, but we do not
          guarantee that output complies with the rules in force on the day you apply, and we are not
          affiliated with or approved by any passport, immigration or licensing authority. A rejected
          application is your responsibility to avoid.
        </p>

        <h2>Accuracy of output</h2>
        <p>
          Results depend on your input and on your browser. You are responsible for the figures you
          enter and the file you select. Different browsers, browser versions and operating systems
          can encode an image, render a font or round a number slightly differently, and compressed
          files can degrade. Where a tool runs a model on your device - background removal downloads
          roughly 40 MB of segmentation weights, and OCR downloads language data - the version of that
          model and the quality of your source material both affect the result, and the model data may
          be updated by its publisher over time.
        </p>
        <p>
          Converted documents can shift pagination, spacing, fonts, tables and special characters.
          Optical character recognition misreads poor scans, handwriting, unusual fonts and unusual
          languages. Image edits are destructive if you overwrite your original. Check anything
          important against the source before you rely on it, and keep the original file.
        </p>

        <h2>No guarantee of fitness for a particular purpose</h2>
        <p>
          The site and its tools are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We
          give no warranty that a tool will meet your requirements, produce a particular result, be
          compatible with a particular format, standard or authority, or be free of errors or
          interruptions. If a tool is not suitable for the job you have in mind, please use a
          different tool. Our <Link href="/terms/">Terms of Service</Link> set out the full position,
          including the exclusion of implied warranties to the extent the law allows.
        </p>

        <h2>External links</h2>
        <p>
          We link to third-party websites where we think they will be useful, for example to an
          authority&rsquo;s published requirements or to a format specification. We do not control
          those sites, we do not maintain them, and we are not responsible for their content,
          accuracy, availability or practices. Their terms and privacy policies apply once you leave
          this site. A link is not an endorsement, and we are not responsible for any loss arising
          from your use of a third-party site or service.
        </p>

        <h2>File formats and trademarks</h2>
        <p>
          Product names mentioned on this site - including PDF, Microsoft Word, Microsoft Excel,
          Google, Google Docs and Google Analytics - are trademarks or registered trademarks of their
          respective owners. They are used here only in a descriptive sense, to state which file
          formats or services a tool is compatible with.
        </p>
        <p>
          <strong>
            This site is not affiliated with, endorsed by, sponsored by or approved by any of those
            owners.
          </strong>{' '}
          We do not claim any rights in their marks, and our use of a name does not imply any
          commercial relationship. Where a tool accepts a proprietary format, compatibility is
          achieved through publicly documented file structures and open-source libraries, not through
          any partnership.
        </p>

        <h2>Advertising disclosure</h2>
        <p>
          This site is funded by advertising, served through Google AdSense and loaded only after you
          consent to advertising cookies. Advertising pays for the hosting and development of the
          tools, and it is the reason the site is free.
        </p>
        <p>
          <strong>Advertising never influences tool output.</strong> Advertisers have no involvement
          in how a tool works, what a calculator computes or what a guide says. We do not accept
          payment to recommend a product, we do not write sponsored tool reviews, and no advertiser
          sees your files, because your files never leave your device. Ads are labelled as
          advertising, and you can refuse advertising entirely and still use every tool.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {BRAND.name} is not liable for any loss or damage
          arising from your use of, or reliance on, this site, its tools or its guides. That includes
          direct and indirect loss, lost data, lost profit, lost opportunity, wasted expenditure, the
          cost of redoing work, and any consequence of a rejected application, an incorrect
          calculation or an inaccurate conversion. You use the tools, and you decide whether to rely
          on their output, at your own risk.
        </p>
        <p>
          Nothing on this page excludes or limits liability that cannot lawfully be excluded or
          limited, including liability for death or personal injury caused by negligence, or for
          fraud. If you are a consumer, your statutory rights are unaffected.
        </p>

        <h2>How to contact us</h2>
        <p>
          If you believe something on this site is inaccurate, misleading, out of date or unsafe to
          rely on, please report it through our <Link href="/contact/">contact page</Link>
          {BRAND.email ? (
            <>
              {' '}or at <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            </>
          ) : null}
          {' '}with the page or tool concerned. We would rather correct a problem than leave it standing. For the wider
          picture, see our <Link href="/privacy/">Privacy Policy</Link>, our{' '}
          <Link href="/cookies/">Cookie Policy</Link> and our <Link href="/terms/">Terms of Service</Link>.
        </p>
      </>
    </LegalPage>
  );
}
