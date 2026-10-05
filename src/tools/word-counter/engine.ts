/**
 * Word Counter — pure text analysis.
 *
 * Everything here is a plain function over a string: no React, no DOM, no
 * timers. That keeps the counting rules testable in isolation and lets the UI
 * hand the same text to `analyseText` from a worker, a test or a paste handler
 * without any behavioural difference.
 *
 * Counting rules used throughout (documented because every word counter
 * disagrees slightly):
 *
 *  - A **word** is a run of letters, digits, apostrophes or hyphens that starts
 *    with a letter or digit, so `don't`, `state-of-the-art` and `2024` each
 *    count once. Unicode letters are included, so `café` and `日本語` work.
 *  - **Characters** are counted as Unicode code points, so an emoji counts once
 *    even though it occupies two UTF-16 units in memory.
 *  - **Sentences** are runs of text ended by `.`, `!`, `?` or `…`. A block of
 *    text with words but no end punctuation counts as one sentence.
 *  - **Paragraphs** are blocks separated by a blank line.
 *  - Reading time assumes 200 words per minute, speaking time 130.
 */

export interface KeywordDensityEntry {
  /** Lower-cased word form. */
  word: string;
  count: number;
  /** Share of all words, as a percentage. */
  percent: number;
}

export interface ReadabilityScore {
  /** Flesch Reading Ease: higher is easier. 0 when there is not enough text. */
  fleschReadingEase: number;
  /** Flesch-Kincaid Grade Level: US school year. 0 when not computable. */
  fleschKincaidGrade: number;
  /** Plain-English band for the reading-ease score. */
  label: string;
}

export interface TextAnalysis {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  longestWord: string;
  averageWordLength: number;
  averageSentenceLength: number;
  uniqueWords: number;
  /** Top 10 content words, stop words removed, ordered by frequency. */
  keywordDensity: KeywordDensityEntry[];
  readability: ReadabilityScore;
  syllables: number;
}

/** Reading speed used for the reading-time estimate. */
export const READING_WORDS_PER_MINUTE = 200;
/** Speaking speed used for the speaking-time estimate. */
export const SPEAKING_WORDS_PER_MINUTE = 130;
/** How many keywords the density table reports. */
export const KEYWORD_LIMIT = 10;

/**
 * Common English function words, removed from the keyword-density table so the
 * list shows what the text is about rather than "the, and, of".
 */
export const STOP_WORDS: ReadonlySet<string> = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an', 'and', 'any',
  'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'done', 'down', 'during',
  'each', 'either', 'else', 'ever', 'every', 'few', 'for', 'from', 'further', 'get', 'got',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'however', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'let',
  'like', 'me', 'might', 'more', 'most', 'much', 'must', 'my', 'myself', 'neither', 'no', 'nor',
  'not', 'now', 'of', 'off', 'on', 'once', 'one', 'only', 'or', 'other', 'ought', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'since', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
  'they', 'this', 'those', 'through', 'thus', 'to', 'too', 'under', 'until', 'up', 'upon', 'us',
  'use', 'used', 'using', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'whether',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'within', 'without', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves',
]);

const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const VOWEL_GROUP_PATTERN = /[aeiouy]+/g;

/** Rounds to a fixed number of decimals without ever returning `-0`. */
function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Safe division: returns 0 rather than `NaN`/`Infinity` when the divisor is 0. */
function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

/**
 * Estimates the number of syllables in a word.
 *
 * Heuristic, in this order:
 *  1. Count groups of adjacent vowels (`a e i o u y`) — "beau-ti-ful" → 3.
 *  2. Treat a trailing silent `e` as silent, unless it is the only vowel group
 *     or the word ends in `le`/`ee`/`ye` where the `e` is sounded.
 *  3. Every word of one or more letters has at least one syllable.
 *
 * Returns 0 for input with no letters at all.
 */
export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length === 0) return 0;
  if (cleaned.length <= 3) return 1;

  const groups = cleaned.match(VOWEL_GROUP_PATTERN);
  let count = groups ? groups.length : 0;

  const endsWithSilentE =
    cleaned.endsWith('e') &&
    !cleaned.endsWith('le') &&
    !cleaned.endsWith('ee') &&
    !cleaned.endsWith('ye') &&
    !/[aeiouy]e$/.test(cleaned);

  if (endsWithSilentE && count > 1) count -= 1;

  return Math.max(1, count);
}

/** Splits text into countable words. Exported so the UI can reuse the rule. */
export function extractWords(text: string): string[] {
  if (!text) return [];
  return text.match(WORD_PATTERN) ?? [];
}

/** Number of Unicode code points — an emoji counts once. */
export function countCodePoints(text: string): number {
  if (!text) return 0;
  return Array.from(text).length;
}

/** Counts sentences, treating a punctuation-free block of words as one. */
export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  const parts = trimmed.split(/[.!?…]+[\s"”’')\]]*/u).filter((part) => extractWords(part).length > 0);
  return Math.max(1, parts.length);
}

/** Counts paragraphs as blocks separated by one or more blank lines. */
export function countParagraphs(text: string): number {
  if (text.trim().length === 0) return 0;
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0).length;
}

/** Counts lines; an empty string has no lines. */
export function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

/**
 * Plain-English band for a Flesch Reading Ease score.
 * Bands follow the standard US grade-level interpretation.
 */
