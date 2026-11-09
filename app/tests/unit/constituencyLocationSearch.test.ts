import { describe, expect, it } from 'vitest';
import { searchConstituencyLocations } from '../../src/features/representative-letter/constituencyLocationSearch';
import { constituencyLocationCatalog } from '../../src/features/representative-letter/data/constituencyLocationCatalog';
import type { ConstituencyLocationCatalog } from '../../src/features/representative-letter/data/constituencyLocationCatalogs';

const catalog: ConstituencyLocationCatalog = {
  schemaVersion: 1,
  version: '2026-10-19',
  verifiedAt: '2026-10-19',
  constituencyStatus: '2024-11-30',
  term: { number: 21, electionDate: '2025-02-23' },
  sourceCounts: {
    federalStates: 2,
    constituencies: 3,
    locations: 4,
    postalCodes: 3,
  },
  sources: [],
  constituencies: [
    {
      number: 1,
      name: 'Nordkreis',
      stateCode: 'SH',
      state: 'Schleswig-Holstein',
      locations: [
        {
          county: 'Nordkreis',
          municipality: 'Sankt Ägidien',
          postalCodes: ['12345'],
        },
        {
          county: 'Nordkreis',
          municipality: 'Neustadt am Meer',
          postalCodes: ['22222'],
        },
      ],
    },
    {
      number: 2,
      name: 'Südkreis',
      stateCode: 'BY',
      state: 'Bayern',
      locations: [
        {
          county: 'Landkreis Beispiel',
          municipality: 'Neustadt',
          postalCodes: ['12345'],
        },
      ],
    },
    {
      number: 3,
      name: 'Westkreis',
      stateCode: 'SH',
      state: 'Schleswig-Holstein',
      locations: [
        {
          county: 'Kreis Äußerst',
          municipality: 'Dorfhausen',
          postalCodes: ['33333'],
        },
      ],
    },
  ],
};

describe('searchConstituencyLocations', () => {
  it.each([
    ['', 'idle'],
    ['  ', 'idle'],
    ['12', 'incomplete-postcode'],
    ['1234', 'incomplete-postcode'],
    ['123456', 'invalid-postcode'],
    ['12a45', 'invalid-postcode'],
    ['ab', 'incomplete-place'],
    ['unbekannt', 'not-found'],
  ] as const)('reports %s as %s', (query, status) => {
    expect(searchConstituencyLocations(catalog, query)).toEqual({
      status,
      matches: [],
    });
  });

  it('returns every constituency for an ambiguous full postcode', () => {
    const result = searchConstituencyLocations(catalog, '12345');

    expect(result.status).toBe('matches');
    expect(
      result.matches.map(({ constituencyNumber }) => constituencyNumber),
    ).toEqual([2, 1]);
  });

  it('normalizes case, umlauts, accents, punctuation, and St./Sankt', () => {
    expect(
      searchConstituencyLocations(catalog, ' ST. aegidien ').matches[0]
        ?.constituencyNumber,
    ).toBe(1);
    expect(
      searchConstituencyLocations(catalog, 'DORFHAUSEN').matches[0]
        ?.constituencyNumber,
    ).toBe(3);
  });

  it('does not expose county names as a separate search path', () => {
    expect(searchConstituencyLocations(catalog, 'Landkreis Beispiel')).toEqual({
      status: 'not-found',
      matches: [],
    });
  });

  it.each([
    ['Köln', 'Koln'],
    ['Koeln', 'Koln'],
    ['München', 'Munchen'],
    ['Muenchen', 'Munchen'],
  ])(
    'resolves %s and %s to the same constituencies',
    (original, simplified) => {
      const numbers = (query: string) =>
        searchConstituencyLocations(constituencyLocationCatalog, query)
          .matches.map(({ constituencyNumber }) => constituencyNumber)
          .sort((a, b) => a - b);
      expect(numbers(simplified)).toEqual(numbers(original));
      expect(numbers(original).length).toBeGreaterThan(0);
    },
  );

  it('ranks original spellings before simplified exact and prefix matches', () => {
    const spellingCatalog: ConstituencyLocationCatalog = {
      ...catalog,
      constituencies: ['Koln', 'Köln', 'Kölnerdorf', 'Alt-Köln'].map(
        (municipality, index) => ({
          ...catalog.constituencies[0],
          number: index + 1,
          locations: [
            { municipality, county: 'Example', postalCodes: ['12345'] },
          ],
        }),
      ),
    };
    expect(
      searchConstituencyLocations(spellingCatalog, 'Koln').matches.map(
        ({ constituencyNumber }) => constituencyNumber,
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it('limits postcode context to the matched postcode without changing the catalog', () => {
    const original = structuredClone(constituencyLocationCatalog);
    const result = searchConstituencyLocations(
      constituencyLocationCatalog,
      '50999',
    );
    expect(result.matches.length).toBeGreaterThan(0);
    for (const match of result.matches) {
      for (const location of match.locations) {
        expect(location.postalCodes).toEqual(['50999']);
      }
    }
    expect(constituencyLocationCatalog).toEqual(original);
  });

  it('ranks an exact municipality before prefix and county matches', () => {
    const result = searchConstituencyLocations(catalog, 'Neustadt');

    expect(
      result.matches.map(({ constituencyNumber }) => constituencyNumber),
    ).toEqual([2, 1]);
  });
});
