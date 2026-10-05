'use client';

/**
 * Cookie consent banner.
 *
 * Shows Accept all / Reject all / Manage options for visitors in regions that
 * require consent, and stays out of the way everywhere else. Rendered only
 * after hydration so the static HTML never contains a flash of banner.
 *
 * Accessibility: it is a labelled `dialog` with a focus trap that keeps keyboard
 * focus inside, Escape closes it (rejecting nothing - the visitor can decide
 * later from the footer), and every control is reachable by keyboard.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useConsent } from './ConsentProvider';

export function ConsentBanner() {
  const { isBannerOpen, ready, acceptAll, rejectAll, save, closeBanner, consent, requiresConsent } =
    useConsent();
  const [showDetails, setShowDetails] = useState(false);
  const [ads, setAds] = useState(consent?.ads ?? false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keep local toggles in sync when an existing choice is revisited.
  useEffect(() => {
    setAds(consent?.ads ?? false);
    setAnalytics(consent?.analytics ?? false);
  }, [consent]);

  useEffect(() => {
    if (!isBannerOpen || !requiresConsent) return;
    const node = dialogRef.current;
    if (!node) return;
    // Move focus into the dialog so keyboard users are not left behind it.
    const first = node.querySelector<HTMLElement>('button, a[href], input');
    first?.focus();
  }, [isBannerOpen, requiresConsent, showDetails]);

  // When consent is not required we still record an explicit choice once, so
  // analytics stays off until the visitor opts in.
  useEffect(() => {
    if (!ready || requiresConsent || consent !== null) return;
    save({ ads: false, analytics: false });
  }, [ready, requiresConsent, consent, save]);

  if (!ready || !requiresConsent || !isBannerOpen) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeBanner();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-title"
        aria-describedby="consent-description"
        className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5"
      >
        <div className="flex items-start gap-3">
          <Cookie aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <h2 id="consent-title" className="text-base font-semibold text-slate-900">
              Your choice about cookies
            </h2>
            <p id="consent-description" className="mt-1.5 text-sm text-slate-600">
              {BRAND_CONSENT_COPY}
            </p>

            {showDetails ? (
              <fieldset className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manage your choices
                </legend>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    aria-describedby="consent-essential-help"
                  />
                  <span>
                    <span className="font-medium text-slate-900">Strictly necessary</span>
                    <span id="consent-essential-help" className="mt-0.5 block text-xs text-slate-600">
                      Required to remember this choice and to keep the site working. These are the
                      only storage we use if you turn everything else off.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(event) => setAnalytics(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="font-medium text-slate-900">Analytics</span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      Google Analytics counts visits and shows which tools are used, in aggregate.
                      It sets cookies and shares your IP address with Google.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={ads}
                    onChange={(event) => setAds(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="font-medium text-slate-900">Advertising</span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      Google AdSense keeps the site free. Personalised ads use your activity across
                      sites; refusing still allows non-personalised ads.
                    </span>
                  </span>
                </label>
              </fieldset>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={rejectAll}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Reject all
              </button>
              {showDetails ? (
                <button
                  type="button"
                  onClick={() => save({ ads, analytics })}
                  className="rounded-xl border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  Save my choices
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDetails(true)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-brand-700 underline-offset-2 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  Manage options
                </button>
              )}
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                Your files are never uploaded regardless of this choice.{' '}
                <Link href="/cookies/" className="underline hover:text-slate-700">
                  Cookie Policy
                </Link>{' '}
                ·{' '}
                <Link href="/privacy/" className="underline hover:text-slate-700">
                  Privacy Policy
                </Link>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const BRAND_CONSENT_COPY =
  'Toolino uses cookies for two optional things: counting visits and showing ads that keep the site free. The tools themselves never need cookies, and your files are never uploaded. You can change your mind at any time from the footer.';
