import type { ToolContent } from '@/content/types';

export const jsonFormatterContent: ToolContent = {
  overviewHeading: 'What this browser-based JSON formatter does',
  overview: [
    'This developer tool formats, beautifies, validates, and minifies JSON (JavaScript Object Notation) data instantly in your browser. Whether you have an unreadable single-line API response or complex nested configuration files, it formats your code with customizable indentation and clear syntax structure.',
    'It highlights syntax errors with exact line and column coordinates, making it simple to fix missing commas, unescaped quotes, trailing commas, or bracket mismatches without guessing.',
    'Because developer data often contains sensitive environment variables, API tokens, internal IDs, or user credentials, this tool executes 100% client-side. Your JSON payload is never transmitted across the network or logged on remote servers.',
  ],
  howTo: {
    heading: 'How to format and validate JSON',
    intro: 'Formatting and validating your JSON payload takes only a few seconds.',
    steps: [
      {
        name: 'Paste your raw JSON code',
        text: 'Paste your unformatted JSON payload, API response, or config text directly into the code input area.',
      },
      {
        name: 'Choose your indentation style',
        text: 'Select your preferred indentation format: 2 spaces, 4 spaces, or tabs depending on your coding conventions.',
      },
      {
        name: 'Format or minify with one click',
        text: 'Click "Beautify / Format" to clean up and indent your code, or "Minify" to strip whitespace and minimize file size.',
      },
      {
        name: 'Identify and resolve syntax issues',
        text: 'If your JSON is invalid, examine the detailed error banner highlighting the exact line number, column, and unexpected token.',
      },
      {
        name: 'Copy or download the formatted output',
        text: 'Click the "Copy" button to save the clean JSON to your clipboard, or click "Download" to export a clean .json file.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this private JSON formatter',
    intro: 'Engineered for software engineers, QA analysts, DevOps practitioners, and API developers.',
    items: [
      {
        title: 'Private client-side token & credential security',
        text: 'Sensitive payloads containing auth tokens, customer records, and internal configurations remain strictly in your browser.',
      },
      {
        title: 'Precise error reporting',
        text: 'Pinpoints syntax errors with exact line and column numbers so you can fix malformed JSON in seconds.',
      },
      {
        title: 'Two-space, four-space, and tab indentation',
        text: 'Easily match your engineering team’s style guidelines and linter configuration with customizable indentation.',
      },
      {
        title: 'Instant minification for production',
        text: 'Strip all comments and whitespace to compress JSON payloads before sending them over the wire.',
      },
      {
        title: 'Inspect key count and byte size',
        text: 'View structural metadata including total keys, depth level, and raw byte weight before and after formatting.',
      },
    ],
  },
  privacy: {
    heading: 'Your developer payloads never leave your computer',
    paragraphs: [
      'Modern web developers routinely handle production tokens, test credentials, and customer records. Many online JSON formatters quietly transmit these payloads to remote servers or proxy services.',
      'ToolForForever processes your JSON purely within your local browser context using native JavaScript JSON parsers. No HTTP requests are sent when you paste, validate, format, or download your data.',
      'You can verify this at any time by opening your browser developer tools Network tab: zero network activity occurs while formatting your code.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Standard JSON requires double quotes around both property keys and string values; single quotes will produce a syntax error.',
      'Trailing commas after the last item in an object or array are invalid in standard JSON specification (RFC 8259).',
      'Minifying JSON removes extraneous spaces, line breaks, and indentation while preserving all data values intact.',
      'Numbers in JSON must not have leading zeroes unless representing decimal fractions (e.g. 0.5 is valid, 05 is invalid).',
    ],
  },
  faqs: [
    {
      question: 'Is it safe to paste confidential API keys or client JSON here?',
      answer:
        'Yes. This tool runs entirely client-side in your browser. No data is sent across the internet, logged, or cached on any server.',
    },
    {
      question: 'Why is my JSON failing validation?',
      answer:
        'Common reasons include missing quotation marks around property names, single quotes instead of double quotes, trailing commas after the last property, unescaped special characters, or mismatched braces.',
    },
    {
      question: 'What is the difference between beautifying and minifying JSON?',
      answer:
        'Beautifying adds line breaks and consistent indentation (usually 2 or 4 spaces) to make JSON readable for humans. Minifying removes all extra whitespace to make the payload as small as possible for network transmission.',
    },
    {
      question: 'Does this formatter change the order of keys in objects?',
      answer:
        'No. Keys and arrays are preserved in the original order specified in your input document.',
    },
    {
      question: 'Can I format very large JSON files?',
      answer:
        'Yes. Modern browser JavaScript engines can easily parse and format JSON files of several megabytes in milliseconds.',
    },
    {
      question: 'Can I download the formatted JSON as a file?',
      answer:
        'Yes. You can download your formatted JSON file directly to your disk with one click.',
    },
  ],
};
