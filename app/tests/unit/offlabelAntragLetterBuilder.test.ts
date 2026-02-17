import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import {
  buildOffLabelAntragDocumentModel,
  parseOfflabelAttachments,
} from '../../src/formpacks/offlabel-antrag/export/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');
const PART1_DRAFT_ATTACHMENT = 'Teil 1: Antrag an die Krankenkasse (Entwurf)';

const interpolate = (
  template: string,
  options: Record<string, unknown>,
): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(options[key] ?? ''),
  );

vi.mock('../../src/i18n', () => ({
  default: {
    getFixedT:
      (locale: string) => (key: string, options?: Record<string, unknown>) => {
        const source = locale === 'en' ? enTranslations : deTranslations;
        const fallback =
          typeof options?.defaultValue === 'string'
            ? options.defaultValue
            : key;
        const template = source[key] ?? fallback;
        return interpolate(template, options ?? {});
      },
  },
}));

describe('offlabel-antrag letter builder', () => {
  it('always creates the full 3-part export bundle', () => {
    const bundle = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: '',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).exportBundle;

    expect(bundle.part1).toBeDefined();
    expect(bundle.part2).toBeDefined();
    expect(bundle.part3).toBeDefined();
    expect(bundle.part1.signatureBlocks).toEqual([
      {
        label: 'Patient/in',
        name: 'Max Mustermann',
      },
    ]);
    expect(bundle.part1.subject).toContain('BITTE AUSWÄHLEN');
  });

  it('references part 1 in part 2 and keeps part 3 title', () => {
    const bundle = buildOffLabelAntragDocumentModel({}, 'de', {
      exportedAt: FIXED_EXPORTED_AT,
    }).exportBundle;

    expect(bundle.part2.paragraphs.some((p) => p.includes('Teil 1'))).toBe(
      true,
    );
    expect(bundle.part2.attachments[0]).toBe(PART1_DRAFT_ATTACHMENT);
    expect(bundle.part3.title).toContain('Teil 3');
  });

  it('uses med-specific expert source and attachment for built-in medication', () => {
    const bundle = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'vortioxetine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).exportBundle;

    expect(bundle.part1.paragraphs.join(' | ')).toContain('Punkt 10:');
    expect(bundle.part1.attachments).toContain(
      'Bewertung: Vortioxetin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
    );
    expect(bundle.part1.attachments.join(' | ')).not.toContain(
      'Bewertung Ivabradin',
    );
    expect(bundle.part1.attachments.join(' | ')).not.toContain(
      'Bewertung Agomelatin',
    );
  });

  it('does not inject any expert attachment for other medication', () => {
    const bundle = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'other',
          otherDrugName: 'Midodrin',
          otherIndication: 'Orthostatische Intoleranz',
          otherTreatmentGoal: 'Symptomkontrolle',
          otherDose: '2,5 mg',
          otherDuration: '12 Wochen',
          otherMonitoring: 'Puls/BP',
          standardOfCareTriedFreeText: 'Kompressionstherapie',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).exportBundle;

    expect(bundle.part1.paragraphs.join(' | ')).toContain('Punkt 7:');
    expect(bundle.part1.paragraphs.join(' | ')).toContain('Punkt 9:');
    expect(bundle.part1.paragraphs.join(' | ')).not.toContain('Punkt 10:');
    expect(bundle.part1.attachments).toEqual([]);
  });

  it('uses locale defaults for fallback values', () => {
    const bundle = buildOffLabelAntragDocumentModel(
      {
        patient: {
          firstName: '',
          lastName: '',
        },
        doctor: {
          name: '',
        },
        insurer: {
          name: '',
        },
      },
      'en',
      { exportedAt: FIXED_EXPORTED_AT },
    ).exportBundle;

    expect(bundle.part1.senderLines[0]).toBe('Max Example');
    expect(bundle.part1.addresseeLines[0]).toBe('Example Health Insurance');
    expect(bundle.part1.subject).toContain('PLEASE SELECT');
  });

  it('parses attachment free text via exported helper', () => {
    expect(parseOfflabelAttachments(' - Befund A\n• Befund B\n\n')).toEqual([
      'Befund A',
      'Befund B',
    ]);
    expect(parseOfflabelAttachments(null)).toEqual([]);
  });

  it('exposes part 1 letter via document model', () => {
    const letter = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'agomelatin' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).kk;

    expect(letter.subject).toContain('Agomelatin');
    expect(letter.signatureBlocks).toEqual([
      { label: 'Patient/in', name: 'Max Mustermann' },
    ]);
    expect(letter.paragraphs.some((p) => p.includes('Punkt 10:'))).toBe(true);
  });

  it('exposes part 2 doctor letter via document model', () => {
    const letter = buildOffLabelAntragDocumentModel(
      {
        doctor: { name: 'Dr. Muster' },
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).arzt;

    expect(letter.subject).toContain('Begleitschreiben');
    expect(letter.paragraphs.some((p) => p.includes('Teil 1'))).toBe(true);
    expect(letter.attachments[0]).toBe(PART1_DRAFT_ATTACHMENT);
  });
});
