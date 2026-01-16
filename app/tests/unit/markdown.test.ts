import { describe, expect, test } from 'vitest';
import { parseMarkdown } from '../../src/lib/markdown';

describe('parseMarkdown', () => {
  test('should parse a mix of headings, paragraphs, and lists', () => {
    const markdown = `
# Heading 1

This is a paragraph.
It has multiple lines.

## Heading 2

- List item 1
- List item 2

Another paragraph.

### Heading 3

- One more list
    `;

    const expected = [
      { type: 'heading', level: 1, text: 'Heading 1' },
      {
        type: 'paragraph',
        text: 'This is a paragraph. It has multiple lines.',
      },
      { type: 'heading', level: 2, text: 'Heading 2' },
      { type: 'list', items: ['List item 1', 'List item 2'] },
      { type: 'paragraph', text: 'Another paragraph.' },
      { type: 'heading', level: 3, text: 'Heading 3' },
      { type: 'list', items: ['One more list'] },
    ];

    expect(parseMarkdown(markdown)).toEqual(expected);
  });
});
