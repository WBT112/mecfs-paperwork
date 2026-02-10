import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildOffLabelAntragDocumentModel } from '../../src/formpacks/offlabel-antrag/export/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');

const interpolate = (
  template: string,
  options: Record<string, unknown> = {},
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
        return interpolate(template, options);
      },
  },
}));

describe('buildOffLabelAntragDocumentModel', () => {
  it('builds both letters with patient-only signature and statement draft by default', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        patient: {
          firstName: 'Mara',
          lastName: 'Example',
          city: 'Hamburg',
        },
        doctor: {
          name: 'Dr. Hausarzt',
          practice: 'Praxis Nord',
        },
        request: {
          drug: 'ivabradine',
          symptomsFreeText: 'orthostatische Tachykardie',
          doctorSupport: {
            enabled: true,
          },
        },
        attachmentsFreeText: '- Arztbrief\n• Befundbericht',
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.subject).toContain('Ivabradin');
    expect(model.kk.signatureBlocks).toEqual([
      {
        label: 'Patient/in',
        name: 'Mara Example',
      },
    ]);
    expect(model.arzt).toBeDefined();
    expect(
      model.arzt?.paragraphs.some((paragraph) =>
        paragraph.includes('ENTWURF - Ärztliche Stellungnahme'),
      ),
    ).toBe(true);
    expect(
      model.arzt?.paragraphs.some((paragraph) =>
        paragraph.includes('Initial 2,5 mg zweimal täglich'),
      ),
    ).toBe(true);
    expect(model.arzt?.attachments[0]).toBe(
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
    );
    expect(model.sources).toHaveLength(5);
    expect(model.hasSources).toBe('1');
    expect(model.hasPart2).toBe('1');
  });

  it('always keeps part 2 but allows disabling sources', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        export: {
          includeDoctorCoverLetter: false,
          includeSources: false,
        },
        request: {
          doctorSupport: {
            enabled: true,
          },
        },
        attachmentsFreeText: 'Labor',
      },
      'en',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.arzt).toBeDefined();
    expect(model.hasPart2).toBe('1');
    expect(model.hasSources).toBe('');
    expect(model.sources).toEqual([]);
    expect(model.kk.attachments).toEqual(['Labor']);
  });

  it('parses attachments from free text lines', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        attachmentsFreeText: ' - Arztbrief vom 01.01.2026\n• Befundbericht\n\n',
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.attachments.items).toEqual([
      'Arztbrief vom 01.01.2026',
      'Befundbericht',
    ]);
  });

  it('includes severity fragments only for populated dropdown values', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        severity: {
          bellScore: '40',
          pflegegrad: '3',
          mobilityLevel: 'housebound',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.paragraphs[1]).toContain('Bell-Score 40');
    expect(model.kk.paragraphs[1]).toContain('Pflegegrad 3');
    expect(model.kk.paragraphs[1]).toContain('hausgebunden');
    expect(model.kk.paragraphs[1]).not.toContain('GdB');
  });
});
