import { describe, it, expect } from 'vitest';
import { sanitizeHTML } from '../../src/lib/utils';

describe('sanitizeHTML', () => {
  it('should return an empty string when the input is null or undefined', () => {
    expect(sanitizeHTML(null)).toBe('');
    expect(sanitizeHTML(undefined)).toBe('');
  });

  it('should correctly sanitize a string with HTML characters', () => {
    const input = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;';
    expect(sanitizeHTML(input)).toBe(expected);
  });

  it('should return the same string if no HTML characters are present', () => {
    const input = 'This is a clean string.';
    expect(sanitizeHTML(input)).toBe(input);
  });
});
