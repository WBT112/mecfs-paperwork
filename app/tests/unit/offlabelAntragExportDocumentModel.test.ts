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
    expect(model.part3).toBeDefined();
    expect(model.part3?.title).toContain('Teil 3');
    expect(
      model.arzt.paragraphs.some((paragraph) =>
        paragraph.includes('Kurzüberblick zum Vorhaben'),
      ),
    ).toBe(true);
    expect(model.arzt.attachments[0]).toBe(
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
    );
    expect(model.sources).toHaveLength(3);
    expect(model.sources[1]).toContain('Bewertung Ivabradin');
    expect(model.sources[2]).toContain('LSG Niedersachsen-Bremen');
    expect(model.hasSources).toBe('1');
    expect(model.hasPart2).toBe('1');
    expect(model.hasPart3).toBe('1');
    expect(model.kk.attachments).toContain(
      'Bewertung: Ivabradin - Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
    );
  });

  it('always keeps part 2 and allows disabling sources', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
        export: {
          includeSources: false,
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
    expect(model.kk.attachments[0]).toContain(
      'Expert Group Long COVID Off-Label Use at BfArM',
    );
    expect(model.kk.attachments).toContain('Labor');
  });

  it('adds optional case-law paragraph and source only when enabled', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'agomelatin',
        },
        export: {
          includeSources: true,
          includeCaseLaw: true,
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(
      model.kk.paragraphs.some((paragraph) =>
        paragraph.includes('§ 2 Abs. 1a'),
      ),
    ).toBe(true);
    expect(model.sources).toHaveLength(3);
    expect(model.sources[2]).toContain('LSG Niedersachsen-Bremen');
  });

  it('always includes part 3 and the part-3 attachment hint', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'vortioxetine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.part3).toBeDefined();
    expect(model.hasPart3).toBe('1');
    expect(
      model.kk.attachments.some((attachment) =>
        attachment.includes('siehe Teil 3'),
      ),
    ).toBe(true);
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

    expect(model.kk.paragraphs[3]).toContain('Bell-Score 40');
    expect(model.kk.paragraphs[3]).toContain('Pflegegrad 3');
    expect(model.kk.paragraphs[3]).toContain('hausgebunden');
    expect(model.kk.paragraphs[3]).not.toContain('GdB');
  });
});
