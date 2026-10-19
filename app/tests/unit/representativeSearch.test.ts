import { describe, expect, it } from 'vitest';
import type { RepresentativeCatalogEntry } from '../../src/features/representative-letter/data/catalogs';
import { filterRepresentatives } from '../../src/features/representative-letter/representativeSearch';

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

describe('filterRepresentatives', () => {
  it('matches names independent of case, accents, umlauts, and spacing', () => {
    expect(
      filterRepresentatives(representatives, '  ERIKA aeusserst ', ''),
    ).toEqual([representatives[0]]);
    expect(filterRepresentatives(representatives, 'Cansin', '')).toEqual([
      representatives[1],
    ]);
  });

  it('matches constituency names, numbers, and multiple tokens', () => {
    expect(filterRepresentatives(representatives, '75 mitte', '')).toEqual([
      representatives[0],
    ]);
    expect(filterRepresentatives(representatives, 'muenchen 220', '')).toEqual([
      representatives[1],
    ]);
  });

  it('combines the state filter with the query', () => {
    expect(filterRepresentatives(representatives, '', 'BY')).toEqual([
      representatives[1],
    ]);
    expect(filterRepresentatives(representatives, 'Beispiel', 'BE')).toEqual(
      [],
    );
  });

  it('returns all entries when both filters are empty', () => {
    expect(filterRepresentatives(representatives, ' ', '')).toEqual(
      representatives,
    );
  });
});
