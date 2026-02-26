import { describe, expect, it } from 'vitest';
import { formatPdfDate } from '../../../src/export/pdf/render';

describe('formatPdfDate', () => {
  it('formats valid dates for the locale', () => {
    const formatted = formatPdfDate(new Date('2026-02-02T00:00:00.000Z'), 'en');
    expect(formatted).toContain('2026');
  });

  it('returns the input string when the date is invalid', () => {
    expect(formatPdfDate('not-a-date', 'en')).toBe('not-a-date');
  });

  it('returns an empty string for invalid Date objects', () => {
    expect(formatPdfDate(new Date('invalid-date'), 'en')).toBe('');
  });
});
