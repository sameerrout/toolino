import type { ToolSlug } from '@/lib/tools';
import type { ToolContent } from '@/content/types';

import { createZipContent } from '@/content/tools/create-zip';
import { extractZipContent } from '@/content/tools/extract-zip';
import { mergePdfContent } from '@/content/tools/merge-pdf';
import { splitPdfContent } from '@/content/tools/split-pdf';
import { compressPdfContent } from '@/content/tools/compress-pdf';
import { rotatePdfContent } from '@/content/tools/rotate-pdf';
import { watermarkPdfContent } from '@/content/tools/watermark-pdf';
import { pdfPageNumbersContent } from '@/content/tools/pdf-page-numbers';
import { organizePdfContent } from '@/content/tools/organize-pdf';
import { protectPdfContent } from '@/content/tools/protect-pdf';
import { imageToPdfContent } from '@/content/tools/image-to-pdf';
import { pdfToImageContent } from '@/content/tools/pdf-to-image';
import { compressImageContent } from '@/content/tools/compress-image';
import { resizeImageContent } from '@/content/tools/resize-image';
import { convertImageContent } from '@/content/tools/convert-image';
import { removeBackgroundContent } from '@/content/tools/remove-background';
import { imageToTextContent } from '@/content/tools/image-to-text';
import { passportPhotoContent } from '@/content/tools/passport-photo';
import { wordCounterContent } from '@/content/tools/word-counter';
import { jsonFormatterContent } from '@/content/tools/json-formatter';
import { qrCodeGeneratorContent } from '@/content/tools/qr-code-generator';
import { ageCalculatorContent } from '@/content/tools/age-calculator';
import { percentageCalculatorContent } from '@/content/tools/percentage-calculator';
import { discountCalculatorContent } from '@/content/tools/discount-calculator';
import { emiCalculatorContent } from '@/content/tools/emi-calculator';
import { gstCalculatorContent } from '@/content/tools/gst-calculator';

/**
 * Slug -> long-form SEO content.
 *
 * A complete `Record`, so adding a slug without prose fails the type check
 * rather than shipping a thin page. `tests/seo/content.test.ts` additionally
 * enforces the 400-word minimum and the FAQ count on every entry.
 */
export const TOOL_CONTENT: Record<ToolSlug, ToolContent> = {
  'create-zip': createZipContent,
  'extract-zip': extractZipContent,
  'merge-pdf': mergePdfContent,
  'split-pdf': splitPdfContent,
  'compress-pdf': compressPdfContent,
  'rotate-pdf': rotatePdfContent,
  'watermark-pdf': watermarkPdfContent,
  'pdf-page-numbers': pdfPageNumbersContent,
  'organize-pdf': organizePdfContent,
  'protect-pdf': protectPdfContent,
  'image-to-pdf': imageToPdfContent,
  'pdf-to-image': pdfToImageContent,
  'compress-image': compressImageContent,
  'resize-image': resizeImageContent,
  'convert-image': convertImageContent,
  'remove-background': removeBackgroundContent,
  'image-to-text': imageToTextContent,
  'passport-photo': passportPhotoContent,
  'word-counter': wordCounterContent,
  'json-formatter': jsonFormatterContent,
  'qr-code-generator': qrCodeGeneratorContent,
  'age-calculator': ageCalculatorContent,
  'percentage-calculator': percentageCalculatorContent,
  'discount-calculator': discountCalculatorContent,
  'emi-calculator': emiCalculatorContent,
  'gst-calculator': gstCalculatorContent,
};
