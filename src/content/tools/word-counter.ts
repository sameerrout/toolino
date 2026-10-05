import type { ToolContent } from '@/content/types';

export const wordCounterContent: ToolContent = {
  overviewHeading: 'What this real-time word counter does',
  overview: [
    'This tool analyzes any written text directly in your browser. As you type or paste your content, it instantly calculates exact word counts, character counts (with and without spaces), sentence counts, paragraph counts, and estimated reading and speaking times.',
    'Unlike online word counters that send your drafts to remote servers, this tool works 100% locally. Whether you are drafting an academic essay, an executive summary, a social media caption, or confidential client correspondence, your text never leaves your device.',
    'In addition to standard counts, it identifies reading level indicators, keyword frequencies, and average sentence lengths to help you edit for clarity, punchiness, and platform-specific character limits.',
  ],
  howTo: {
    heading: 'How to count words and analyze text',
    intro: 'Text analysis is instant and updates in real time with zero delay.',
    steps: [
      {
        name: 'Paste or type your text',
        text: 'Enter your content into the main text area. You can type freely or paste thousands of words from Word, Google Docs, or PDF files.',
      },
      {
        name: 'Review key statistics immediately',
        text: 'Look at the live metrics at the top to see total words, characters, sentences, paragraphs, and reading duration.',
      },
      {
        name: 'Check platform-specific limits',
        text: 'Consult the social media and character limit guides to ensure your message fits Twitter/X, LinkedIn, meta descriptions, or SMS boundaries.',
      },
      {
        name: 'Inspect keyword densities',
        text: 'Review the most frequently repeated terms to spot unintentional repetition and optimize keyword usage naturally.',
      },
      {
        name: 'Copy or clear your draft',
        text: 'Click the copy button to copy your polished text to your clipboard, or clear the editor to start fresh.',
      },
    ],
  },
  benefits: {
    heading: 'Why use this privacy-first word counter',
    intro: 'Built for students, authors, journalists, copywriters, and privacy-conscious professionals.',
    items: [
      {
        title: 'Complete draft confidentiality',
        text: 'Your manuscript, legal brief, or personal notes remain strictly on your computer. No logs, no cloud storage, and no AI scraping.',
      },
      {
        title: 'Zero latency live updates',
        text: 'Counts recalculate synchronously on every keystroke with zero network roundtrips or server latency.',
      },
      {
        title: 'Accurate reading and speaking time',
        text: 'Calculates realistic reading time (200 words per minute) and speaking time (130 words per minute) for speeches and presentations.',
      },
      {
        title: 'Handles massive texts smoothly',
        text: 'Optimized string algorithms process full book chapters and multi-thousand-word academic papers without lag.',
      },
      {
        title: 'Offline functionality',
        text: 'Once loaded, the tool works completely offline on planes, trains, or areas with unstable internet connectivity.',
      },
    ],
  },
  privacy: {
    heading: 'Your writing stays entirely on your device',
    paragraphs: [
      'Every character you type is evaluated directly inside your web browser’s JavaScript memory. Toolino is a static web application with no server backend processing or draft databases.',
      'We do not capture your keystrokes, train machine learning models on your prose, or save your text to cookies or remote databases.',
      'When you close or refresh your browser tab, your text is completely erased from your browser’s temporary memory.',
    ],
  },
  goodToKnow: {
    heading: 'Good to know',
    items: [
      'Hyphenated words (such as "state-of-the-art") and contractions (such as "don\'t") are counted according to standard journalistic conventions.',
      'Spaces, tabs, and line breaks are counted separately under character metrics so you can verify strict technical specifications.',
      'Estimated reading speed is based on the average adult silent reading rate of 200 to 250 words per minute.',
      'Estimated speaking speed is calibrated to standard presentation and speech pacing of 125 to 150 words per minute.',
    ],
  },
  faqs: [
    {
      question: 'How does this tool calculate words?',
      answer:
        'The counter splits text using standard Unicode word boundaries, accounting for spaces, punctuation, line breaks, and language-specific word delimiters to provide an accurate count matching Microsoft Word and Google Docs.',
    },
    {
      question: 'Does this word counter store my text or send it to a server?',
      answer:
        'No. All text parsing happens directly inside your web browser using client-side JavaScript. Nothing is transmitted over the internet or saved to any external database.',
    },
    {
      question: 'Is there a limit on how much text I can paste?',
      answer:
        'There is no artificial limit. You can paste tens of thousands of words, including entire book chapters and thesis papers, without issue on modern devices.',
    },
    {
      question: 'How is reading time calculated?',
      answer:
        'Reading time is computed by dividing your total word count by 200, representing the typical reading speed of an adult in words per minute.',
    },
    {
      question: 'How is speaking time calculated?',
      answer:
        'Speaking time divides your total word count by 130 words per minute, which is the standard comfortable pace for public speaking, podcasting, and voiceover delivery.',
    },
    {
      question: 'Can I use this word counter while offline?',
      answer:
        'Yes. Because all logic is bundled and runs entirely within your browser, the page continues to function perfectly even if you disconnect from the internet.',
    },
  ],
};
