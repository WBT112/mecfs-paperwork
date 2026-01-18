import { describe, it, expect } from 'vitest';
import { normalizeExportRevisions } from '../../../src/import/json';

describe('normalizeExportRevisions', () => {
  it('returns an empty array for undefined input', () => {
    expect(normalizeExportRevisions(undefined)).toEqual([]);
  });

  it('returns "invalid_revisions" for non-array input', () => {
    expect(normalizeExportRevisions({})).toBe('invalid_revisions');
    expect(normalizeExportRevisions(null)).toBe('invalid_revisions');
    expect(normalizeExportRevisions(123)).toBe('invalid_revisions');
    expect(normalizeExportRevisions('string')).toBe('invalid_revisions');
  });

  it('returns "invalid_revisions" for arrays containing invalid entries', () => {
    expect(normalizeExportRevisions([{}])).toBe('invalid_revisions');
    expect(normalizeExportRevisions([{ data: {} }, { label: 123 }])).toBe(
      'invalid_revisions',
    );
    expect(
      normalizeExportRevisions([{ data: {}, createdAt: new Date() }]),
    ).toBe('invalid_revisions');
    expect(normalizeExportRevisions([{ data: 'not-an-object' }])).toBe(
      'invalid_revisions',
    );
  });

  it('correctly normalizes valid revision arrays', () => {
    const revisions = [
      {
        label: 'Revision 1',
        data: { a: 1 },
        createdAt: '2023-01-01T00:00:00.000Z',
      },
      { data: { b: 2 } },
    ];
    const expected = [
      {
        label: 'Revision 1',
        data: { a: 1 },
        createdAt: '2023-01-01T00:00:00.000Z',
      },
      { data: { b: 2 } },
    ];
    expect(normalizeExportRevisions(revisions)).toEqual(expected);
  });
});
