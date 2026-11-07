import { describe, expect, it } from 'vitest';
import { constituencyLocationCatalog } from '../../src/features/representative-letter/data/constituencyLocationCatalog';
import { searchConstituencyLocations } from '../../src/features/representative-letter/constituencyLocationSearch';

describe('constituency location catalog', () => {
  it('contains the complete validated 21st-term location snapshot', () => {
    expect(constituencyLocationCatalog.term.number).toBe(21);
    expect(constituencyLocationCatalog.sourceCounts).toMatchObject({
      federalStates: 16,
      constituencies: 299,
      locations: 10_713,
      postalCodes: 8_125,
    });
    expect(constituencyLocationCatalog.sources).toHaveLength(2);
    expect(
      constituencyLocationCatalog.sources.every(({ sha256 }) =>
        /^[a-f\d]{64}$/u.test(sha256),
      ),
    ).toBe(true);
  });

  it('retains real ambiguous postcode and municipality mappings', () => {
    expect(
      searchConstituencyLocations(
        constituencyLocationCatalog,
        '70184',
        '',
      ).matches.map(({ constituencyNumber }) => constituencyNumber),
    ).toEqual([258, 259]);
    expect(
      searchConstituencyLocations(
        constituencyLocationCatalog,
        'Stuttgart',
        '',
      ).matches.map(({ constituencyNumber }) => constituencyNumber),
    ).toEqual([258, 259]);
  });

  it('retains postcodes published directly for a city or county', () => {
    expect(
      searchConstituencyLocations(
        constituencyLocationCatalog,
        '34117',
        '',
      ).matches.map(({ constituencyNumber }) => constituencyNumber),
    ).toEqual([167]);
  });
});
