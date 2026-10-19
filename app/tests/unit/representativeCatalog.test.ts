import { describe, expect, it } from 'vitest';
import { representativeCatalog } from '../../src/features/representative-letter/data/representativeCatalog';

describe('representative catalog', () => {
  it('contains one uniquely identified entry per active mandate', () => {
    const identifiers = new Set(
      representativeCatalog.representatives.map(({ id }) => id),
    );

    expect(representativeCatalog.representatives).toHaveLength(
      representativeCatalog.sourceCounts.activeMandates,
    );
    expect(identifiers.size).toBe(representativeCatalog.representatives.length);
  });

  it('uses only verified public addresses or an explicit missing state', () => {
    for (const representative of representativeCatalog.representatives) {
      if (representative.emailStatus === 'verified') {
        expect(representative.email).toMatch(/@bundestag\.de$/u);
      } else {
        expect(representative.email).toBeNull();
      }
      expect(representative.emailSourceUrl).toMatch(/^https:\/\//u);
      expect(representative.officialContactUrl).toMatch(/^https:\/\//u);
    }
  });

  it('covers all German federal states', () => {
    const stateCodes = new Set(
      representativeCatalog.representatives.map(({ stateCode }) => stateCode),
    );

    expect(stateCodes).toEqual(
      new Set([
        'BB',
        'BE',
        'BW',
        'BY',
        'HB',
        'HE',
        'HH',
        'MV',
        'NI',
        'NW',
        'RP',
        'SH',
        'SL',
        'SN',
        'ST',
        'TH',
      ]),
    );
  });
});
