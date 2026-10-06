import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * robots.txt
 *
 * Everything is crawlable: there are no accounts, no search result pages and no
 * internal endpoints left after the move to static hosting. The only exclusions
 * are the generated asset directories and the redirect stubs, which are not
 * content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Build output and vendored worker bundles.
          '/_next/static/chunks/',
          // Machine-generated legacy redirect stubs.
          '/go/',
          // Internal API routes
          '/api/',
        ],
      },
      {
        // AdSense crawler must be able to read every page that carries ad code.
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
      {
        userAgent: 'AdsBot-Google',
        allow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
