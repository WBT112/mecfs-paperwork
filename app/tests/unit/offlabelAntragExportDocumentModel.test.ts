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
  it('uses preview-canonical standard path: point 10 present, points 7/9 absent', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const part1 = model.kk.paragraphs.join('\n');

    expect(part1).toContain('Punkt 10:');
    expect(part1).not.toContain('Punkt 7:');
    expect(part1).not.toContain('Punkt 9:');
    expect(part1).toContain('Bewertung Ivabradin');

    expect(model.sources).toHaveLength(3);
    expect(model.sources[1]).toContain('Bewertung Ivabradin');
    expect(model.kk.attachments).toHaveLength(1);
    expect(model.kk.attachments[0]).toContain('Bewertung: Ivabradin');
  });

  it('uses preview-canonical notstand path for other: points 7/9 present, point 10 absent', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'other',
          otherDrugName: 'Midodrin',
          otherIndication: 'Orthostatische Intoleranz',
          otherTreatmentGoal: 'Verbesserung Kreislaufstabilität',
          otherDose: '2,5 mg morgens',
          otherDuration: '12 Wochen',
          otherMonitoring: 'Puls und Blutdruck',
          standardOfCareTriedFreeText: 'Kompressionstherapie',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const part1 = model.kk.paragraphs.join('\n');

    expect(part1).toContain('Punkt 7:');
    expect(part1).toContain('Punkt 9:');
    expect(part1).not.toContain('Punkt 10:');

    expect(model.sources).toHaveLength(2);
    expect(model.sources[0]).toContain('Medizinischer Dienst Bund');
    expect(model.sources[1]).toContain('LSG Niedersachsen-Bremen');
    expect(model.kk.attachments).toEqual([]);
  });

  it('applies 2a=no conditional text from preview in part 1 and part 3', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
          indicationFullyMetOrDoctorConfirms: 'no',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.paragraphs.join('\n')).toContain(
      'Punkt 2: Die Diagnose ist gesichert',
    );
    expect(model.part3.paragraphs.join('\n')).toContain(
      'Der Patient leidet an den typischen Symptomen der Indikation',
    );
  });

  it('never keeps embedded newlines inside exported paragraph strings', () => {
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
          streetAndNumber: 'Testweg 1',
          postalCode: '12345',
          city: 'Berlin',
        },
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    for (const paragraph of model.kk.paragraphs) {
      expect(paragraph).not.toContain('\n');
    }
    for (const paragraph of model.arzt.paragraphs) {
      expect(paragraph).not.toContain('\n');
    }
    for (const paragraph of model.part3.paragraphs) {
      expect(paragraph).not.toContain('\n');
    }
  });

  it('keeps patient-only signature in part 1', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        patient: {
          firstName: 'Mara',
          lastName: 'Example',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.signatureBlocks).toEqual([
      {
        label: 'Patient/in',
        name: 'Mara Example',
      },
    ]);
  });

  it('parses user attachments into items', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        attachmentsFreeText:
          ' - Arztbrief vom 2026-01-10 \n• Befundbericht\nLaborwerte\n\n',
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.attachments.items).toEqual([
      'Arztbrief vom 2026-01-10',
      'Befundbericht',
      'Laborwerte',
    ]);
  });
});
