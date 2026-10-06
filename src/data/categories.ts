/**
 * Category hub definitions.
 *
 * Five hubs, each with its own landing page at `/tools/<slug>/`. They exist for
 * two reasons: they give every tool a second internal link (good for crawl
 * depth) and they target the broad head terms that individual tool pages cannot.
 */

import type { CategoryMeta, CategorySlug } from '@/lib/tools';

export const CATEGORY_META: Record<CategorySlug, CategoryMeta> = {
  'file-tools': {
    slug: 'file-tools',
    title: 'File and Archive Tools',
    navLabel: 'File Tools',
    metaTitle: 'File and ZIP Tools Free - Compress and Unzip in Browser',
    metaDescription:
      'Create a ZIP from any files or a whole folder, and open existing archives, without uploading anything. Free browser-based file tools that keep your data local.',
    intro:
      'Zip a folder, pack mixed file types into one archive, or open an archive someone sent you. Everything runs locally inside your own browser tab without server uploads. Practical processing limits depend on your device memory.',
    kind: 'zip',
    icon: 'FolderArchive',
    accent: 'amber',
  },
  'pdf-tools': {
    slug: 'pdf-tools',
    title: 'PDF Tools',
    navLabel: 'PDF Tools',
    metaTitle: 'PDF Tools Online Free - Merge, Split, Compress, Protect',
    metaDescription:
      'Merge, split, compress, rotate, watermark, number, organise and password-protect PDF files in your browser. No upload, no signup, no server processing.',
    intro:
      'Ten PDF tools that run entirely on your device. Contracts, invoices, medical letters and ID scans stay on your computer, making this a private environment to prepare documents locally.',
    kind: 'pdf',
    icon: 'FileText',
    accent: 'rose',
  },
  'image-tools': {
    slug: 'image-tools',
    title: 'Image Tools',
    navLabel: 'Image Tools',
    metaTitle: 'Image Tools Free - Compress, Resize, Convert, Remove BG',
    metaDescription:
      'Compress, resize and convert JPG, PNG, WebP and AVIF images, remove backgrounds and read text from photos. All processed locally with no image uploads.',
    intro:
      'Six image tools built on the browser canvas and on-device machine learning. Photos carry EXIF metadata such as GPS coordinates, so processing them locally rather than uploading them is a real privacy difference, not a marketing line.',
    kind: 'image',
    icon: 'Image',
    accent: 'violet',
  },
  'text-tools': {
    slug: 'text-tools',
    title: 'Text and Developer Tools',
    navLabel: 'Text Tools',
    metaTitle: 'Text and Developer Tools Free - Word Count and JSON',
    metaDescription:
      'Count words and characters, check readability, and format or validate JSON with exact error positions. Runs offline in your browser and never sends your text.',
    intro:
      'Three tools for people who work with text: a live word and readability counter, a JSON formatter that pinpoints syntax errors, and a QR code generator with no tracking redirects.',
    kind: 'text',
    icon: 'Braces',
    accent: 'sky',
  },
  calculators: {
    slug: 'calculators',
    title: 'Everyday Calculators',
    navLabel: 'Calculators',
    metaTitle: 'Free Online Calculators - Age, Percentage, EMI, GST, Discount',
    metaDescription:
      'Work out age, percentages, stacked discounts, loan EMIs with a full amortization schedule, and GST with CGST and SGST splits. Free, instant, and private.',
    intro:
      'Five calculators that show the formula behind the answer rather than just the number, so you can check the working yourself. Nothing you type is logged or sent anywhere.',
    kind: 'calculator',
    icon: 'Calculator',
    accent: 'emerald',
  },
};

export const CATEGORY_ORDER: CategorySlug[] = [
  'file-tools',
  'pdf-tools',
  'image-tools',
  'text-tools',
  'calculators',
];
