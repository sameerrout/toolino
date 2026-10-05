import { describe, it, expect } from 'vitest';
import { analyseText } from '@/tools/word-counter/engine';

describe('Text Tools & String Analysis', () => {
  it('counts words, characters, sentences, and paragraphs accurately', () => {
    const text = 'Hello world! This is a test paragraph.\n\nHere is paragraph two.';
    const stats = analyseText(text);

    expect(stats.words).toBe(11);
    expect(stats.paragraphs).toBe(2);
    expect(stats.sentences).toBe(3);
    expect(stats.characters).toBe(text.length);
    expect(stats.charactersNoSpaces).toBeLessThan(text.length);
    expect(stats.readingTimeMinutes).toBeGreaterThan(0);
    expect(stats.speakingTimeMinutes).toBeGreaterThan(0);
  });

  it('handles empty strings and whitespace-only text gracefully', () => {
    const stats = analyseText('   \n\t  ');
    expect(stats.words).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.paragraphs).toBe(0);
  });

  it('validates and minifies JSON format', () => {
    const raw = '{\n  "name": "Toolnova",\n  "tools": 27\n}';
    const parsed = JSON.parse(raw);
    const minified = JSON.stringify(parsed);

    expect(minified).toBe('{"name":"Toolnova","tools":27}');
    expect(JSON.stringify(parsed, null, 2)).toContain('  "name": "Toolnova"');
  });
});
