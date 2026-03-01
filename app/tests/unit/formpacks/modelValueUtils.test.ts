import { describe, expect, it } from 'vitest';
import {
  formatBirthDate,
  getArrayValue,
  getRecordValue,
  getStringValue,
} from '../../../src/formpacks/modelValueUtils';

const FORMATTED_BIRTH_DATE = '19-02-2026';

describe('modelValueUtils', () => {
  describe('getRecordValue', () => {
    it('returns a record when value is an object', () => {
      expect(getRecordValue({ a: 1 })).toEqual({ a: 1 });
    });

    it('returns null for non-record values', () => {
      expect(getRecordValue(null)).toBeNull();
      expect(getRecordValue(['a'])).toBeNull();
      expect(getRecordValue('value')).toBeNull();
    });
  });

  describe('getArrayValue', () => {
    it('returns arrays as-is', () => {
      const value = ['a', 'b'];
      expect(getArrayValue(value)).toBe(value);
    });

    it('returns an empty array for non-array values', () => {
      expect(getArrayValue({})).toEqual([]);
      expect(getArrayValue(null)).toEqual([]);
    });
  });

  describe('getStringValue', () => {
    it('returns null for non-string and blank string values', () => {
      expect(getStringValue(123)).toBeNull();
      expect(getStringValue('   ')).toBeNull();
    });

    it('returns trimmed non-empty string values', () => {
      expect(getStringValue('  value  ')).toBe('value');
    });
  });

  describe('formatBirthDate', () => {
    it('returns null for empty input', () => {
      expect(formatBirthDate(null)).toBeNull();
      expect(formatBirthDate('')).toBeNull();
    });

    it('formats yyyy-mm-dd and yyyy/mm/dd to dd-mm-yyyy', () => {
      expect(formatBirthDate('2026-02-19')).toBe(FORMATTED_BIRTH_DATE);
      expect(formatBirthDate('2026/02/19')).toBe(FORMATTED_BIRTH_DATE);
    });

    it('formats dd.mm.yyyy and dd-mm-yyyy to dd-mm-yyyy', () => {
      expect(formatBirthDate('19.02.2026')).toBe(FORMATTED_BIRTH_DATE);
      expect(formatBirthDate('19-02-2026')).toBe(FORMATTED_BIRTH_DATE);
    });

    it('returns unmatched formats unchanged', () => {
      expect(formatBirthDate('2026.02.19')).toBe('2026.02.19');
    });
  });
});
