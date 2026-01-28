import { describe, it, expect } from 'vitest';
import {
  emptyStringToNull,
  isRecord,
  getFirstItem,
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

  describe('getFirstItem', () => {
    it('should return the first item of an array', () => {
      expect(getFirstItem([1, 2, 3])).toBe(1);
    });

    it('should return undefined for an empty array', () => {
      expect(getFirstItem([])).toBeUndefined();
    });

    it('should return the value itself if it is not an array', () => {
      expect(getFirstItem('test')).toBe('test');
      expect(getFirstItem(123)).toBe(123);
      expect(getFirstItem({ a: 1 })).toEqual({ a: 1 });
    });

    it('should return undefined for undefined input', () => {
      expect(getFirstItem(undefined)).toBeUndefined();
    });
  });
});
