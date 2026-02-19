import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildOffLabelAntragDocumentModel } from '../../../src/formpacks/offlabel-antrag/export/documentModel';
import { buildOfflabelAntragPdfDocumentModel } from '../../../src/formpacks/offlabel-antrag/export/pdfDocumentModel';

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

vi.mock('../../../src/i18n', () => ({
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

describe('buildOfflabelAntragPdfDocumentModel', () => {
  it('sets createdAt and locale metadata', () => {
    const model = buildOfflabelAntragPdfDocumentModel({
      formData: {
        request: {
          drug: 'ivabradine',
        },
      },
      locale: 'de',
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(model.meta?.createdAtIso).toBe(FIXED_EXPORTED_AT.toISOString());
    expect(model.meta?.locale).toBe('de');
  });

  it('contains stable sections for part1/part2/part3/sources', () => {
    const model = buildOfflabelAntragPdfDocumentModel({
      formData: {
        request: {
          drug: 'ivabradine',
        },
      },
      locale: 'de',
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(model.sections.map((section) => section.id)).toEqual([
      'part1',
      'part2',
      'part3',
      'sources',
    ]);
  });

  it('matches point branching from the DOCX-parity document model', () => {
    const standardModel = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );
    const standardPdfModel = buildOfflabelAntragPdfDocumentModel({
      formData: {
        request: {
          drug: 'ivabradine',
        },
      },
      locale: 'de',
      exportedAt: FIXED_EXPORTED_AT,
    });

    const standardPart1Text = standardModel.kk.paragraphs.join('\n');
    expect(standardPart1Text).toContain('Punkt 10:');
    expect(standardPart1Text).not.toContain('Punkt 7:');
    expect(standardPart1Text).not.toContain('Punkt 9:');

    const standardTemplateData = standardPdfModel.meta?.templateData as {
      exportBundle: { part1: { paragraphs: string[] } };
    };
    expect(standardTemplateData.exportBundle.part1.paragraphs).toEqual(
      standardModel.kk.paragraphs,
    );

    const otherModel = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'other',
          otherDrugName: 'Midodrin',
          otherIndication: 'Orthostatische Intoleranz',
          otherTreatmentGoal: 'Besserer Kreislauf',
          otherDose: '2,5 mg morgens',
          otherDuration: '12 Wochen',
          otherMonitoring: 'Puls und Blutdruck',
          standardOfCareTriedFreeText: 'Kompressionstherapie',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const otherPart1Text = otherModel.kk.paragraphs.join('\n');
    expect(otherPart1Text).toContain('Punkt 7:');
    expect(otherPart1Text).toContain('Punkt 9:');
    expect(otherPart1Text).not.toContain('Punkt 10:');
  });

  it('keeps sources medication-specific', () => {
    const model = buildOfflabelAntragPdfDocumentModel({
      formData: {
        request: {
          drug: 'agomelatin',
        },
      },
      locale: 'de',
      exportedAt: FIXED_EXPORTED_AT,
    });

    const templateData = model.meta?.templateData as {
      sources: string[];
      sourcesHeading: string;
    };

    expect(templateData.sourcesHeading).toBe('Quellen');
    expect(templateData.sources.join(' ')).toContain('Bewertung Agomelatin');
    expect(templateData.sources.join(' ')).not.toContain('Bewertung Ivabradin');
    expect(templateData.sources.join(' ')).not.toContain(
      'Bewertung Vortioxetin',
    );
  });
});
