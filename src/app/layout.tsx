import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ConsentProvider } from '@/components/consent/ConsentProvider';
import { ConsentBanner } from '@/components/consent/ConsentBanner';
import { Analytics } from '@/components/consent/Analytics';
import { AdsenseLoader } from '@/components/ads/AdsenseLoader';
import { AdSlotBudget } from '@/components/ads/AdSlot';
import { VisitorTracker } from '@/components/analytics/VisitorTracker';
import { JsonLd } from '@/components/seo/JsonLd';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
import { ROOT_METADATA } from '@/lib/seo/metadata';
import { BRAND } from '@/lib/site';

/**
 * Inter is self-hosted by `next/font` at build time: no request to Google Fonts
 * at runtime, no render-blocking stylesheet, and `display: 'swap'` so text is
 * painted immediately with the fallback face. That combination keeps LCP low on
 * slow connections and removes a third-party origin from the critical path.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
  // Only the weights actually used in the design system.
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = ROOT_METADATA;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Zooming must stay enabled: disabling it fails WCAG 1.4.4.
  maximumScale: 5,
  themeColor: '#1f47d6',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* Skip link: first focusable element on the page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>

        <ConsentProvider>
          {/*
            Site-wide structured data. Rendered once here rather than per page so
            every route references the same Organization and WebSite @id.
          */}
          <JsonLd nodes={[websiteSchema(), organizationSchema()]} />

          <Header />

          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer />

          {/* Consent-gated: neither renders anything before a decision. */}
          <AdsenseLoader />
          <Analytics />
          <AdSlotBudget />
          <ConsentBanner />
          <VisitorTracker />
        </ConsentProvider>

        {/* Machine-readable brand confirmation, used by the Contact page too. */}
        <meta name="author" content={BRAND.name} />
      </body>
    </html>
  );
}
