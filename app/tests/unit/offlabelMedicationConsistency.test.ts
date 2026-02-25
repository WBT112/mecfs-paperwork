// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  getVisibleMedicationKeys,
  MEDICATIONS,
  OFFLABEL_MEDICATION_KEYS,
  STANDARD_MEDICATION_KEYS,
} from '../../src/formpacks/offlabel-antrag/medications';

describe('offlabel medication source consistency', () => {
  it('uses official BfArM titles for agomelatin, ivabradine, and vortioxetine', () => {
    const agomelatinSource =
      MEDICATIONS.agomelatin.autoFacts?.de.expertSourceText;
    const ivabradineSource =
      MEDICATIONS.ivabradine.autoFacts?.de.expertSourceText;
    const vortioxetineSource =
      MEDICATIONS.vortioxetine.autoFacts?.de.expertSourceText;

    expect(agomelatinSource).toContain(
      'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Agomelatin',
    );
    expect(ivabradineSource).toContain(
      'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Ivabradin',
    );
    expect(vortioxetineSource).toContain(
      'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Vortioxetin',
    );

    expect(agomelatinSource).not.toContain(
      'Bewertung Agomelatin – Expertengruppe Long COVID Off-Label-Use beim BfArM',
    );
    expect(ivabradineSource).not.toContain(
      'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM',
    );
    expect(vortioxetineSource).not.toContain(
      'Bewertung Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM',
    );
  });

  it('keeps diagnosis confirmation sentences focused on underlying diagnoses', () => {
    const disallowedStartsDe = [
      'Die Diagnose Fatigue bei ',
      'Die Diagnose kognitive Beeinträchtigungen ',
      'Die Diagnose depressive Symptome ',
    ];
    const disallowedStartsEn = [
      'The diagnosis of fatigue in ',
      'The diagnosis of cognitive impairment in ',
      'The diagnosis of depressive symptoms in ',
    ];

    for (const key of STANDARD_MEDICATION_KEYS) {
      const profile = MEDICATIONS[key];
      for (const indication of profile.indications) {
        const sentenceDe = indication.texts.de.point2ConfirmationSentence;
        const sentenceEn = indication.texts.en.point2ConfirmationSentence;
        for (const disallowedStart of disallowedStartsDe) {
          expect(sentenceDe.startsWith(disallowedStart)).toBe(false);
        }
        for (const disallowedStart of disallowedStartsEn) {
          expect(sentenceEn.startsWith(disallowedStart)).toBe(false);
        }
      }
    }
  });

  it('keeps medication key constants and registry keys in sync', () => {
    const registryKeys = Object.keys(MEDICATIONS).sort();
    const constantKeys = [...OFFLABEL_MEDICATION_KEYS].sort();

    expect(registryKeys).toEqual(constantKeys);
  });

  it('defines complete preview and export facts for every built-in medication', () => {
    for (const key of STANDARD_MEDICATION_KEYS) {
      const profile = MEDICATIONS[key];

      expect(profile.isOther).toBe(false);
      expect(profile.visibility).toBe('public');
      expect(profile.displayNameDe.length).toBeGreaterThan(0);
      expect(profile.indications.length).toBeGreaterThan(0);
      expect(profile.autoFacts?.de.doseAndDuration.length).toBeGreaterThan(0);
      expect(profile.autoFacts?.en.doseAndDuration.length).toBeGreaterThan(0);
      for (const indication of profile.indications) {
        expect(indication.key.startsWith(`${key}.`)).toBe(true);
        expect(indication.texts.de.label.length).toBeGreaterThan(0);
        expect(indication.texts.en.label.length).toBeGreaterThan(0);
        expect(indication.texts.de.diagnosisNominative.length).toBeGreaterThan(
          0,
        );
        expect(indication.texts.de.diagnosisDative.length).toBeGreaterThan(0);
        expect(
          indication.texts.de.point2ConfirmationSentence.length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the other medication entry available as manual path', () => {
    const other = MEDICATIONS.other;

    expect(other).toBeDefined();
    expect(other.isOther).toBe(true);
    expect(other.visibility).toBe('public');
    expect(other.requiresManualFields).toBe(true);
    expect(other.autoFacts).toBeUndefined();
    expect(other.indications).toEqual([]);
  });

  it('returns all medication keys when no dev-only medications are configured', () => {
    expect(getVisibleMedicationKeys(false)).toEqual([
      ...OFFLABEL_MEDICATION_KEYS,
    ]);
    expect(getVisibleMedicationKeys(true)).toEqual([
      ...OFFLABEL_MEDICATION_KEYS,
    ]);
  });
});
