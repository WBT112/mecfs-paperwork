import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { buildI18nContext, setNested } from '../../../src/export/buildI18nContext';
import i18n from '../../../src/i18n';

describe('buildI18nContext', () => {
  beforeEach(async () => {
    await i18n.init();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deterministic ordering', () => {
    it('produces consistent output regardless of input order', () => {
      const mockResources = {
        'zebra.key': 'Zebra',
        'alpha.key': 'Alpha',
        'middle.key': 'Middle',
        'beta.key': 'Beta',
      };

      vi.spyOn(i18n, 'getResourceBundle').mockReturnValue(mockResources);

      const result1 = buildI18nContext('test', 'en');
      const result2 = buildI18nContext('test', 'en');

      // Results should be identical
      expect(result1).toEqual(result2);

      // Keys should be in sorted order
      const keys = Object.keys(result1.t);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });

    it('handles multiple calls with same data consistently', () => {
      const mockResources = {
        'z.value': 'Z',
        'a.value': 'A',
        'm.value': 'M',
        'b.value': 'B',
      };

      vi.spyOn(i18n, 'getResourceBundle').mockReturnValue(mockResources);

      const results = Array.from({ length: 5 }, () =>
        buildI18nContext('test', 'en'),
      );

      // All results should be identical
      results.forEach((result) => {
        expect(result).toEqual(results[0]);
      });
    });

    it('applies prefix filter with deterministic ordering', () => {
      const mockResources = {
        'pack.z.key': 'Z',
        'pack.a.key': 'A',
        'pack.m.key': 'M',
        'other.key': 'Other',
      };

      vi.spyOn(i18n, 'getResourceBundle').mockReturnValue(mockResources);

      const result = buildI18nContext('test', 'en', 'pack');

      // Should only include 'pack.' prefixed keys
      expect(result.t).toHaveProperty('pack');
      expect(result.t).not.toHaveProperty('other');
    });
  });

  describe('setNested', () => {
    it('sets nested values correctly', () => {
      const target = {};
      setNested(target, 'a.b.c', 'value');
      expect(target).toEqual({ a: { b: { c: 'value' } } });
    });

    it('handles existing nested structures', () => {
      const target = { a: { b: { existing: 'value' } } };
      setNested(target, 'a.b.new', 'new value');
      expect(target).toEqual({
        a: { b: { existing: 'value', new: 'new value' } },
      });
    });

    it('handles empty key gracefully', () => {
      const target = {};
      setNested(target, '', 'value');
      expect(target).toEqual({});
    });
  });

  describe('hardening', () => {
    it('returns empty context when getResourceBundle throws', () => {
      vi.spyOn(i18n, 'getResourceBundle').mockImplementation(() => {
        throw new Error('Resource not found');
      });

      const result = buildI18nContext('missing', 'en');
      expect(result).toEqual({ t: {} });
    });

    it('ignores non-string values in resources', () => {
      const mockResources = {
        'valid.key': 'Valid String',
        'invalid.number': 123,
        'invalid.boolean': true,
        'invalid.object': { nested: 'object' },
        'invalid.array': ['array'],
      };

      vi.spyOn(i18n, 'getResourceBundle').mockReturnValue(mockResources);

      const result = buildI18nContext('test', 'en');

      expect(result.t).toHaveProperty('valid');
      expect(result.t).not.toHaveProperty('invalid');
    });

    it('returns empty context when resources is not a record', () => {
      vi.spyOn(i18n, 'getResourceBundle').mockReturnValue('not an object');

      const result = buildI18nContext('test', 'en');
      expect(result).toEqual({ t: {} });
    });
  });
});
