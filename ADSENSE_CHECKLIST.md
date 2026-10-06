# AdSense pre-submission checklist

Everything in this file must be done **by you, manually**. The code is complete and
compliant, but the following steps need a human with access to your Google account,
your domain registrar and your DNS.

Work through it in order. Steps 1–4 should be finished **before** you apply to
AdSense.

---

## 0. Before you start

Three values must be real, not placeholders:

| Value | Where | Currently |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` and your CI secrets | set to `https://toolino-one.vercel.app` (or your custom domain) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `.env.local` and your CI secrets | **empty — ads disabled** |
| `NEXT_PUBLIC_GA_ID` | `.env.local` and your CI secrets | **empty — analytics disabled** |

While `NEXT_PUBLIC_ADSENSE_CLIENT` is empty the site loads no ad code at all: no
script, no `<ins>` tags, no layout space reserved. That is intentional, and it
means the site is already policy-clean for review.

---

## 1. Deploy the site to your real domain

- [ ] `npm run build` completes with no errors and `out/` contains at least 45 HTML pages.
- [ ] The site is live on your real domain over **HTTPS**. AdSense will not approve an
      `http://` site, a `*.vercel.app`-style preview URL, or a `localhost` address.
- [ ] `https://yourdomain.com/` loads with no console errors. Open DevTools and check
      the Console tab on the homepage, one tool page, and one blog post.
- [ ] These URLs all return `200`:
      `/`, `/tools/`, `/tools/create-zip/`, `/tools/merge-pdf/`, `/blog/`,
      `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/cookies/`, `/disclaimer/`,
      `/sitemap.xml`, `/robots.txt`, `/ads.txt`
- [ ] A deliberately wrong URL such as `/this-does-not-exist/` returns a **real 404
      status**, not a 200 with a "not found" message. Verify with
      `curl -I https://yourdomain.com/this-does-not-exist/`.
- [ ] `https://yourdomain.com/ads.txt` is served as `text/plain` (not downloaded as a
      file) and contains your publisher ID. See step 5.

---

## 2. Replace the placeholder values

### ads.txt

- [ ] Edit `public/ads.txt` and replace `pub-XXXXXXXXXXXXXXXX` with your real
      publisher ID, **without** the `ca-` prefix. Delete the explanation comments.
- [ ] Rebuild and redeploy so the change is live.
- [ ] Confirm the deployed file shows your real ID.

If you do not have a publisher ID yet, leave `ads.txt` as it is and come back after
step 4. An unauthorised `ads.txt` line is harmless, because the ID it names does not
exist, but it is also useless.

### AdSense client id

- [ ] Put your real publisher ID (this one **with** the `ca-` prefix, e.g.
      `ca-pub-1234567890123456`) into `NEXT_PUBLIC_ADSENSE_CLIENT`.
- [ ] Rebuild and redeploy.
- [ ] Load any page, accept the cookie banner's advertising option, and confirm in
      DevTools → Network that `adsbygoogle.js` is requested with your client id.
- [ ] **Then reject the banner in a fresh private window and confirm that
      `adsbygoogle.js` is NOT requested.** This is the single most important consent
      check, and getting it wrong is what causes GDPR complaints.

### Ad unit slot ids

Three placeholder slot ids are used in `src/components/tools/ToolPage.tsx`:

```ts
export const AD_SLOTS = {
  afterTool: '1234567890',
  inArticle: '2345678901',
  hubTop: '3456789012',
} as const;
```

- [ ] In AdSense, create three ad units: one responsive display, one in-article, one
      horizontal. Give them names you will recognise later.
- [ ] Replace the three placeholder ids with the real ones from each unit's code
      snippet (`data-ad-slot="…"`).
- [ ] Rebuild and redeploy.

Until you do this, any ad request fails silently and no ad is shown. Nothing breaks.

---

## 3. Google Search Console

- [ ] Add your domain as a property. **Use a Domain property**, not a URL-prefix
      property, so `www` and non-`www` are both covered.
- [ ] Verify ownership by DNS TXT record. The DNS method survives redeployments,
      unlike an HTML file that a clean S3 sync would delete.
- [ ] Submit your sitemap: `https://yourdomain.com/sitemap.xml`.
- [ ] Use **URL Inspection** on `/`, `/tools/create-zip/`, `/tools/merge-pdf/` and
      `/blog/` and click **Request indexing** for each.
- [ ] Wait until Search Console reports pages as **Indexed**. This usually takes
      between a few days and three weeks.
- [ ] Check **Pages** under Indexing and resolve anything reported as
      *Discovered – currently not indexed* or *Crawled – currently not indexed*.

**Do not apply to AdSense before your pages are indexed.** Reviewers check that the
site has real content in Google's index; a site that is live but invisible looks
brand new and empty, which is one of the most common rejection reasons.

---

## 4. Google Analytics (optional but recommended)

- [ ] Create a GA4 property and copy the `G-XXXXXXXXXX` measurement id.
- [ ] Put it in `NEXT_PUBLIC_GA_ID` and redeploy.
- [ ] With the banner accepted, confirm in GA4 **Realtime** that your own visit appears.
- [ ] Reject the banner in a private window and confirm **no** `googletagmanager.com`
      request is made.
- [ ] In GA4 admin, enable **data retention** for 14 months (the maximum) and turn on
      IP anonymisation, which the code already requests.

---

## 5. Apply to AdSense

Everything above should be done first.

- [ ] Go to AdSense → **Sites** → **Add site** and enter your domain.
- [ ] Paste the AdSense verification snippet **only if asked**. You do not need to: the
      site already loads the AdSense script via `NEXT_PUBLIC_ADSENSE_CLIENT` once
      consent is given, and AdSense's own crawler does not require consent, so it will
      find the script. If the crawler does not see it, temporarily allow ads without
      consent, let verification pass, then set it back.