export function readabilityLabel(score: number): string {
  if (!Number.isFinite(score)) return 'Not enough text';
  if (score >= 90) return 'Very easy — around age 11';
  if (score >= 80) return 'Easy — around age 12';
  if (score >= 70) return 'Fairly easy — around age 13';
  if (score >= 60) return 'Plain English — around age 14';
  if (score >= 50) return 'Fairly difficult — around age 16';
  if (score >= 30) return 'Difficult — university level';
  return 'Very difficult — specialist reading';
}

/**
 * Analyses a block of text and returns every statistic the tool displays.
 *
 * Empty input, whitespace-only input and text with no sentence punctuation all
 * return finite numbers (zeros where a value cannot be computed), never `NaN`.
 */
export function analyseText(text: string): TextAnalysis {
  const source = typeof text === 'string' ? text : '';
  const words = extractWords(source);
  const wordCount = words.length;

  if (source.length === 0 || wordCount === 0) {
    return {
      words: 0,
      characters: countCodePoints(source),
      charactersNoSpaces: countCodePoints(source.replace(/\s+/gu, '')),
      sentences: 0,
      paragraphs: countParagraphs(source),
      lines: countLines(source),
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
      longestWord: '',
      averageWordLength: 0,
      averageSentenceLength: 0,
      uniqueWords: 0,
      keywordDensity: [],
      readability: { fleschReadingEase: 0, fleschKincaidGrade: 0, label: 'Not enough text' },
      syllables: 0,
    };
  }

  const sentences = countSentences(source);
  const characters = countCodePoints(source);
  const charactersNoSpaces = countCodePoints(source.replace(/\s+/gu, ''));

  let longestWord = '';
  let totalWordLength = 0;
  let syllables = 0;

  for (const word of words) {
    totalWordLength += countCodePoints(word);
    syllables += countSyllables(word);
    if (word.length > longestWord.length) longestWord = word;
  }

  const counts = new Map<string, number>();
  for (const word of words) {
    const key = word.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keywordDensity: KeywordDensityEntry[] = Array.from(counts.entries())
    .filter(([word]) => word.length > 1 && !STOP_WORDS.has(word) && !/^\d+$/.test(word))
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, KEYWORD_LIMIT)
    .map(([word, count]) => ({
      word,
      count,
      percent: round(safeDivide(count, wordCount) * 100, 2),
    }));

  const wordsPerSentence = safeDivide(wordCount, sentences);
  const syllablesPerWord = safeDivide(syllables, wordCount);

  // Flesch-Kincaid, exactly as published:
  //   Reading Ease = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  //   Grade Level  =   0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
  const fleschReadingEase = round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord, 1);
  const fleschKincaidGrade = round(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59, 1);

  return {
    words: wordCount,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs: countParagraphs(source),
    lines: countLines(source),
    readingTimeMinutes: round(safeDivide(wordCount, READING_WORDS_PER_MINUTE), 2),
    speakingTimeMinutes: round(safeDivide(wordCount, SPEAKING_WORDS_PER_MINUTE), 2),
    longestWord,
    averageWordLength: round(safeDivide(totalWordLength, wordCount), 2),
    averageSentenceLength: round(wordsPerSentence, 2),
    uniqueWords: counts.size,
    keywordDensity,
    readability: {
      fleschReadingEase: Number.isFinite(fleschReadingEase) ? fleschReadingEase : 0,
      fleschKincaidGrade: Number.isFinite(fleschKincaidGrade) ? Math.max(0, fleschKincaidGrade) : 0,
      label: readabilityLabel(fleschReadingEase),
    },
    syllables,
  };
}

/**
 * Builds the downloadable `.txt` statistics report.
 *
 * Kept in the engine so the numbers in the file are produced by exactly the
 * same code path as the numbers on screen.
 */
export function buildStatisticsReport(analysis: TextAnalysis, sourceName?: string): string {
  const lines: string[] = [
    'Toolino word count report',
    `Generated: ${new Date().toISOString()}`,
    ...(sourceName ? [`Source: ${sourceName}`] : []),
    '',
    'Counts',
    `  Words: ${analysis.words}`,
    `  Characters: ${analysis.characters}`,
    `  Characters without spaces: ${analysis.charactersNoSpaces}`,
    `  Sentences: ${analysis.sentences}`,
    `  Paragraphs: ${analysis.paragraphs}`,
    `  Lines: ${analysis.lines}`,
    `  Unique words: ${analysis.uniqueWords}`,
    `  Syllables: ${analysis.syllables}`,
    '',
    'Averages and timings',
    `  Average word length: ${analysis.averageWordLength} characters`,
    `  Average sentence length: ${analysis.averageSentenceLength} words`,
    `  Longest word: ${analysis.longestWord || '—'}`,
    `  Reading time (200 wpm): ${analysis.readingTimeMinutes} minutes`,
    `  Speaking time (130 wpm): ${analysis.speakingTimeMinutes} minutes`,
    '',
    'Readability',
    `  Flesch Reading Ease: ${analysis.readability.fleschReadingEase}`,
    `  Flesch-Kincaid Grade: ${analysis.readability.fleschKincaidGrade}`,
    `  Reading level: ${analysis.readability.label}`,
    '',
    `Top ${analysis.keywordDensity.length} keywords (stop words excluded)`,
  ];

  if (analysis.keywordDensity.length === 0) {
    lines.push('  No content words found.');
  } else {
    for (const entry of analysis.keywordDensity) {
      lines.push(`  ${entry.word}: ${entry.count} (${entry.percent}%)`);
    }
  }

  lines.push('', 'Statistics only — the text itself is not included in this report.', '');
  return lines.join('\r\n');
}
