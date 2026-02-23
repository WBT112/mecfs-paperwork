// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { hasPreviewValue } from '../../src/lib/preview';

describe('hasPreviewValue', () => {
  it('returns false for nullish values', () => {
    expect(hasPreviewValue(null)).toBe(false);
    expect(hasPreviewValue(undefined)).toBe(false);
  });

  it('returns true for non-empty strings and numbers', () => {
    expect(hasPreviewValue('value')).toBe(true);
    expect(hasPreviewValue(0)).toBe(true);
  });

  it('returns false for empty strings', () => {
    expect(hasPreviewValue('')).toBe(false);
    expect(hasPreviewValue('   ')).toBe(false);
  });

  it('returns true only for true booleans', () => {
    expect(hasPreviewValue(true)).toBe(true);
    expect(hasPreviewValue(false)).toBe(false);
  });

  it('handles arrays by checking entries', () => {
    expect(hasPreviewValue([])).toBe(false);
    expect(hasPreviewValue([''])).toBe(false);
    expect(hasPreviewValue(['ok'])).toBe(true);
    expect(hasPreviewValue([false, null, 'no', 'yes'])).toBe(true);
  });

  it('handles objects by checking values', () => {
    expect(hasPreviewValue({})).toBe(false);
    expect(hasPreviewValue({ empty: '' })).toBe(false);
    expect(hasPreviewValue({ nested: { value: 'ok' } })).toBe(true);
  });
});
