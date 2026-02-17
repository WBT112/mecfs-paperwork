import { describe, expect, it } from 'vitest';
import {
  MEDICATIONS,
  OFFLABEL_MEDICATION_KEYS,
  STANDARD_MEDICATION_KEYS,
} from '../../src/formpacks/offlabel-antrag/medications';

describe('offlabel medication source consistency', () => {
  it('keeps medication key constants and registry keys in sync', () => {
    const registryKeys = Object.keys(MEDICATIONS).sort();
    const constantKeys = [...OFFLABEL_MEDICATION_KEYS].sort();

    expect(registryKeys).toEqual(constantKeys);
  });

  it('defines complete preview and export facts for every built-in medication', () => {
    for (const key of STANDARD_MEDICATION_KEYS) {
      const profile = MEDICATIONS[key];

      expect(profile.isOther).toBe(false);
      expect(profile.displayNameDe.length).toBeGreaterThan(0);
      expect(profile.point2DiagnosisSentenceDe.length).toBeGreaterThan(0);
      expect(profile.point2DiagnosisSentenceEn.length).toBeGreaterThan(0);
      expect(profile.autoFacts?.de.diagnosisMain.length).toBeGreaterThan(0);
      expect(profile.autoFacts?.en.diagnosisMain.length).toBeGreaterThan(0);
    }
  });

  it('keeps the other medication entry available as manual path', () => {
    const other = MEDICATIONS.other;

    expect(other).toBeDefined();
    expect(other.isOther).toBe(true);
    expect(other.requiresManualFields).toBe(true);
    expect(other.autoFacts).toBeUndefined();
    expect(other.point2DiagnosisSentenceDe).toBe('');
    expect(other.point2DiagnosisSentenceEn).toBe('');
  });
});
