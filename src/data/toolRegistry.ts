/**
 * The Toolino tool registry - the single source of truth.
 *
 * Everything derives from this file: static routes, sitemap.xml, navigation,
 * category hubs, related-tool links, breadcrumbs, JSON-LD and the SEO prose
 * files in `src/content/tools/*`. Adding a tool is a two-step job (register it
 * here, add `src/tools/<slug>/Tool.tsx`); see README "Adding a new tool".
 *
 * The module is plain data with no imports from tool UI, so it can be consumed
 * by Server Components without pulling a single byte of client JavaScript.
 */

import {
  CATEGORY_SLUGS,
  TOOL_SLUGS,
  type CategorySlug,
  type ToolKind,
  type ToolSlug,
  type ToolWeight,
} from '@/lib/tools';

export interface ToolRegistryEntry {
  slug: ToolSlug;
  /** Card + <h1> name. */
  name: string;
  /** Category hub this tool belongs to. */
  category: CategorySlug;
  kind: ToolKind;
  weight: ToolWeight;
  /** 50-60 character <title>. Written to fit, not truncated later. */
  metaTitle: string;
  /** 140-160 character meta description. */
  metaDescription: string;
  /** One-sentence summary used on cards and in the sitemap. */
  tagline: string;
  /** Lowercase extensions including the dot. Empty = any file type. */
  accept: string[];
  /** `accept` attribute for the file input. */
  acceptAttribute: string;
  /** Extensions that make the tool skip a round-trip to the user. */
  outputFormats: string[];
  /** Shown as a badge on the card. */
  badge?: string;
  /** Featured on the homepage and at the top of its hub. */
  featured?: boolean;
  /** Hidden from the homepage grid (still routable + in the sitemap). */
  unlisted?: boolean;
  /** Slugs shown in the "related tools" block, in order. */
  related: ToolSlug[];
  /** Long-tail landing pages that 301-redirect to this tool. */
  legacyPaths: string[];
  /** Primary search phrase the page targets. */
  keyword: string;
  /** 3-5 secondary phrases woven into the prose. */
  secondaryKeywords: string[];
  /** Two lines describing the privacy guarantee, shown under the tool. */
  privacyNote: string;
}

const PDF_ACCEPT = ['.pdf'];

