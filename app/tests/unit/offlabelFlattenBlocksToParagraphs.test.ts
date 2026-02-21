import { describe, expect, it } from 'vitest';
import { flattenBlocksToParagraphs } from '../../src/formpacks/offlabel-antrag/export/flattenBlocksToParagraphs';

describe('flattenBlocksToParagraphs', () => {
  it('splits paragraph newlines and expands lists into bullet paragraphs', () => {
    const paragraphs = flattenBlocksToParagraphs([
      { kind: 'heading', text: 'Title' },
      { kind: 'paragraph', text: 'Line 1\nLine 2' },
      { kind: 'list', items: ['Item A', 'Item B'] },
      { kind: 'pageBreak' },
    ]);

    expect(paragraphs).toEqual(['Line 1', 'Line 2', '• Item A', '• Item B']);
  });

  it('includes headings when requested and supports custom list prefix', () => {
    const paragraphs = flattenBlocksToParagraphs(
      [
        { kind: 'heading', text: 'Part 1' },
        { kind: 'list', items: ['A'] },
      ],
      { includeHeadings: true, listPrefix: '- ' },
    );

    expect(paragraphs).toEqual(['Part 1', '- A']);
  });

  it('drops explicitly configured kinds', () => {
    const paragraphs = flattenBlocksToParagraphs(
      [
        { kind: 'heading', text: 'Hidden heading' },
        { kind: 'paragraph', text: 'Keep me' },
      ],
      { includeHeadings: true, dropKinds: ['heading'] },
    );

    expect(paragraphs).toEqual(['Keep me']);
  });

  it('adds a blank line between rendered blocks when configured', () => {
    const paragraphs = flattenBlocksToParagraphs(
      [
        { kind: 'paragraph', text: 'Punkt 1' },
        { kind: 'paragraph', text: 'Punkt 2' },
        { kind: 'list', items: ['Anlage A', 'Anlage B'] },
      ],
      { blankLineBetweenBlocks: true },
    );

    expect(paragraphs).toEqual([
      'Punkt 1',
      '',
      'Punkt 2',
      '',
      '• Anlage A',
      '• Anlage B',
    ]);
  });

  it('supports compact spacing around configured block kinds', () => {
    const paragraphs = flattenBlocksToParagraphs(
      [
        { kind: 'paragraph', text: 'Einleitung' },
        { kind: 'heading', text: 'Haftungsausschluss' },
        { kind: 'paragraph', text: 'Text A' },
        { kind: 'list', items: ['A', 'B'] },
        { kind: 'paragraph', text: 'Schluss' },
      ],
      {
        includeHeadings: true,
        blankLineBetweenBlocks: true,
        compactAroundKinds: ['heading', 'list'],
      },
    );

    expect(paragraphs).toEqual([
      'Einleitung',
      'Haftungsausschluss',
      'Text A',
      '• A',
      '• B',
      'Schluss',
    ]);
  });

  it('wraps long list items with indented continuation lines when configured', () => {
    const paragraphs = flattenBlocksToParagraphs(
      [
        {
          kind: 'list',
          items: [
            'Dieser Listeneintrag wird bei kleinem Grenzwert sauber umbrochen',
          ],
        },
      ],
      { listWrapAt: 26 },
    );

    expect(paragraphs).toEqual([
      '• Dieser Listeneintrag wird',
      '\u00A0\u00A0bei kleinem Grenzwert',
      '\u00A0\u00A0sauber umbrochen',
    ]);
  });
});
