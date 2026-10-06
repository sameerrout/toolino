/**
 * Brand + deployment constants.
 *
 * ONE brand name and ONE domain across the whole project. The domain comes from
 * `NEXT_PUBLIC_SITE_URL` so that staging and production builds cannot drift, and
 * every canonical tag, sitemap entry, robots rule, JSON-LD `@id` and Open Graph
 * URL reads from here.
 */

/**
 * Configurable support email address.
 * Reads from `NEXT_PUBLIC_SUPPORT_EMAIL`. If not set or if set to an example placeholder,
 * returns null so the live website never displays a fake or placeholder email to visitors.
 * When null, user interfaces gracefully fall back to our neutral on-site contact form.
 */
const RAW_SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '').trim();
export const SUPPORT_EMAIL: string | null =
  RAW_SUPPORT_EMAIL && !/(?:example|yourdomain)\.(?:com|org|net)/i.test(RAW_SUPPORT_EMAIL)
    ? RAW_SUPPORT_EMAIL
    : null;

export const BRAND = {
  /** User-facing brand name. Used in titles, footer, JSON-LD, emails. */
  name: 'Toolino',
  /** Short tagline shown in the footer and the manifest. */
  tagline: 'All-in-One Free Online Tools',
  /** Longer positioning line used on the homepage and in the Organization schema. */
  description:
    'Free, fast, and privacy-conscious online tools. Convert, edit, and optimize PDFs, images, and documents easily inside your browser without uploading files to servers.',
  /** Public contact address for the Contact page and legal notices (null if not yet set). */
  email: SUPPORT_EMAIL,
  /** Postal-style locality used in legal pages (kept generic on purpose). */
  jurisdiction: 'England and Wales',
  /** Twitter/X handle, or null when the site has no account yet. */
  twitter: null as string | null,
} as const;

/** Trailing-slash-free canonical origin. Configurable via NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://toolino-one.vercel.app'
).replace(/\/+$/, '');

/** Builds an absolute URL for a site-relative path. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/** AdSense publisher id, or an empty string when ads are disabled. */
export const ADSENSE_CLIENT = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '').trim();

/** True when a real publisher id is configured. */
export const ADSENSE_ENABLED = /^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);

/** Google Analytics 4 measurement id, or an empty string when disabled. */
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? '').trim();

export const GA_ENABLED = /^G-[A-Z0-9]{4,}$/i.test(GA_ID);

/**
 * Asset origins for the two on-device AI models.
 *
 * Both default to public CDNs because only the *model weights* are fetched -
 * never the user's file. Override them with your own origin after running
 * `node scripts/vendor-models.mjs` to serve everything from your own bucket.
 */
export const OCR_ASSET_BASE = (
  process.env.NEXT_PUBLIC_OCR_ASSET_BASE ?? 'https://cdn.jsdelivr.net/npm'
).replace(/\/+$/, '');

export const BG_REMOVAL_ASSET_BASE = (
  process.env.NEXT_PUBLIC_BG_REMOVAL_ASSET_BASE ?? 'https://staticimgly.com'
).replace(/\/+$/, '');

/** Copyright line for the footer. Computed once at build time. */
export const COPYRIGHT_YEAR = new Date().getFullYear();
