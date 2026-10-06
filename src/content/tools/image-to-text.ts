import type { ToolContent } from '@/content/types';

export const imageToTextContent: ToolContent = {
  overviewHeading: 'What this private in-browser OCR tool does',
  overview: [
    'This Optical Character Recognition (OCR) tool extracts editable, searchable text from images, photos, receipts, screenshots, and scanned documents entirely inside your browser. Powered by client-side WebAssembly, it recognizes typed, printed, and clear handwritten text across multiple languages with high precision.',
    'Unlike traditional online OCR converters that require uploading your private documents to third-party cloud servers, this tool executes 100% on your device using your computer’s local processing power. Your invoices, bank statements, tax forms, and medical records never leave your machine.',
    'Once extracted, you can edit the text in a built-in text editor, search and replace words, copy the content directly to your clipboard, or export it as a clean text (.txt) file.',
  ],
  howTo: {
    heading: 'How to extract text from images with OCR',
    intro: 'Convert any image containing text into editable words in seconds.',
    steps: [
      {
        name: 'Upload or drop your image',
        text: 'Select your photo, screenshot, or document scan in JPG, PNG, WebP, or BMP format.',
      },
      {
        name: 'Choose recognition language',
        text: 'Select the primary language of your document (English, Spanish, French, German, and more) to load the appropriate character dictionary.',
      },
      {
        name: 'Run in-browser OCR recognition',
        text: 'Click "Extract Text". The browser loads the client-side engine and scans the image matrix line by line with a real-time progress bar.',
      },
      {
        name: 'Review and edit the recognized text',
        text: 'Review the extracted text in the live editor window to make any manual spelling adjustments or formatting tweaks.',
      },
      {
        name: 'Copy to clipboard or export file',
        text: 'Click "Copy Text" to paste it into Word, Google Docs, or email, or click "Download .txt" to save the output locally.',
      },
    ],
  },
  benefits: {
    heading: 'Why use Toolino for image text extraction',
    intro: 'Built for students, researchers, paralegals, accountants, and office workers.',
    items: [
      {
        title: 'Zero document uploads',
        text: 'Confidential tax documents, banking receipts, and legal agreements are parsed on your device and never uploaded to any server.',
      },
      {
        title: 'Multi-language character recognition',
        text: 'Supports standard Latin, Cyrillic, and extended European alphabets for accurate translation and transcription.',
      },
      {
        title: 'High accuracy on screenshots and scans',
        text: 'Handles computer screenshots, smartphone camera photos, and flatbed scanner exports with clean text recovery.',
      },
      {
        title: 'Built-in text editor & one-click copy',
        text: 'Quickly clean up formatting, verify confidence levels, and copy the final output with a single tap.',
      },
      {
        title: 'Free local conversions',
        text: 'No paywalls or subscription gates. Processing runs directly in your browser without cloud OCR meter charges.',
      },
    ],
  },
  privacy: {
    heading: 'Your scanned documents never leave your computer',
    paragraphs: [
      'Document scans frequently contain sensitive personal data: names, addresses, social security numbers, banking details, and medical records. Cloud-based OCR services store copies of these files on their servers and may analyze them for training data.',
      'Toolino uses client-side WebAssembly to execute OCR recognition locally inside your web browser. The image is decoded into canvas memory, analyzed by the local worker, and output directly to your screen.',
      'No image data or extracted text is transmitted across the internet. You can confirm this by monitoring the Network tab in your browser developer tools.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Sharp, high-contrast images with dark text on a light background yield the highest OCR recognition accuracy.',
      'Straighten and rotate crooked images before scanning so text lines run horizontally across the frame.',
      'Complex multi-column layouts (like magazines or receipts) may group text paragraphs sequentially.',
      'Extremely blurry, low-resolution, or stylized cursive handwritten fonts may require manual proofreading after extraction.',
    ],
  },
  faqs: [
    {
      question: 'How does client-side OCR work without uploading files?',
      answer:
        'This tool uses an optimized WebAssembly build of the Tesseract OCR engine that runs directly inside your web browser. The machine learning model is loaded into your browser’s cache once, allowing text extraction to occur locally using your device’s own CPU.',
    },
    {
      question: 'Which image formats are supported?',
      answer:
        'You can extract text from PNG, JPG, JPEG, WebP, BMP, and GIF image files.',
    },
    {
      question: 'Is my scanned document or extracted text saved on your server?',
      answer:
        'No. Nothing is ever sent to or saved on any server. All processing is 100% client-side in your browser.',
    },
    {
      question: 'Why did the first OCR scan take a few seconds to start?',
      answer:
        'The first time you run OCR, your browser downloads the lightweight language model data once and caches it locally. Subsequent OCR runs are significantly faster because the model is already stored in your browser cache.',
    },
    {
      question: 'Can this tool extract text from receipts and invoices?',
      answer:
        'Yes. It extracts item descriptions, numbers, prices, and totals from photo receipts and invoices, making it easy to copy data into accounting spreadsheets.',
    },
    {
      question: 'Can I extract text while offline?',
      answer:
        'Yes. Once the language dictionary is loaded in your browser cache, the tool can perform OCR text recognition even if you disconnect from the internet.',
    },
  ],
};
