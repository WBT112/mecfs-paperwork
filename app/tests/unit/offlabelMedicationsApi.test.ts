// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import {
  getMedicationDisplayName,
  getMedicationIndications,
  getVisibleMedicationKeys,
  getVisibleMedicationOptions,
  hasMultipleMedicationIndications,
  isMedicationKey,
  isMedicationVisible,
  MEDICATIONS,
  normalizeMedicationKey,
  OFFLABEL_MEDICATION_KEYS,
  resolveMedicationIndication,
  resolveMedicationProfile,
} from '../../src/formpacks/offlabel-antrag/medications';

describe('offlabel medications API', () => {
  const originalAgomelatinVisibility = MEDICATIONS.agomelatin.visibility;

  afterEach(() => {
    MEDICATIONS.agomelatin.visibility = originalAgomelatinVisibility;
  });

  it('validates medication keys and normalizes unknown values to other', () => {
    expect(isMedicationKey('agomelatin')).toBe(true);
    expect(isMedicationKey('not-a-key')).toBe(false);
    expect(isMedicationKey(123)).toBe(false);

    expect(normalizeMedicationKey('ivabradine')).toBe('ivabradine');
    expect(normalizeMedicationKey('unknown')).toBe('other');
    expect(normalizeMedicationKey(null)).toBe('other');
  });

  it('resolves profiles and display names for both locales', () => {
    expect(resolveMedicationProfile('agomelatin').key).toBe('agomelatin');
    expect(resolveMedicationProfile('invalid').key).toBe('other');

    expect(getMedicationDisplayName('agomelatin', 'de')).toBe('Agomelatin');
    expect(getMedicationDisplayName('agomelatin', 'en')).toBe('Agomelatine');
  });

  it('filters dev-only medications based on the dev visibility flag', () => {
    MEDICATIONS.agomelatin.visibility = 'dev';

    expect(isMedicationVisible('agomelatin', false)).toBe(false);
    expect(isMedicationVisible('agomelatin', true)).toBe(true);

    const publicKeys = getVisibleMedicationKeys(false);
    const withDevKeys = getVisibleMedicationKeys(true);

    expect(publicKeys).not.toContain('agomelatin');
    expect(withDevKeys).toContain('agomelatin');
    expect(withDevKeys).toEqual(
      expect.arrayContaining([...OFFLABEL_MEDICATION_KEYS]),
    );
  });

  it('builds visible medication options with default and explicit dev flags', () => {
    MEDICATIONS.agomelatin.visibility = 'dev';

    const defaultOptions = getVisibleMedicationOptions('de');
    const devOptions = getVisibleMedicationOptions('en', true);

    expect(defaultOptions.some((entry) => entry.key === 'agomelatin')).toBe(
      false,
    );
    expect(devOptions.some((entry) => entry.key === 'agomelatin')).toBe(true);
  });

  it('returns indication options for known medication and empty list for unknown', () => {
    const ldnIndications = getMedicationIndications('ldn', 'de');
    const unknownIndications = getMedicationIndications('unknown', 'en');

    expect(ldnIndications.length).toBeGreaterThan(1);
    expect(ldnIndications[0]?.key).toBe('ldn.mecfs_fatigue');
    expect(typeof ldnIndications[0]?.label).toBe('string');
    expect(unknownIndications).toEqual([]);
  });

  it('reports whether a profile has multiple indications', () => {
    expect(hasMultipleMedicationIndications(MEDICATIONS.ldn)).toBe(true);
    expect(hasMultipleMedicationIndications(MEDICATIONS.ivabradine)).toBe(
      false,
    );
  });

  it('resolves indication details with null, fallback, and explicit selection paths', () => {
    expect(
      resolveMedicationIndication(MEDICATIONS.other, 'x', 'de'),
    ).toBeNull();

    const fallback = resolveMedicationIndication(MEDICATIONS.ldn, 123, 'de');
    expect(fallback?.key).toBe('ldn.mecfs_fatigue');

    const explicit = resolveMedicationIndication(
      MEDICATIONS.ldn,
      'ldn.long_post_covid_fatigue',
      'en',
    );
    expect(explicit?.key).toBe('ldn.long_post_covid_fatigue');
    expect(explicit?.diagnosisNominative).toContain('long/post-COVID');
  });
});
