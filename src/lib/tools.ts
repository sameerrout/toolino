/**
 * Canonical tool + category identifiers.
 *
 * One tool = one entry here = one canonical URL `/tools/<slug>/`.
 * Nothing in `src/` may hard-code a tool URL string; use {@link toolPath}.
 */

export const TOOL_SLUGS = [
  // ---- ZIP / file tools -------------------------------------------------
  'create-zip',
  'extract-zip',
  // ---- PDF tools --------------------------------------------------------
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'rotate-pdf',
  'watermark-pdf',
  'pdf-page-numbers',
  'organize-pdf',
  'protect-pdf',
  'image-to-pdf',
  'pdf-to-image',
  // ---- Image tools ------------------------------------------------------
  'compress-image',
  'resize-image',
  'convert-image',
  'remove-background',
  'image-to-text',
  'passport-photo',
  // ---- Text & developer tools -------------------------------------------
  'word-counter',
  'json-formatter',
  'qr-code-generator',
  // ---- Calculators ------------------------------------------------------
  'age-calculator',
  'percentage-calculator',
  'discount-calculator',
  'emi-calculator',
  'gst-calculator',
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

export const CATEGORY_SLUGS = [
  'file-tools',
  'pdf-tools',
  'image-tools',
  'text-tools',
  'calculators',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** The tool's dominant input family, used for hub grouping + related tools. */
export type ToolKind = 'zip' | 'pdf' | 'image' | 'text' | 'calculator';

/**
 * How much of the user's machine a tool needs. Drives the automatic
 * downgrade warnings on low-end devices (see `src/lib/device.ts`).
 */
export type ToolWeight = 'light' | 'medium' | 'heavy';

export interface CategoryMeta {
  slug: CategorySlug;
  /** <h1> of the hub page. */
  title: string;
  /** Short label used in nav/dropdowns. */
  navLabel: string;
  /** 50-60 char <title>. */
  metaTitle: string;
  /** 140-160 char meta description. */
  metaDescription: string;
  /** 2 sentence intro shown above the card grid on the hub page. */
  intro: string;
  kind: ToolKind;
  /** lucide-react icon name, resolved in `src/components/common/ToolIcon.tsx`. */
  icon: string;
  /** Tailwind colour token stem, e.g. `brand`, `emerald`, `violet`. */
  accent: string;
}

/** Builds the single canonical, trailing-slash URL for a tool. */
export function toolPath(slug: ToolSlug): `/tools/${ToolSlug}/` {
  return `/tools/${slug}/`;
}

/** Builds the single canonical, trailing-slash URL for a category hub. */
export function categoryPath(slug: CategorySlug): `/tools/${CategorySlug}/` {
  return `/tools/${slug}/`;
}

export function isToolSlug(value: string): value is ToolSlug {
  return (TOOL_SLUGS as readonly string[]).includes(value);
}

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}