export const TOOL_REGISTRY: ToolRegistryEntry[] = [
  // =========================================================================
  // File & archive tools
  // =========================================================================
  {
    slug: 'create-zip',
    name: 'All Files to ZIP',
    category: 'file-tools',
    kind: 'zip',
    weight: 'medium',
    metaTitle: 'Create ZIP File Online - Any Files, In Your Browser',
    metaDescription:
      'Make a ZIP file from any file type or a whole folder, right in your browser. Nothing is uploaded. Folder structure is preserved, with Store, Fast or Best compression.',
    tagline: 'Compress any files or an entire folder into one ZIP - nothing leaves your device.',
    accept: [],
    acceptAttribute: '*/*',
    outputFormats: ['ZIP'],
    badge: 'Any file type',
    featured: true,
    related: ['extract-zip', 'compress-image', 'compress-pdf', 'pdf-to-image'],
    legacyPaths: ['/files-to-zip', '/folder-to-zip', '/zip-files', '/create-zip', '/zip'],
    keyword: 'create zip file online',
    secondaryKeywords: [
      'files to zip',
      'folder to zip online',
      'compress files into zip',
      'zip maker no upload',
    ],
    privacyNote:
      'Your files are read straight from your disk by your browser and compressed locally on your own device. Nothing is uploaded to any server. Practical limits depend on browser memory and available disk space.',
  },
  {
    slug: 'extract-zip',
    name: 'Extract ZIP',
    category: 'file-tools',
    kind: 'zip',
    weight: 'medium',
    metaTitle: 'Unzip Files Online - Open a ZIP in Your Browser',
    metaDescription:
      'Open and extract ZIP archives in your browser with no upload. Browse every entry, download individual files, or save the whole folder structure at once.',
    tagline: 'Open a ZIP archive, inspect its contents and download what you need.',
    accept: ['.zip'],
    acceptAttribute: '.zip,application/zip,application/x-zip-compressed',
    outputFormats: ['Any'],
    badge: 'No upload',
    related: ['create-zip', 'merge-pdf', 'compress-image', 'pdf-to-image'],
    legacyPaths: ['/unzip', '/unzip-online', '/open-zip', '/extract-files'],
    keyword: 'unzip files online',
    secondaryKeywords: ['extract zip', 'open zip file', 'zip extractor online', 'unzip without software'],
    privacyNote:
      'The archive is decompressed by your browser on your own device. The contents are never transmitted anywhere.',
  },

  // =========================================================================
  // PDF tools
  // =========================================================================
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'medium',
    metaTitle: 'Merge PDF Files Online Free - Combine PDFs Locally',
    metaDescription:
      'Combine several PDF files into one document in the order you choose. Runs fully in your browser, so contracts and invoices are never uploaded to a server.',
    tagline: 'Combine multiple PDFs into one document, in any order you like.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    badge: 'Client-side',
    featured: true,
    related: ['split-pdf', 'compress-pdf', 'organize-pdf', 'rotate-pdf'],
    legacyPaths: ['/pdf-merger', '/combine-pdf', '/join-pdf', '/merge-pdf-online'],
    keyword: 'merge pdf files',
    secondaryKeywords: ['combine pdf', 'join pdf online', 'merge pdf without uploading'],
    privacyNote:
      'Merging happens with PDF-LIB inside your browser tab. Your documents never touch a network connection.',
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'medium',
    metaTitle: 'Split PDF Online Free - Extract Pages in Your Browser',
    metaDescription:
      'Split a PDF into separate files or extract a page range. Choose single pages or custom ranges and download them one by one or as a single ZIP. No upload.',
    tagline: 'Extract page ranges or split a document into individual pages.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF', 'ZIP'],
    badge: 'Client-side',
    featured: true,
    related: ['merge-pdf', 'organize-pdf', 'rotate-pdf', 'compress-pdf'],
    legacyPaths: ['/pdf-splitter', '/split-pdf-online', '/extract-pdf-pages'],
    keyword: 'split pdf',
    secondaryKeywords: ['extract pdf pages', 'pdf splitter', 'split pdf by range'],
    privacyNote:
      'Pages are copied locally with PDF-LIB. Nothing is sent anywhere, which is why it works offline once the page has loaded.',
  },
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'heavy',
    metaTitle: 'Compress PDF Online Free - Shrink PDFs Without Upload',
    metaDescription:
      'Reduce PDF file size by re-encoding embedded images. Three quality levels, a live size estimate and no upload - your document stays on your own device.',
    tagline: 'Shrink scanned and image-heavy PDFs while keeping them readable.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    badge: 'Client-side',
    featured: true,
    related: ['merge-pdf', 'split-pdf', 'pdf-to-image', 'compress-image'],
    legacyPaths: ['/pdf-compressor', '/reduce-pdf-size', '/shrink-pdf'],
    keyword: 'compress pdf',
    secondaryKeywords: ['reduce pdf size', 'pdf compressor online', 'shrink pdf file'],
    privacyNote:
      'Pages are rasterised and re-encoded with the canvas API on your device. Nothing is uploaded, and no copy of your file is stored.',
  },
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'light',
    metaTitle: 'Rotate PDF Online Free - Turn Pages Without Uploading',
    metaDescription:
      'Rotate every page or just the sideways ones by 90, 180 or 270 degrees. Lossless, instant and completely offline - your PDF is never uploaded.',
    tagline: 'Fix sideways scans by rotating all pages or just the ones you pick.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    related: ['organize-pdf', 'merge-pdf', 'split-pdf', 'pdf-page-numbers'],
    legacyPaths: ['/pdf-rotator', '/rotate-pdf-online', '/turn-pdf-pages'],
    keyword: 'rotate pdf',
    secondaryKeywords: ['rotate pdf pages', 'fix sideways pdf', 'turn pdf online'],
    privacyNote:
      'Rotation only rewrites the page dictionary, so it is lossless and completes in milliseconds. No data leaves your device.',
  },
  {
    slug: 'watermark-pdf',
    name: 'Watermark PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'light',
    metaTitle: 'Watermark PDF Online Free - Add Text Watermarks Locally',
    metaDescription:
      'Stamp a text watermark such as Draft or Confidential across your PDF pages. Control size, colour, opacity, rotation and position. Nothing is uploaded.',
    tagline: 'Add a Draft, Confidential or custom text watermark to every page.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    related: ['pdf-page-numbers', 'protect-pdf', 'merge-pdf', 'organize-pdf'],
    legacyPaths: ['/add-watermark-to-pdf', '/pdf-watermark', '/stamp-pdf'],
    keyword: 'watermark pdf',
    secondaryKeywords: ['add watermark to pdf', 'pdf stamp', 'confidential watermark'],
    privacyNote:
      'PDF-LIB draws the watermark using the standard Type 1 fonts built into every PDF reader, so no font files are downloaded and nothing is uploaded.',
  },
  {
    slug: 'pdf-page-numbers',
    name: 'PDF Page Numbers',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'light',
    metaTitle: 'Add Page Numbers to PDF Free - Number Pages Locally',
    metaDescription:
      'Add page numbers to a PDF with your choice of position, format, font size and starting number. Skip the cover page if you like. No upload, no watermark added.',
    tagline: 'Number the pages of any PDF, in the position and format you want.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    related: ['watermark-pdf', 'organize-pdf', 'merge-pdf', 'split-pdf'],
    legacyPaths: ['/pdf-page-numbering', '/number-pdf-pages', '/add-pdf-page-numbers'],
    keyword: 'add page numbers to pdf',
    secondaryKeywords: ['pdf page numbering', 'number pdf pages', 'bates numbering simple'],
    privacyNote:
      'Numbering is drawn locally with PDF-LIB at the exact position you choose. Your document is never transmitted.',
  },
  {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'heavy',
    metaTitle: 'Organize PDF Pages Free - Reorder, Delete, Duplicate',
    metaDescription:
      'Reorder, delete, duplicate or reverse PDF pages with a visual thumbnail grid. Everything runs in your browser and your document is never uploaded.',
    tagline: 'Drag pages into the right order, or delete and duplicate them.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    related: ['split-pdf', 'merge-pdf', 'rotate-pdf', 'pdf-page-numbers'],
    legacyPaths: ['/pdf-organizer', '/reorder-pdf-pages', '/delete-pdf-pages'],
    keyword: 'organize pdf pages',
    secondaryKeywords: ['reorder pdf', 'delete pdf pages', 'rearrange pdf online'],
    privacyNote:
      'Thumbnails are rendered by pdf.js on your own device, a few pages at a time so memory stays low. Nothing is uploaded.',
  },
  {
    slug: 'protect-pdf',
    name: 'Protect PDF',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'light',
    metaTitle: 'Password Protect PDF Free - Encrypt Locally, No Upload',
    metaDescription:
      'Add a password to a PDF with local encryption. Set separate owner and user passwords and restrict printing or copying. Your file is never sent to a server.',
    tagline: 'Encrypt a PDF with a password, entirely on your own device.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PDF'],
    badge: 'Local encryption',
    related: ['watermark-pdf', 'merge-pdf', 'organize-pdf', 'compress-pdf'],
    legacyPaths: ['/pdf-protect', '/password-protect-pdf', '/encrypt-pdf'],
    keyword: 'password protect pdf',
    secondaryKeywords: ['encrypt pdf', 'pdf password online', 'secure pdf file'],
    privacyNote:
      'Password-protect your PDF locally in your browser using standard PDF encryption. Because the password and document never leave your device, your private files stay on your machine.',
  },
  {
    slug: 'image-to-pdf',
    name: 'Image to PDF',
    category: 'pdf-tools',
    kind: 'image',
    weight: 'medium',
    metaTitle: 'Image to PDF Converter Free - JPG and PNG to PDF',
    metaDescription:
      'Turn JPG, PNG, WebP and AVIF images into a single PDF. Choose page size, orientation, margin and fit. Runs in your browser with no upload and no signup.',
    tagline: 'Combine photos and scans into one clean, printable PDF.',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.gif'],
    acceptAttribute: 'image/*',
    outputFormats: ['PDF'],
    badge: 'Client-side',
    featured: true,
    related: ['pdf-to-image', 'compress-image', 'resize-image', 'merge-pdf'],
    legacyPaths: ['/jpg-to-pdf', '/png-to-pdf', '/images-to-pdf', '/photo-to-pdf'],
    keyword: 'image to pdf',
    secondaryKeywords: ['jpg to pdf', 'png to pdf', 'combine images into pdf'],
    privacyNote:
      'Images are decoded and placed into the PDF by your browser. Photos of ID documents and receipts never leave your device.',
  },
  {
    slug: 'pdf-to-image',
    name: 'PDF to Image',
    category: 'pdf-tools',
    kind: 'pdf',
    weight: 'heavy',
    metaTitle: 'PDF to JPG or PNG Free - Convert Pages in Your Browser',
    metaDescription:
      'Convert PDF pages to sharp JPG or PNG images. Pick the resolution and page range, then download pages individually or together as a ZIP. No upload.',
    tagline: 'Turn PDF pages into high-resolution JPG or PNG images.',
    accept: PDF_ACCEPT,
    acceptAttribute: 'application/pdf,.pdf',
    outputFormats: ['PNG', 'JPG', 'ZIP'],
    badge: 'Up to 3000 px',
    featured: true,
    related: ['image-to-pdf', 'compress-pdf', 'split-pdf', 'create-zip'],
    legacyPaths: ['/pdf2image', '/pdf-to-jpg', '/pdf-to-png', '/pdf-to-image-converter'],
    keyword: 'pdf to image',
    secondaryKeywords: ['pdf to jpg', 'pdf to png', 'convert pdf pages to images'],
    privacyNote:
      'Pages are rendered with pdf.js on your device, one page at a time, so even long documents stay within memory.',
  },

  // =========================================================================
  // Image tools
  // =========================================================================
  {
    slug: 'compress-image',
    name: 'Compress Image',
    category: 'image-tools',
    kind: 'image',
    weight: 'medium',
    metaTitle: 'Compress Images Online Free - No Upload, No Quality Loss',
    metaDescription:
      'Compress JPG, PNG, WebP and AVIF images to an exact target size or quality level. Batch up to 60 files, compare before and after, and download as a ZIP.',
    tagline: 'Shrink photos to a target size without visibly losing quality.',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
    acceptAttribute: 'image/jpeg,image/png,image/webp,image/avif',
    outputFormats: ['JPG', 'PNG', 'WebP', 'AVIF', 'ZIP'],
    badge: 'Target size',
    featured: true,
    related: ['resize-image', 'convert-image', 'create-zip', 'image-to-pdf'],
    legacyPaths: ['/image-compressor', '/compress-jpg', '/compress-png', '/reduce-image-size'],
    keyword: 'compress image',
    secondaryKeywords: ['compress jpg', 'image compressor online', 'reduce photo size'],
    privacyNote:
      'Photos are re-encoded by your browser canvas. Personal pictures are never uploaded, which matters because photos carry EXIF metadata such as GPS location.',
  },
  {
    slug: 'resize-image',
    name: 'Resize Image',
    category: 'image-tools',
    kind: 'image',
    weight: 'medium',
    metaTitle: 'Resize Image Online Free - Pixels, Percent or Presets',
    metaDescription:
      'Resize JPG, PNG, WebP and AVIF images by exact pixels, percentage or social media preset. Lock the aspect ratio and batch resize up to 60 files locally.',
    tagline: 'Change image dimensions by pixels, percent or a ready-made preset.',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
    acceptAttribute: 'image/jpeg,image/png,image/webp,image/avif',
    outputFormats: ['JPG', 'PNG', 'WebP', 'ZIP'],
    badge: 'Aspect lock',
    featured: true,
    related: ['compress-image', 'convert-image', 'passport-photo', 'create-zip'],
    legacyPaths: ['/image-resizer', '/resize-jpg', '/scale-image', '/change-image-size'],
    keyword: 'resize image',
    secondaryKeywords: ['resize jpg online', 'image resizer', 'scale image pixels'],
    privacyNote:
      'Scaling uses high-quality step-down resampling in your browser tab. Your images are never sent to a server.',
  },
  {
    slug: 'convert-image',
    name: 'Convert Image',
    category: 'image-tools',
    kind: 'image',
    weight: 'medium',
    metaTitle: 'Image Converter Free - JPG, PNG, WebP and AVIF Online',
    metaDescription:
      'Convert images between JPG, PNG, WebP and AVIF in your browser. Batch convert up to 60 files, control quality and transparency, download individually or as ZIP.',
    tagline: 'Convert between JPG, PNG, WebP and AVIF in bulk.',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.bmp', '.gif'],
    acceptAttribute: 'image/*',
    outputFormats: ['JPG', 'PNG', 'WebP', 'AVIF', 'ZIP'],
    badge: 'Batch convert',
    featured: true,
    related: ['compress-image', 'resize-image', 'image-to-pdf', 'create-zip'],
    legacyPaths: ['/image-converter', '/convert-to-webp', '/png-to-jpg', '/jpg-to-png'],
    keyword: 'image converter',
    secondaryKeywords: ['png to jpg', 'convert to webp', 'jpg to png online'],
    privacyNote:
      'Encoding and decoding happen with the canvas API on your device. Nothing is uploaded, and no copy is retained after you close the tab.',
  },
  {
    slug: 'remove-background',
    name: 'Remove Background',
    category: 'image-tools',
    kind: 'image',
    weight: 'heavy',
    metaTitle: 'Remove Image Background Free - Runs On Your Device',
    metaDescription:
      'Remove the background from a photo and export a transparent PNG. The AI model runs inside your browser, so your photo is never uploaded to any server.',
    tagline: 'Cut out a subject and export a transparent PNG - privately.',
    accept: ['.jpg', '.jpeg', '.png', '.webp'],
    acceptAttribute: 'image/jpeg,image/png,image/webp',
    outputFormats: ['PNG'],
    badge: 'On-device AI',
    featured: true,
    related: ['passport-photo', 'compress-image', 'resize-image', 'image-to-pdf'],
    legacyPaths: ['/background-remover', '/remove-bg', '/bg-remover', '/transparent-background'],
    keyword: 'remove background from image',
    secondaryKeywords: ['background remover', 'transparent png maker', 'cut out image online'],
    privacyNote:
      'The segmentation model runs locally with ONNX Runtime Web. Your photo is never uploaded; only the model weights are downloaded once and then cached.',
  },
  {
    slug: 'image-to-text',
    name: 'Image to Text (OCR)',
    category: 'image-tools',
    kind: 'image',
    weight: 'heavy',
    metaTitle: 'Image to Text OCR Free - Extract Text, No Upload',
    metaDescription:
      'Extract editable text from photos, screenshots and scans with OCR that runs in your browser. Supports many languages and exports to TXT or copies to clipboard.',
    tagline: 'Read the text out of a photo or scan, entirely on your device.',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
    acceptAttribute: 'image/jpeg,image/png,image/webp,image/bmp',
    outputFormats: ['TXT'],
    badge: 'On-device OCR',
    featured: true,
    related: ['compress-image', 'resize-image', 'pdf-to-image', 'word-counter'],
    legacyPaths: ['/image-to-text', '/ocr', '/image-ocr', '/text-from-image'],
    keyword: 'image to text',
    secondaryKeywords: ['ocr online', 'extract text from image', 'scan to text'],
    privacyNote:
      'Tesseract OCR is compiled to WebAssembly and runs inside your browser. Receipts, IDs and contracts are never uploaded - only the language data is downloaded once.',
  },
  {
    slug: 'passport-photo',
    name: 'Passport Photo Maker',
    category: 'image-tools',
    kind: 'image',
    weight: 'medium',
    metaTitle: 'Passport Photo Maker Free - US, UK, EU, India Sizes',
    metaDescription:
      'Create a compliant passport or visa photo at 300 DPI for US, UK, EU, India, Canada and Australia rules, and print a 4x6 inch sheet. No upload, no signup.',
    tagline: 'Crop to an official size and print a 4x6 inch sheet at 300 DPI.',
    accept: ['.jpg', '.jpeg', '.png', '.webp'],
    acceptAttribute: 'image/jpeg,image/png,image/webp',
    outputFormats: ['JPG', 'PNG'],
    badge: '300 DPI print',
    related: ['remove-background', 'resize-image', 'compress-image', 'convert-image'],
    legacyPaths: ['/passport-photo-maker', '/passport-photo', '/passport-size-photo', '/visa-photo'],
    keyword: 'passport photo maker',
    secondaryKeywords: ['passport size photo online', 'id photo maker', 'visa photo tool'],
    privacyNote:
      'Your portrait is cropped and printed from your own device. This matters: passport photos are among the most sensitive images people handle online.',
  },

  // =========================================================================
  // Text & developer tools
  // =========================================================================
  {
    slug: 'word-counter',
    name: 'Word Counter',
    category: 'text-tools',
    kind: 'text',
    weight: 'light',
    metaTitle: 'Word Counter Online Free - Words, Characters, Read Time',
    metaDescription:
      'Count words, characters, sentences and paragraphs as you type, with reading time, speaking time and keyword density. Works offline and never sends your text.',
    tagline: 'Live word, character and readability statistics as you type.',
    accept: ['.txt', '.md', '.csv', '.json', '.srt'],
    acceptAttribute: '.txt,.md,.csv,.json,.srt,text/plain',
    outputFormats: ['TXT'],
    featured: true,
    related: ['json-formatter', 'image-to-text', 'qr-code-generator', 'age-calculator'],
    legacyPaths: ['/word-counter', '/character-counter', '/word-count-tool'],
    keyword: 'word counter',
    secondaryKeywords: ['character counter', 'word count online', 'reading time calculator'],
    privacyNote:
      'Counting happens in JavaScript on your device. Draft articles, legal text and unpublished work are never transmitted.',
  },
  {
    slug: 'json-formatter',
    name: 'JSON Formatter',
    category: 'text-tools',
    kind: 'text',
    weight: 'light',
    metaTitle: 'JSON Formatter and Validator Free - Beautify JSON Online',
    metaDescription:
      'Format, validate and minify JSON with precise error positions, a collapsible tree view and size statistics. Runs locally and works with large files offline.',
    tagline: 'Beautify, validate and minify JSON with exact error positions.',
    accept: ['.json', '.txt', '.geojson'],
    acceptAttribute: '.json,.txt,.geojson,application/json',
    outputFormats: ['JSON'],
    featured: true,
    related: ['word-counter', 'qr-code-generator', 'percentage-calculator', 'create-zip'],
    legacyPaths: ['/json-formatter', '/json-validator', '/json-beautifier', '/pretty-print-json'],
    keyword: 'json formatter',
    secondaryKeywords: ['json validator', 'beautify json', 'json pretty print'],
    privacyNote:
      'Parsing and formatting run in your browser. API responses and configuration files often contain credentials, so keeping them local matters.',
  },
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    category: 'text-tools',
    kind: 'text',
    weight: 'light',
    metaTitle: 'QR Code Generator Free - PNG and SVG, No Signup',
    metaDescription:
      'Create QR codes for links, Wi-Fi, vCards, email, SMS and phone numbers. Choose colours and error correction, then download a PNG or scalable SVG. No account needed.',
    tagline: 'Generate a QR code for a link, Wi-Fi network or contact card.',
    accept: [],
    acceptAttribute: '',
    outputFormats: ['PNG', 'SVG'],
    featured: true,
    related: ['word-counter', 'json-formatter', 'create-zip', 'image-to-pdf'],
    legacyPaths: ['/qr-code-generator', '/qr-generator', '/qr-tools', '/free-qr-code'],
    keyword: 'qr code generator',
    secondaryKeywords: ['free qr code', 'wifi qr code', 'vcard qr code', 'qr code png svg'],
    privacyNote:
      'QR codes are generated locally with no account and no tracking redirect. The QR code itself does not expire when generated as a static QR code, but the destination or information encoded in it must remain valid.',
  },

  // =========================================================================
  // Calculators
  // =========================================================================
  {
    slug: 'age-calculator',
    name: 'Age Calculator',
    category: 'calculators',
    kind: 'calculator',
    weight: 'light',
    metaTitle: 'Age Calculator - Exact Age in Years, Months and Days',
    metaDescription:
      'Work out your exact age in years, months, days, hours and minutes, see the weekday you were born on, and count down to your next birthday. Free and private.',
    tagline: 'Exact age in years, months and days, plus a birthday countdown.',
    accept: [],
    acceptAttribute: '',
    outputFormats: ['Result'],
    featured: true,
    related: ['percentage-calculator', 'emi-calculator', 'discount-calculator', 'gst-calculator'],
    legacyPaths: ['/age-calculator', '/how-old-am-i', '/birthday-calculator'],
    keyword: 'age calculator',
    secondaryKeywords: ['how old am i', 'exact age calculator', 'date of birth calculator'],
    privacyNote:
      'Dates are computed in your browser. Your date of birth is a sensitive identifier, so it is never sent anywhere.',
  },
  {
    slug: 'percentage-calculator',
    name: 'Percentage Calculator',
    category: 'calculators',
    kind: 'calculator',
    weight: 'light',
    metaTitle: 'Percentage Calculator - Percent Of, Change and Increase',
    metaDescription:
      'Calculate what X percent of a number is, work out percentage increase or decrease, and find the original value after a discount. Every formula is shown step by step.',
    tagline: 'Percentages, increases, decreases and reverse percentages.',
    accept: [],
    acceptAttribute: '',
    outputFormats: ['Result'],
    related: ['discount-calculator', 'gst-calculator', 'emi-calculator', 'age-calculator'],
    legacyPaths: ['/percentage-calculator', '/percent-calculator', '/percentage-change'],
    keyword: 'percentage calculator',
    secondaryKeywords: ['percent of a number', 'percentage increase calculator', 'percent change'],
    privacyNote:
      'Plain arithmetic in your browser. No values you type are logged, stored or transmitted.',
  },
  {
    slug: 'discount-calculator',
    name: 'Discount Calculator',
    category: 'calculators',
    kind: 'calculator',
    weight: 'light',
    metaTitle: 'Discount Calculator - Sale Price, Savings and Stacked Deals',
    metaDescription:
      'Find the final price after one or more stacked discounts, see how much you save, and reverse a sale price to work out the original. Includes sales tax support.',
    tagline: 'Final price, savings and original price for stacked discounts.',
    accept: [],
    acceptAttribute: '',
    outputFormats: ['Result'],
    related: ['percentage-calculator', 'gst-calculator', 'emi-calculator', 'age-calculator'],
    legacyPaths: ['/discount-calculator', '/sale-price-calculator', '/percent-off-calculator'],
    keyword: 'discount calculator',
    secondaryKeywords: ['percent off calculator', 'sale price calculator', 'stacked discount'],
    privacyNote:
      'All calculations run in your browser. Nothing about what you are shopping for is recorded.',
  },
  {
    slug: 'emi-calculator',
    name: 'EMI Calculator',
    category: 'calculators',
    kind: 'calculator',
    weight: 'light',
    metaTitle: 'EMI Calculator - Loan Instalment and Amortization Schedule',
    metaDescription:
      'Calculate the monthly instalment on a home, car or personal loan, see the total interest, and download a full year-by-year amortization schedule. Free and offline.',
    tagline: 'Monthly loan instalments with a full amortization schedule.',
    accept: [],
    acceptAttribute: '',
    outputFormats: ['Result', 'CSV'],
    related: ['percentage-calculator', 'discount-calculator', 'gst-calculator', 'age-calculator'],
    legacyPaths: ['/emi-calculator', '/loan-calculator', '/mortgage-emi-calculator'],
    keyword: 'emi calculator',
    secondaryKeywords: ['loan instalment calculator', 'amortization schedule', 'home loan emi'],
    privacyNote:
      'Loan amounts run through a local formula. Your financial figures are never sent to a server or stored.',
  },
  {
    slug: 'gst-calculator',
    name: 'GST Calculator',
    category: 'calculators',
    kind: 'calculator',
    weight: 'light',
    metaTitle: 'GST Calculator - Add or Remove GST with CGST and SGST',
    metaDescription:
      'Add GST to a net price or extract it from a gross price, with an automatic CGST, SGST or IGST split for intra-state and inter-state supplies across common GST slabs.',
    tagline: 'Add or remove GST with an automatic CGST and SGST split.',
    accept: [],
    acceptAttribute: '',
    outputFormats: ['Result'],
    related: ['percentage-calculator', 'discount-calculator', 'emi-calculator', 'age-calculator'],
    legacyPaths: ['/gst-calculator', '/gst-inclusive-calculator', '/reverse-gst-calculator'],
    keyword: 'gst calculator',
    secondaryKeywords: ['reverse gst calculator', 'cgst sgst calculator', 'igst calculator'],
    privacyNote:
      'Invoices and prices are calculated in your browser only. Nothing is logged or transmitted.',
  },
];

