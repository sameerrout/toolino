import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY } from '@/data/toolRegistry';
import { TOOL_CONTENT } from '@/data/toolContent';
import { TOOL_SLUGS, toolPath } from '@/lib/tools';
import { countContentWords } from '@/content/types';

describe('SEO & Metadata Integrity Verification', () => {
  it('registers all 27 canonical tools with matching slugs', () => {
    expect(TOOL_REGISTRY.length).toBe(TOOL_SLUGS.length);
    const registrySlugs = TOOL_REGISTRY.map((t) => t.slug).sort();
    const definedSlugs = [...TOOL_SLUGS].sort();
    expect(registrySlugs).toEqual(definedSlugs);
  });

  it('guarantees clean canonical URL format (/tools/<slug>/) for every tool', () => {
    for (const tool of TOOL_REGISTRY) {
      const url = toolPath(tool.slug);
      expect(url).toBe(`/tools/${tool.slug}/`);
      expect(url.startsWith('/tools/')).toBe(true);
      expect(url.endsWith('/')).toBe(true);
    }
  });

  it('verifies SEO title length and meta description length per tool', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.metaTitle.length).toBeGreaterThanOrEqual(40);
      expect(tool.metaTitle.length).toBeLessThanOrEqual(75);

      expect(tool.metaDescription.length).toBeGreaterThanOrEqual(100);
      expect(tool.metaDescription.length).toBeLessThanOrEqual(180);

      expect(tool.related.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('enforces rich content: at least 400 words and at least 5 FAQs for every tool', () => {
    for (const slug of TOOL_SLUGS) {
      const content = TOOL_CONTENT[slug];
      expect(content, `Missing content for ${slug}`).toBeDefined();

      const words = countContentWords(content);
      expect(
        words,
        `Tool "${slug}" has only ${words} words; minimum required is 400.`
      ).toBeGreaterThanOrEqual(400);

      expect(
        content.faqs.length,
        `Tool "${slug}" has only ${content.faqs.length} FAQs; minimum required is 5.`
      ).toBeGreaterThanOrEqual(5);

      expect(content.howTo.steps.length).toBeGreaterThanOrEqual(3);
      expect(content.benefits.items.length).toBeGreaterThanOrEqual(4);
      expect(content.privacy.paragraphs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('verifies SITE_URL is strictly https://www.toolforforever.com', async () => {
    const { SITE_URL, PRODUCTION_SITE_URL, canonicalUrl } = await import('@/lib/site');
    expect(PRODUCTION_SITE_URL).toBe('https://www.toolforforever.com');
    expect(SITE_URL).toBe('https://www.toolforforever.com');

    expect(canonicalUrl('/')).toBe('https://www.toolforforever.com/');
    expect(canonicalUrl('/tools/merge-pdf/')).toBe('https://www.toolforforever.com/tools/merge-pdf/');
    expect(canonicalUrl('/blog/how-to-compress-pdf/')).toBe('https://www.toolforforever.com/blog/how-to-compress-pdf/');
  });

  it('generates sitemap with 100% production domain and zero legacy domains', async () => {
    const sitemapModule = await import('@/app/sitemap');
    const sitemap = sitemapModule.default();

    expect(sitemap.length).toBeGreaterThanOrEqual(45);

    // Verify all URLs use production domain
    for (const entry of sitemap) {
      expect(entry.url).toMatch(/^https:\/\/www\.toolforforever\.com(\/.*)?$/);
      expect(entry.url).not.toContain('toolino-iota.vercel.app');
      expect(entry.url).not.toContain('vercel.app');
      expect(entry.url).not.toContain('localhost');
      expect(entry.url.endsWith('/')).toBe(true);

      // Verify no private or auth routes exist in sitemap
      expect(entry.url).not.toContain('/manager');
      expect(entry.url).not.toContain('/admin');
      expect(entry.url).not.toContain('/signin');
      expect(entry.url).not.toContain('/signup');
      expect(entry.url).not.toContain('/login');
      expect(entry.url).not.toContain('/forgot-password');
      expect(entry.url).not.toContain('/reset-password');
      expect(entry.url).not.toContain('/api/');
    }

    // Check specific essential pages are present
    const urls = sitemap.map((e) => e.url);
    expect(urls).toContain('https://www.toolforforever.com/');
    expect(urls).toContain('https://www.toolforforever.com/tools/');
    expect(urls).toContain('https://www.toolforforever.com/blog/');
    expect(urls).toContain('https://www.toolforforever.com/about/');
    expect(urls).toContain('https://www.toolforforever.com/contact/');
    expect(urls).toContain('https://www.toolforforever.com/privacy/');
    expect(urls).toContain('https://www.toolforforever.com/terms/');
    expect(urls).toContain('https://www.toolforforever.com/cookies/');
    expect(urls).toContain('https://www.toolforforever.com/disclaimer/');

    // Check category hubs
    expect(urls).toContain('https://www.toolforforever.com/tools/pdf-tools/');
    expect(urls).toContain('https://www.toolforforever.com/tools/image-tools/');
    expect(urls).toContain('https://www.toolforforever.com/tools/file-tools/');
    expect(urls).toContain('https://www.toolforforever.com/tools/text-tools/');
    expect(urls).toContain('https://www.toolforforever.com/tools/calculators/');

    // Check sample tool and blog
    expect(urls).toContain('https://www.toolforforever.com/tools/merge-pdf/');
    expect(urls).toContain('https://www.toolforforever.com/blog/how-to-merge-pdfs-without-uploading-them/');
  });

  it('generates robots.txt referencing correct production sitemap and disallowing manager/admin', async () => {
    const robotsModule = await import('@/app/robots');
    const robots = robotsModule.default();

    expect(robots.sitemap).toBe('https://www.toolforforever.com/sitemap.xml');
    expect(robots.host).toBe('https://www.toolforforever.com');

    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const userAgentRule = rules.find((r) => r.userAgent === '*');
    expect(userAgentRule).toBeDefined();

    const disallow = Array.isArray(userAgentRule?.disallow)
      ? userAgentRule?.disallow
      : [userAgentRule?.disallow];

    expect(disallow).toContain('/manager/');
    expect(disallow).toContain('/admin/');
    expect(disallow).toContain('/api/');
  });
});

