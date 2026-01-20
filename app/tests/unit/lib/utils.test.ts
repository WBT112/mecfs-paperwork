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
    it('should strip non-whitelisted HTML tags', () => {
      const input = '<p>Hello <b>world</b></p>';
      const expected = 'Hello world';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should return an empty string if all content is tags', () => {
      const input = '<b><i></i></b>';
      const expected = '';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should handle empty string input', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    // Test for XSS vulnerability
    it('should neutralize javascript links', () => {
      const input = '"><a href="javascript:alert(1)">CLICK</a>';
      const expected = '"&gt;<a>CLICK</a>';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should allow safe http/https schemes', () => {
      const input =
        '<a href="https://example.com">OK</a> and <a href="http://example.com">OK</a>';
      const expected =
        '<a href="https://example.com">OK</a> and <a href="http://example.com">OK</a>';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should allow safe mailto schemes', () => {
      const input = '<a href="mailto:test@example.com">Email</a>';
      const expected = '<a href="mailto:test@example.com">Email</a>';
      expect(sanitizeHTML(input)).toBe(expected);
    });

    it('should strip disallowed attributes from allowed tags', () => {
      const input =
        '<a href="https://example.com" onclick="alert(1)">Click</a>';
      const expected = '<a href="https://example.com">Click</a>';
      expect(sanitizeHTML(input)).toBe(expected);
    });
  });
});