/** Fast lookup by slug. */
const REGISTRY_BY_SLUG = new Map<ToolSlug, ToolRegistryEntry>(
  TOOL_REGISTRY.map((tool) => [tool.slug, tool])
);

export function getTool(slug: ToolSlug): ToolRegistryEntry | undefined {
  return REGISTRY_BY_SLUG.get(slug);
}

/** Throws when a slug is unknown - used by pages, which must never be empty. */
export function requireTool(slug: ToolSlug): ToolRegistryEntry {
  const tool = REGISTRY_BY_SLUG.get(slug);
  if (!tool) throw new Error(`Unknown tool slug: ${slug}`);
  return tool;
}

export function getToolsByCategory(category: CategorySlug): ToolRegistryEntry[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}

export function getFeaturedTools(): ToolRegistryEntry[] {
  return TOOL_REGISTRY.filter((tool) => tool.featured && !tool.unlisted);
}

/**
 * Resolves the "related tools" block for a page.
 *
 * Falls back to same-category tools so a card grid is never half empty, and
 * de-duplicates in case a related slug is also in the same category.
 */
export function getRelatedTools(slug: ToolSlug, count = 4): ToolRegistryEntry[] {
  const tool = REGISTRY_BY_SLUG.get(slug);
  if (!tool) return [];

  const seen = new Set<ToolSlug>([slug]);
  const related: ToolRegistryEntry[] = [];

  for (const candidate of tool.related) {
    if (seen.has(candidate)) continue;
    const entry = REGISTRY_BY_SLUG.get(candidate);
    if (!entry) continue;
    seen.add(candidate);
    related.push(entry);
    if (related.length >= count) return related;
  }

  for (const entry of getToolsByCategory(tool.category)) {
    if (related.length >= count) break;
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    related.push(entry);
  }

  for (const entry of TOOL_REGISTRY) {
    if (related.length >= count) break;
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    related.push(entry);
  }

  return related;
}

