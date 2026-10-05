import type { ComponentType } from 'react';
import type { ToolSlug } from '@/lib/tools';

// Tool UIs. Every one of these is a Client Component, so the bundler splits each
// into its own chunk: opening one tool never downloads another tool's libraries.
import { CreateZipTool } from '@/tools/create-zip/CreateZipTool';
import { ExtractZipTool } from '@/tools/extract-zip/ExtractZipTool';
import { MergePdfTool } from '@/tools/merge-pdf/MergePdfTool';
import { SplitPdfTool } from '@/tools/split-pdf/SplitPdfTool';
import { CompressPdfTool } from '@/tools/compress-pdf/CompressPdfTool';
import { RotatePdfTool } from '@/tools/rotate-pdf/RotatePdfTool';
import { WatermarkPdfTool } from '@/tools/watermark-pdf/WatermarkPdfTool';
import { PdfPageNumbersTool } from '@/tools/pdf-page-numbers/PdfPageNumbersTool';
import { OrganizePdfTool } from '@/tools/organize-pdf/OrganizePdfTool';
import { ProtectPdfTool } from '@/tools/protect-pdf/ProtectPdfTool';
import { ImageToPdfTool } from '@/tools/image-to-pdf/ImageToPdfTool';
import { PdfToImageTool } from '@/tools/pdf-to-image/PdfToImageTool';
import { CompressImageTool } from '@/tools/compress-image/CompressImageTool';
import { ResizeImageTool } from '@/tools/resize-image/ResizeImageTool';
import { ConvertImageTool } from '@/tools/convert-image/ConvertImageTool';
import { RemoveBackgroundTool } from '@/tools/remove-background/RemoveBackgroundTool';
import { ImageToTextTool } from '@/tools/image-to-text/ImageToTextTool';
import { PassportPhotoTool } from '@/tools/passport-photo/PassportPhotoTool';
import { WordCounterTool } from '@/tools/word-counter/WordCounterTool';
import { JsonFormatterTool } from '@/tools/json-formatter/JsonFormatterTool';
import { QrCodeGeneratorTool } from '@/tools/qr-code-generator/QrCodeGeneratorTool';
import { AgeCalculatorTool } from '@/tools/age-calculator/AgeCalculatorTool';
import { PercentageCalculatorTool } from '@/tools/percentage-calculator/PercentageCalculatorTool';
import { DiscountCalculatorTool } from '@/tools/discount-calculator/DiscountCalculatorTool';
import { EmiCalculatorTool } from '@/tools/emi-calculator/EmiCalculatorTool';
import { GstCalculatorTool } from '@/tools/gst-calculator/GstCalculatorTool';

/**
 * Slug -> interactive tool component.
 *
 * Deliberately a complete `Record`, not a partial one: TypeScript fails the
 * build the moment a slug is added to `TOOL_SLUGS` without a component here, so
 * an empty or missing tool page cannot ship.
 */
export const TOOL_COMPONENTS: Record<ToolSlug, ComponentType> = {
  'create-zip': CreateZipTool,
  'extract-zip': ExtractZipTool,
  'merge-pdf': MergePdfTool,
  'split-pdf': SplitPdfTool,
  'compress-pdf': CompressPdfTool,
  'rotate-pdf': RotatePdfTool,
  'watermark-pdf': WatermarkPdfTool,
  'pdf-page-numbers': PdfPageNumbersTool,
  'organize-pdf': OrganizePdfTool,
  'protect-pdf': ProtectPdfTool,
  'image-to-pdf': ImageToPdfTool,
  'pdf-to-image': PdfToImageTool,
  'compress-image': CompressImageTool,
  'resize-image': ResizeImageTool,
  'convert-image': ConvertImageTool,
  'remove-background': RemoveBackgroundTool,
  'image-to-text': ImageToTextTool,
  'passport-photo': PassportPhotoTool,
  'word-counter': WordCounterTool,
  'json-formatter': JsonFormatterTool,
  'qr-code-generator': QrCodeGeneratorTool,
  'age-calculator': AgeCalculatorTool,
  'percentage-calculator': PercentageCalculatorTool,
  'discount-calculator': DiscountCalculatorTool,
  'emi-calculator': EmiCalculatorTool,
  'gst-calculator': GstCalculatorTool,
};
