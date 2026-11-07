import { describe, expect, it } from 'vitest';
import type { RepresentativeCatalogEntry } from '../../src/features/representative-letter/data/catalogs';
import { findRepresentativesForConstituency } from '../../src/features/representative-letter/representativeSearch';

const createRepresentative = (
  overrides: Partial<RepresentativeCatalogEntry>,
): RepresentativeCatalogEntry => ({
  id: 'representative-1',
  fullName: 'Erika Äußerst',
  firstName: 'Erika',
  lastName: 'Äußerst',
  state: 'Berlin',
  stateCode: 'BE',
  constituency: { number: 75, name: 'Berlin-Mitte' },
  mandateType: 'direct',
  mandateStart: '2025-03-25',
  mandateEnd: null,
  parliamentaryGroup: 'Beispielgruppe',
  email: 'erika.aeusserst@bundestag.de',
  emailStatus: 'verified',
  emailSourceUrl: 'https://example.test/address-book',
  officialProfileUrl: 'https://example.test/profile',
  officialContactUrl: 'https://example.test/contact',
  abgeordnetenwatchProfileUrl: 'https://example.test/watch',
  verifiedAt: '2026-10-19',
  ...overrides,
});

const representatives = [
  createRepresentative({}),
  createRepresentative({
    id: 'representative-2',
    fullName: 'Cansın Beispiel',
    firstName: 'Cansın',
    lastName: 'Beispiel',
    state: 'Bayern',
    stateCode: 'BY',
    constituency: { number: 220, name: 'München-West' },
  }),
  createRepresentative({
    id: 'representative-3',
    fullName: 'Kai Muster',
    firstName: 'Kai',
    lastName: 'Muster',
    state: 'Bremen',
    stateCode: 'HB',
    constituency: null,
  }),
];

describe('findRepresentativesForConstituency', () => {
  it('returns only representatives assigned to the selected constituency', () => {
    expect(findRepresentativesForConstituency(representatives, 220)).toEqual([
      representatives[1],
    ]);
    expect(findRepresentativesForConstituency(representatives, 75)).toEqual([
      representatives[0],
    ]);
  });

  it('excludes entries without a constituency and unknown constituencies', () => {
    expect(findRepresentativesForConstituency(representatives, 999)).toEqual(
      [],
    );
  });
});