- [ ] Complete the payee and tax information, and confirm your address by postcard if
      Google asks. This can take two to four weeks on its own, so start it early.
- [ ] Wait for review. It typically takes between two days and two weeks, and longer
      for a new domain.

### If you are rejected

The rejection email names a policy. The realistic causes for a site built from this
codebase are almost always one of:

| Reported reason | What to check |
| --- | --- |
| *Low value content* | Pages are not indexed yet, or you removed the long-form sections. Every tool page must keep its 400+ words of prose and its FAQs. |
| *Site down or unavailable* | The CloudFront distribution is serving an error, or `www` does not resolve. Check both hostnames. |
| *Policy violation: no content* | You deployed only a few pages. The full export has 45+ pages; verify `out/` was uploaded completely. |
| *Missing privacy policy* | `/privacy/` must be reachable from every page. It is linked in the footer; confirm the footer renders. |
| *Ads on screens without content* | You added an `AdSlot` to a tool's processing or result screen. Remove it — `useAdFreeZone` exists precisely to prevent this. |
| *Site behaviour: navigation* | A link is broken or a page is empty. Run a crawl with a free tool such as Screaming Frog (500-URL tier) or `npx linkinator out --recurse`. |

---

## 6. Certification: the EU user consent policy

This is the one item in this file that genuinely cannot be completed entirely in
code, and you should understand exactly why.

Google's **EU user consent policy** requires that visitors in the EEA, the UK and
Switzerland give consent before AdSense sets advertising cookies, **and** that the
consent is collected through a Google-certified Consent Management Platform (CMP)
that supports TCF 2.2.

This project ships a working, honest consent mechanism
(`src/components/consent/ConsentProvider.tsx`):

- ads and analytics script loading is genuinely gated on consent
- Accept all / Reject all / Manage options are all present
- the choice is stored, versioned, and withdrawable from the footer
- a TCF 2.2 `__tcfapi()` stub is exposed so partner vendors can read the state

**It is not a Google-certified CMP.** That certification is a Google programme; you
cannot self-certify, and no amount of code changes that. To be fully compliant for
EEA/UK traffic you must choose one of:

- [ ] **Option A (recommended).** Use Google's own **Funding Choices** / Privacy &
      Messaging CMP. It is free, it is certified, and it is configured from the
      AdSense interface: AdSense → **Privacy & messaging** → **GDPR message** →
      create and publish. Then set the message to *European regulations* and choose
      **Do not show my own banner**, or keep both and let Google's message take
      precedence for EEA/UK visitors.
- [ ] **Option B.** Sign up with another certified CMP (Cookiebot, Osano, OneTrust,
      Quantcast, Didomi and Usercentrics all qualify) and paste its script tag into
      `src/app/layout.tsx`.
- [ ] **Option C.** Turn off personalised advertising for EEA/UK traffic entirely in
      AdSense → **Privacy & messaging**, and serve only non-personalised ads there.
      This is the lowest-effort path and costs some revenue per impression.

Whichever you choose:

- [ ] Re-test after configuring it: in a private window, set your browser timezone to
      `Europe/Berlin`, load the site, and confirm the CMP's message appears and that
      `adsbygoogle.js` is not requested before you choose.
- [ ] Keep the built-in banner as the fallback for everywhere else, or remove it from
      `src/app/layout.tsx` if your CMP handles every region.

---

## 7. Ongoing obligations

Once ads are running, these are not optional. AdSense suspends accounts for them.

- [ ] **Never place ads where a user might click by accident.** No ads immediately
      above, below or beside a download button. The `useAdFreeZone` hook exists for
      this; keep using it on any new tool.
- [ ] **Maximum three ad units per page.** `AdSlot` enforces this with a counter, so
      do not bypass it by adding `<ins>` tags directly.
- [ ] **Never label an ad misleadingly.** The "Advertisement" label is required and
      must stay visible.
- [ ] **Never encourage clicks.** No "support us by clicking", no arrows, no animations
      drawing attention to an ad.
- [ ] **Keep content more prominent than ads.** The ad slots are deliberately placed
      after the tool and before the long-form content. Do not move them above the tool.
- [ ] **No ads on empty, loading, error or pop-up screens.** Also no ads inside a modal.
- [ ] **Re-check the Cookie Policy** whenever you add a new third-party service, and
      add it to the table in `src/app/cookies/page.tsx`.
- [ ] **Watch the Policy Centre** in AdSense for violations. Fix them the same week.

---

## 8. Final sanity pass

Run these once the site is live with ads enabled.

- [ ] Load every one of the 27 tool pages and confirm each renders, shows its prose and
      its FAQs, and has exactly one `<h1>`.
- [ ] Confirm no page shows a "coming soon" message, an empty state, or a console error.
- [ ] Check the mobile layout at 360 px width: the header drawer opens and closes, the
      footer links work, and no ad overflows horizontally.
- [ ] Run Lighthouse on the homepage and one tool page. Target: Performance ≥ 90,
      Accessibility ≥ 95, Best Practices ≥ 95, SEO 100.
- [ ] Tab through the homepage and one tool using only the keyboard. Every control must
      be reachable and show a visible focus ring.
- [ ] Verify with a screen reader (VoiceOver, NVDA or TalkBack) that the tool's file
      input is announced with its label and hint.
- [ ] Confirm `https://yourdomain.com/robots.txt` points at your sitemap and does not
      accidentally block `Mediapartners-Google`.
- [ ] Submit the site to Search Console's **Rich Results Test** for one tool page and
      confirm FAQPage, HowTo, SoftwareApplication and BreadcrumbList are all detected.
