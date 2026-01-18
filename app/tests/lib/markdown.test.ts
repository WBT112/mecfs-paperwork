import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/lib/markdown';

describe('parseMarkdown', () => {
  it('should sanitize HTML from the input', () => {
    const input = '# <h1>Title</h1>\n\n<p>paragraph</p>\n\n* <li>item</li>';
    const expected = [
      {
        type: 'heading',
        level: 1,
        text: 'Title',
      },
      {
        type: 'paragraph',
        text: 'paragraph',
      },
      {
        type: 'list',
        items: ['item'],
      },
    ];
    expect(parseMarkdown(input)).toEqual(expected);
  });
});