/** Sanity check used by the unit tests: registry and slug list must agree. */
export function validateRegistry(): string[] {
  const problems: string[] = [];
  const registered = new Set(TOOL_REGISTRY.map((tool) => tool.slug));

  for (const slug of TOOL_SLUGS) {
    if (!registered.has(slug)) problems.push(`Slug "${slug}" is not in TOOL_REGISTRY.`);
  }
  for (const tool of TOOL_REGISTRY) {
    if (!CATEGORY_SLUGS.includes(tool.category)) {
      problems.push(`Tool "${tool.slug}" has unknown category "${tool.category}".`);
    }
    if (tool.metaTitle.length < 45 || tool.metaTitle.length > 62) {
      problems.push(
        `Tool "${tool.slug}" title is ${tool.metaTitle.length} chars (target 50-60): ${tool.metaTitle}`
      );
    }
    if (tool.metaDescription.length < 130 || tool.metaDescription.length > 165) {
      problems.push(
        `Tool "${tool.slug}" description is ${tool.metaDescription.length} chars (target 140-160).`
      );
    }
    if (tool.related.length < 3) {
      problems.push(`Tool "${tool.slug}" needs at least 3 related tools.`);
    }
    for (const related of tool.related) {
      if (!registered.has(related)) {
        problems.push(`Tool "${tool.slug}" lists unknown related tool "${related}".`);
      }
    }
  }

  const legacy = new Set<string>();
  for (const tool of TOOL_REGISTRY) {
    for (const path of tool.legacyPaths) {
      if (legacy.has(path)) problems.push(`Legacy path "${path}" is claimed twice.`);
      legacy.add(path);
    }
  }

  return problems;
}

/** Every legacy path mapped to its canonical tool URL, for redirect stubs. */
export function getLegacyRedirects(): { from: string; to: string }[] {
  return TOOL_REGISTRY.flatMap((tool) =>
    tool.legacyPaths.map((from) => ({ from, to: `/tools/${tool.slug}/` }))
  );
}
