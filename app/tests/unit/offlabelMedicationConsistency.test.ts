import { describe, expect, it } from 'vitest';
import { DRUGS } from '../../src/formpacks/offlabel-antrag/content/drugConfig';
import {
  MEDICATIONS,
  STANDARD_MEDICATION_KEYS,
} from '../../src/formpacks/offlabel-antrag/medications';

describe('offlabel medication source consistency', () => {
  it('keeps built-in drug keys aligned across both sources', () => {
    const drugConfigBuiltInKeys = Object.keys(DRUGS)
      .filter((key) => key !== 'other')
      .sort();
    const medicationRegistryBuiltInKeys = [...STANDARD_MEDICATION_KEYS].sort();

    expect(drugConfigBuiltInKeys).toEqual(medicationRegistryBuiltInKeys);
  });

  it('keeps built-in display names in German aligned across both sources', () => {
    for (const key of STANDARD_MEDICATION_KEYS) {
      expect(DRUGS[key].displayName).toBe(MEDICATIONS[key].displayNameDe);
    }
  });

  it('keeps the other medication entry available in both sources', () => {
    expect(DRUGS.other).toBeDefined();
    expect(MEDICATIONS.other).toBeDefined();
    expect(MEDICATIONS.other.isOther).toBe(true);
  });
});
