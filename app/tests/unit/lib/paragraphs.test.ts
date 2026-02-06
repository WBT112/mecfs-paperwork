import { describe, expect, it } from 'vitest';
import {
  buildParagraphBlocks,
  LINE_BREAK_MARKER,
  normalizeParagraphText,
  PARAGRAPH_MARKER,
  splitParagraphs,
} from '../../../src/lib/text/paragraphs';

describe('splitParagraphs', () => {
  it('splits by explicit paragraph markers and trims whitespace', () => {
    const result = splitParagraphs(
      `First ${PARAGRAPH_MARKER}  Second ${PARAGRAPH_MARKER} Third  `,
    );

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

describe('normalizeParagraphText', () => {
  it('normalizes line break markers into single newlines', () => {
    const result = normalizeParagraphText(
      `First${LINE_BREAK_MARKER}Second${LINE_BREAK_MARKER}Third`,
    );

    expect(result).toEqual({
      paragraphs: ['First\nSecond\nThird'],
      text: 'First\nSecond\nThird',
    });
  });

  it('returns joined text alongside paragraphs when markers are present', () => {
    const result = normalizeParagraphText(
      `First ${PARAGRAPH_MARKER} Second ${PARAGRAPH_MARKER} Third`,
    );

    expect(result).toEqual({
      paragraphs: ['First', 'Second', 'Third'],
      text: 'First\n\nSecond\n\nThird',
    });
  });

  it('combines paragraph and line break markers without adding empty lines', () => {
    const result = normalizeParagraphText(
      `A${PARAGRAPH_MARKER}B${LINE_BREAK_MARKER}C`,
    );

    expect(result).toEqual({
      paragraphs: ['A', 'B\nC'],
      text: 'A\n\nB\nC',
    });
  });

  it('normalizes CRLF and trims empty segments', () => {
    const result = normalizeParagraphText(
      `First\r\n\r\n${PARAGRAPH_MARKER}${PARAGRAPH_MARKER}Second`,
    );

    expect(result).toEqual({
      paragraphs: ['First', 'Second'],
      text: 'First\n\nSecond',
    });
  });

  it('handles CRLF around line break markers', () => {
    const result = normalizeParagraphText(`A\r\n${LINE_BREAK_MARKER}\r\nB`);

    expect(result).toEqual({
      paragraphs: ['A', 'B'],
      text: 'A\n\nB',
    });
  });
});

describe('buildParagraphBlocks', () => {
  it('creates paragraph and line break blocks from markers', () => {
    const result = buildParagraphBlocks(
      `First${PARAGRAPH_MARKER}Second${LINE_BREAK_MARKER}Third`,
    );

    expect(result).toEqual([
      { type: 'paragraph', text: 'First' },
      { type: 'lineBreaks', lines: ['Second', 'Third'] },
    ]);
  });

  it('skips empty segments and trims lines', () => {
    const result = buildParagraphBlocks(
      `${PARAGRAPH_MARKER}  A  ${PARAGRAPH_MARKER}${LINE_BREAK_MARKER}  B`,
    );

    expect(result).toEqual([
      { type: 'paragraph', text: 'A' },
      { type: 'paragraph', text: 'B' },
    ]);
  });
});
