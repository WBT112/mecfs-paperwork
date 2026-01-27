import { describe, expect, it } from 'vitest';
import { splitParagraphs } from '../../../src/lib/text/paragraphs';

describe('splitParagraphs', () => {
  it('splits by explicit paragraph markers and trims whitespace', () => {
    const result = splitParagraphs('First [[P]]  Second [[P]] Third  ');

    expect(result).toEqual(['First', 'Second', 'Third']);
  });

  it('falls back to double newlines when no marker is present', () => {
    const result = splitParagraphs('First paragraph.\n\nSecond paragraph.');

    expect(result).toEqual(['First paragraph.', 'Second paragraph.']);
  });

  it('returns a single trimmed paragraph when no markers are found', () => {
    const result = splitParagraphs('  Single paragraph.  ');

    expect(result).toEqual(['Single paragraph.']);
  });
});
