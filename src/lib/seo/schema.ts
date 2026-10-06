/**
 * JSON-LD structured data builders.
 *
 * Every builder returns a plain object that is serialized into a
 * `<script type="application/ld+json">` tag by `src/components/seo/JsonLd.tsx`.
 * Keeping them as pure functions means the shapes can be unit-tested and reused
 * by the sitemap validator.
 *
 * Schema types used: WebSite, Organization, SoftwareApplication, BreadcrumbList,
 * FAQPage, HowTo, Article, ContactPage, WebPage.
 */

import { absoluteUrl, BRAND, SITE_URL } from '@/lib/site';
import { toolPath } from '@/lib/tools';
import type { ToolRegistryEntry } from '@/data/toolRegistry';
import { CATEGORY_META } from '@/data/categories';

type JsonLdNode = Record<string, unknown>;

/** Stable `@id` for the site node, referenced by other graphs. */
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function websiteSchema(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: BRAND.name,
    description: BRAND.description,
    inLanguage: 'en',
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      // The site search is a client-side filter, so the target is the tools hub.
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/tools/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function organizationSchema(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: BRAND.name,
    url: `${SITE_URL}/`,
    description: BRAND.description,
    email: BRAND.email,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon-512.png'),
      width: 512,
      height: 512,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: BRAND.email,
        url: absoluteUrl('/contact/'),
        availableLanguage: ['English'],
      },
    ],
  };
}

export interface BreadcrumbEntry {
  name: string;
  /** Site-relative path. Omitted for the final crumb (the current page). */
  path?: string;
}

export function breadcrumbSchema(items: BreadcrumbEntry[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export function faqSchema(items: FaqEntry[]): JsonLdNode {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        // Plain text only: the rich-result parser rejects HTML here.
        text: item.answer.replace(/\s+/g, ' ').trim(),
      },
    })),
  };
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface HowToInput {
  name: string;
  description: string;
  steps: HowToStep[];
  path?: string;
  /** Total time as an ISO 8601 duration, e.g. `PT1M`. */
  totalTime?: string;
  supply?: string[];
  tool?: string[];
}

export function howToSchema(input: HowToInput): JsonLdNode {
  const basePath = input.path ?? toolPath('create-zip');
  return {
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    totalTime: input.totalTime ?? 'PT1M',
    ...(input.supply && input.supply.length > 0
      ? { supply: input.supply.map((item) => ({ '@type': 'HowToSupply', name: item })) }
      : {}),
    tool: (input.tool ?? ['A web browser']).map((item) => ({ '@type': 'HowToTool', name: item })),
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: `${absoluteUrl(basePath)}#step-${index + 1}`,
    })),
  };
}

/**
 * SoftwareApplication node for one tool.
 *
 * `offers.price = 0` and `isAccessibleForFree` are stated explicitly: these are
 * genuinely free tools, and the structured data has to match the page.
 */
export function softwareApplicationSchema(tool: ToolRegistryEntry): JsonLdNode {
  const url = absoluteUrl(toolPath(tool.slug));
  return {
    '@type': 'SoftwareApplication',
    '@id': `${url}#software`,
    name: `${tool.name} — ${BRAND.name}`,
    url,
    description: tool.metaDescription,
    applicationCategory: 'UtilitiesApplication',
    applicationSubCategory:
      CATEGORY_META[tool.category]?.navLabel ?? 'Online tool',
    operatingSystem: 'Any (runs in a web browser)',
    browserRequirements: 'Requires JavaScript and Web Workers. No installation, no account.',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    featureList: tool.outputFormats.map((format) => `Output: ${format}`),
    publisher: { '@id': ORGANIZATION_ID },
    // The privacy guarantee is a real, verifiable property of the software.
    softwareHelp: absoluteUrl('/privacy/'),
  };
}

export function webPageSchema(input: {
  path: string;
  name: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: 'en',
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}

export function articleSchema(input: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}): JsonLdNode {
  const url = absoluteUrl(input.path);
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: input.headline,
    description: input.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { '@type': 'Organization', name: BRAND.name, url: `${SITE_URL}/` },
    publisher: { '@id': ORGANIZATION_ID },
    image: absoluteUrl(input.image ?? '/og-default.png'),
    inLanguage: 'en',
  };
}

export function contactPageSchema(): JsonLdNode {
  return {
    '@type': 'ContactPage',
    '@id': `${absoluteUrl('/contact/')}#contact`,
    url: absoluteUrl('/contact/'),
    name: `Contact ${BRAND.name}`,
    description: `How to reach the ${BRAND.name} team with a question, a bug report or a business enquiry.`,
    isPartOf: { '@id': WEBSITE_ID },
  };
}

/**
 * Wraps several nodes into one `@graph` document.
 *
 * A single graph per page is preferable to multiple script tags: entities can
 * reference each other by `@id`, which is how Google resolves the publisher and
 * breadcrumb relationships.
 */
export function graph(nodes: JsonLdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
}
