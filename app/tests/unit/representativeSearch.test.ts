import { describe, expect, it } from 'vitest';
import type { ConstituencyLocationMatch } from '../../src/features/representative-letter/constituencyLocationSearch';
import type { RepresentativeCatalogEntry } from '../../src/features/representative-letter/data/catalogs';
import { resolveRepresentativesForLocations } from '../../src/features/representative-letter/representativeSearch';

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

const MUNICH_CONSTITUENCY = 'München-West';

const representatives = [
  createRepresentative({}),
  createRepresentative({
    id: 'representative-2',
    fullName: 'Cansın Beispiel',
    firstName: 'Cansın',
    lastName: 'Beispiel',
    state: 'Bayern',
    stateCode: 'BY',
    constituency: { number: 220, name: MUNICH_CONSTITUENCY },
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
  createRepresentative({
    id: 'representative-4',
    fullName: 'Ada Beispiel',
    firstName: 'Ada',
    lastName: 'Beispiel',
    state: 'Bayern',
    stateCode: 'BY',
    constituency: { number: 220, name: MUNICH_CONSTITUENCY },
  }),
  createRepresentative({
    id: 'representative-5',
    fullName: 'Ada Beispiel',
    firstName: 'Ada',
    lastName: 'Beispiel',
    state: 'Bayern',
    stateCode: 'BY',
    constituency: { number: 220, name: MUNICH_CONSTITUENCY },
  }),
];

const createLocation = (
  constituencyNumber: number,
  constituencyName: string,
): ConstituencyLocationMatch => ({
  constituencyNumber,
  constituencyName,
  stateCode: 'BY',
  state: 'Bayern',
  locations: [
    {
      county: 'Beispielkreis',
      municipality: 'Beispielort',
      postalCodes: ['12345'],
    },
  ],
});

describe('resolveRepresentativesForLocations', () => {
  it('resolves matches in location order and sorts representatives by name', () => {
    const munich = createLocation(220, MUNICH_CONSTITUENCY);
    const berlin = createLocation(75, 'Berlin-Mitte');

    expect(
      resolveRepresentativesForLocations(representatives, [munich, berlin]),
    ).toEqual([
      { representative: representatives[3], location: munich },
      { representative: representatives[4], location: munich },
      { representative: representatives[1], location: munich },
      { representative: representatives[0], location: berlin },
    ]);
  });

  it('deduplicates representatives and excludes unusable catalog entries', () => {
    const munich = createLocation(220, MUNICH_CONSTITUENCY);

    expect(
      resolveRepresentativesForLocations(representatives, [munich, munich]),
    ).toEqual([
      { representative: representatives[3], location: munich },
      { representative: representatives[4], location: munich },
      { representative: representatives[1], location: munich },
    ]);
    expect(
      resolveRepresentativesForLocations(representatives, [
        createLocation(999, 'Unbekannt'),
      ]),
    ).toEqual([]);
    expect(
      resolveRepresentativesForLocations([representatives[2]], [munich]),
    ).toEqual([]);
  });
});
