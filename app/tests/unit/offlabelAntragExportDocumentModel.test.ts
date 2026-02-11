import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildOffLabelAntragDocumentModel } from '../../src/formpacks/offlabel-antrag/export/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');
const LSG_LABEL = 'LSG Niedersachsen-Bremen';

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
    expect(model.part3.title).toContain('Teil 3');
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
    expect(model.sources[2]).toContain(LSG_LABEL);
    expect(model.kk.attachments).toContain(
      'Bewertung: Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
    );
    expect(
      model.kk.attachments.some((attachment) =>
        attachment.includes('Rechtsprechung: LSG Niedersachsen-Bremen'),
      ),
    ).toBe(false);
  });

  it('always includes the mandatory source and attachment entries', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
        attachmentsFreeText: 'Labor',
      },
      'en',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.arzt).toBeDefined();
    expect(model.part3).toBeDefined();
    expect(model.sources).toHaveLength(3);
    expect(model.sources[0]).toContain('Medical Service');
    expect(model.sources[2]).toContain(LSG_LABEL);
    expect(model.kk.attachments[0]).toContain(
      'Expert Group Long COVID Off-Label-Use at BfArM',
    );
    expect(
      model.kk.attachments.some((attachment) =>
        attachment.includes('Case law'),
      ),
    ).toBe(false);
    expect(model.kk.attachments).toContain('Labor');
  });

  it('always includes section 2(1a) paragraph and case-law source', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'agomelatin',
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
    expect(model.sources[2]).toContain(LSG_LABEL);
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
    expect(
      model.kk.attachments.some((attachment) =>
        attachment.includes('siehe Teil 3'),
      ),
    ).toBe(false);
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
