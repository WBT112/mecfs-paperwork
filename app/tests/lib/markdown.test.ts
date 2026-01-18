import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/lib/markdown';

describe('parseMarkdown', () => {
  it('should sanitize HTML from the input', () => {
    const input = '# <h1>Title</h1>\n\n<p>paragraph</p>\n\n* <li>item</li>';
    const expected = [
      {
        type: 'heading',
        level: 1,
        text: '&lt;h1&gt;Title&lt;&#x2F;h1&gt;',
      },
      {
        type: 'paragraph',
        text: '&lt;p&gt;paragraph&lt;&#x2F;p&gt;',
      },
      {
        type: 'list',
        items: ['&lt;li&gt;item&lt;&#x2F;li&gt;'],
      },
    ];
    expect(parseMarkdown(input)).toEqual(expected);
  });
});
