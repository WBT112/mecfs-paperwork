import { describe, it, expect } from 'vitest';
import { emptyStringToNull, sanitizeHTML } from '../../../src/lib/utils';

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
  describe('sanitizeHTML', () => {
    it('should return an empty string for null input', () => {
      expect(sanitizeHTML(null)).toBe('');
    });

    it('should return an empty string for undefined input', () => {
      expect(sanitizeHTML(undefined)).toBe('');
    });

    it('should strip HTML tags from the input string', () => {
      const input = '<p>Hello, <strong>World!</strong></p>';
      const expected = 'Hello, World!';
      expect(sanitizeHTML(input)).toBe(expected);
    });
  });
});
