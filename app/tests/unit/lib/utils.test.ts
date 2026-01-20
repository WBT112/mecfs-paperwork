import { describe, it, expect } from 'vitest';
import {
  emptyStringToNull,
  isRecord,
  stripHtml,
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
  describe('stripHtml', () => {
    it('should return an empty string for an empty input', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should return the same string if it contains no HTML', () => {
      expect(stripHtml('hello world')).toBe('hello world');
    });

    it('should strip a single HTML tag', () => {
      expect(stripHtml('<p>hello</p>')).toBe('hello');
    });

    it('should strip multiple HTML tags', () => {
      expect(stripHtml('<div><h1>hello</h1><p>world</p></div>')).toBe(
        'helloworld',
      );
    });

    it('should handle nested HTML tags', () => {
      expect(stripHtml('<div><p><b>hello</b></p></div>')).toBe('hello');
    });

    it('should handle self-closing tags', () => {
      expect(stripHtml('hello<br/>world')).toBe('helloworld');
    });

    it('should handle attributes in tags', () => {
      expect(stripHtml('<p class="foo">hello</p>')).toBe('hello');
    });

    it('should handle malformed HTML', () => {
      expect(stripHtml('<p>hello<b>world')).toBe('helloworld');
    });
  });
});
