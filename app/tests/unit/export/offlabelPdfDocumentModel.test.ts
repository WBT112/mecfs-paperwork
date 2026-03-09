import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildOffLabelAntragDocumentModel } from '../../../src/formpacks/offlabel-antrag/export/documentModel';
import { buildOfflabelAntragPdfDocumentModel } from '../../../src/formpacks/offlabel-antrag/export/pdfDocumentModel';
import * as offlabelDocumentModelModule from '../../../src/formpacks/offlabel-antrag/export/documentModel';

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
      'checklist',
    ]);
  });

  it('matches branching from the DOCX-parity document model', () => {
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
    expect(standardPart1Text).toContain(
      'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben.',
    );
    expect(standardPart1Text).not.toContain(
      'Ich beantrage Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.',
    );
    expect(standardPart1Text).not.toContain(
      'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild',
    );

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
          otherEvidenceReference: 'Musterstudie 2024, doi:10.1000/example',
          standardOfCareTriedFreeText: 'Kompressionstherapie',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const otherPart1Text = otherModel.kk.paragraphs.join('\n');
    expect(otherPart1Text).toContain(
      'Ich beantrage Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.',
    );
    expect(otherPart1Text).toContain(
      'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild',
    );
    expect(otherPart1Text).toContain(
      'wissenschaftliche Erkenntnisse: Musterstudie 2024, doi:10.1000/example',
    );
    expect(otherPart1Text).not.toContain(
      'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben.',
    );
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
    expect(templateData.sources.join(' ')).toContain(
      'zur Anwendung von Agomelatin zur Behandlung der Fatigue',
    );
    expect(templateData.sources.join(' ')).not.toContain(
      'zur Anwendung von Ivabradin',
    );
    expect(templateData.sources.join(' ')).not.toContain(
      'zur Anwendung von Vortioxetin',
    );
    expect(model.sections[4].id).toBe('checklist');
  });

  it('handles empty section primitives from the export model', () => {
    const base = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const mockedModel = {
      ...base,
      kk: {
        ...base.kk,
        senderLines: [],
        addresseeLines: [],
        dateLine: '',
        subject: '',
        paragraphs: [],
        attachmentsHeading: '',
        attachments: [],
      },
      arzt: {
        ...base.arzt,
        senderLines: [],
        addresseeLines: [],
        dateLine: '',
        subject: '',
        paragraphs: [],
        attachmentsHeading: '',
        attachments: [],
      },
      exportBundle: {
        ...base.exportBundle,
        part3: {
          ...base.exportBundle.part3,
          senderLines: [],
          addresseeLines: [],
          dateLine: '',
          subject: '',
          paragraphs: [],
        },
      },
      sourcesHeading: '',
      sources: [],
      postExportChecklist: {
        title: 'Checklist',
        intro: 'Intro',
        documentsHeading: 'Docs',
        documentsItems: [],
        signaturesHeading: 'Signatures',
        signaturesItems: [],
        physicianSupportHeading: 'Physician',
        physicianSupportItems: [],
        attachmentsHeading: 'Attachments',
        attachmentsItems: [],
        attachmentsChecklistItems: ['Attachments fallback'],
        attachmentsFallbackItem: 'Attachments fallback',
        shippingHeading: 'Shipping',
        shippingItems: [],
        note: 'Note',
      },
    };

    const spy = vi
      .spyOn(offlabelDocumentModelModule, 'buildOffLabelAntragDocumentModel')
      .mockReturnValue(mockedModel);

    const pdfModel = buildOfflabelAntragPdfDocumentModel({
      formData: {},
      locale: 'en',
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(pdfModel.title).toBe('Off-label application (parts 1-3)');
    expect(pdfModel.sections).toHaveLength(5);
    expect(pdfModel.sections[0].blocks).toEqual([]);
    expect(pdfModel.sections[1].blocks).toEqual([]);
    expect(pdfModel.sections[2].blocks).toEqual([]);
    expect(pdfModel.sections[3].blocks).toEqual([]);
    expect(pdfModel.sections[4].id).toBe('checklist');
    expect(pdfModel.sections[4].blocks.length).toBeGreaterThan(0);

    spy.mockRestore();
  });

  it('renders attachment blocks when export model provides attachments', () => {
    const base = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const mockedModel = {
      ...base,
      kk: {
        ...base.kk,
        attachmentsHeading: 'Anlagen',
        attachments: ['Anlage A'],
      },
      arzt: {
        ...base.arzt,
        attachmentsHeading: 'Anhänge',
        attachments: ['Anlage B'],
      },
      postExportChecklist: {
        ...base.postExportChecklist,
        attachmentsItems: ['Beleg 1'],
      },
    };

    const spy = vi
      .spyOn(offlabelDocumentModelModule, 'buildOffLabelAntragDocumentModel')
      .mockReturnValue(mockedModel);

    const pdfModel = buildOfflabelAntragPdfDocumentModel({
      formData: {},
      locale: 'de',
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(pdfModel.sections[0].blocks).toContainEqual({
      type: 'paragraph',
      text: 'Anlagen',
    });
    expect(pdfModel.sections[0].blocks).toContainEqual({
      type: 'bullets',
      items: ['Anlage A'],
    });

    const checklistBullets = pdfModel.sections[4].blocks.find(
      (block) =>
        block.type === 'bullets' &&
        block.items.some((item) => item === '☐ Beleg 1'),
    );
    expect(checklistBullets).toBeDefined();

    spy.mockRestore();
  });
});
