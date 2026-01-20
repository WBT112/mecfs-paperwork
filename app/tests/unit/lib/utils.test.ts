import { describe, it, expect } from 'vitest';
import {
  emptyStringToNull,
  isRecord,
  sanitizeHTML,
} from '../../../src/lib/utils';

describe('utils', () => {
  describe('emptyStringToNull', () => {
    it('should return null for null input', () => {
      expect(emptyStringToNull(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(emptyStringToNull(undefined)).toBeNull();
    });

    it('should return null for an empty string', () => {
      expect(emptyStringToNull('')).toBeNull();
    });

    it('should return null for a string with only whitespace', () => {
      expect(emptyStringToNull('   ')).toBeNull();
    });

    it('should return a trimmed string for a string with leading/trailing whitespace', () => {
      expect(emptyStringToNull('  hello  ')).toBe('hello');
    });

    it('should return the same string if it has no leading/trailing whitespace', () => {
      expect(emptyStringToNull('hello')).toBe('hello');
    });
  });

  describe('isRecord', () => {
    it('should return true for a simple object', () => {
      expect(isRecord({})).toBe(true);
    });

    it('should return true for an object with properties', () => {
      expect(isRecord({ a: 1, b: 'test' })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRecord(null)).toBe(false);
    });

    it('should return false for an array', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('should return false for a string', () => {
      expect(isRecord('hello')).toBe(false);
    });

    it('should return false for a number', () => {
      expect(isRecord(123)).toBe(false);
    });

    it('should return false for a boolean', () => {
      expect(isRecord(true)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRecord(undefined)).toBe(false);
    });
  });

  describe('sanitizeHTML', () => {
    it('should return an empty string if given an empty string', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should strip basic HTML tags', () => {
      const input = '<p>Hello, <b>world</b>!</p>';
      const expected = 'Hello, world!';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should handle multiple lines and tags', () => {
      const input = `
        <div>
          <h1>Title</h1>
          <p>This is a paragraph.</p>
        </div>
      `;
      const expected = 'Title\n          This is a paragraph.';
      expect(sanitizeHTML(input)).toContain(expected);
    });

    it('should strip script tags to prevent XSS', () => {
      const input =
        '<p>safe</p><script>alert("xss")</script><style>body{}</style>';
      const expected = 'safe';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should not change a string with no HTML', () => {
      const input = 'This is a clean string.';
      expect(sanitizeHTML(input)).toBe(input);
    });
  });
});
