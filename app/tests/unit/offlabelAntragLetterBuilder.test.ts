// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import i18n from '../../src/i18n';
import {
  buildOffLabelAntragDocumentModel,
  parseOfflabelAttachments,
} from '../../src/formpacks/offlabel-antrag/export/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');
const EVIDENCE_SUFFICIENT_TEXT =
  'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben.';

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
    expect(bundle.part1.signatureBlocks).toEqual([]);
    expect(bundle.part1.subject).toContain('BITTE AUSWÄHLEN');
  });

  it('references the reimbursement request in part 2 and omits part 3 title', () => {
    const bundle = buildOffLabelAntragDocumentModel({}, 'de', {
      exportedAt: FIXED_EXPORTED_AT,
    }).exportBundle;

    expect(
      bundle.part2.paragraphs.some((p) =>
        p.includes('Ich bereite mit Hilfe einen Antrag auf Kostenübernahme'),
      ),
    ).toBe(true);
    expect(bundle.part2.attachments).toEqual([]);
    expect(bundle.part2.attachmentsHeading).toBe('');
    expect(bundle.part3.title).toBe('');
  });

  it('keeps med-specific expert source and omits auto-attachments in part 1', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'vortioxetine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );
    const bundle = model.exportBundle;

    expect(bundle.part1.paragraphs.join(' | ')).toContain(
      EVIDENCE_SUFFICIENT_TEXT,
    );
    expect(model.sources[0]).toContain(
      'zur Anwendung von Vortioxetin bei kognitiven Beeinträchtigungen und/oder depressiven Symptomen',
    );
    expect(bundle.part1.attachments).toEqual([]);
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
          otherEvidenceReference: 'Musterstudie 2024, doi:10.1000/example',
          standardOfCareTriedFreeText: 'Kompressionstherapie',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).exportBundle;

    expect(bundle.part1.paragraphs.join(' | ')).toContain(
      'Ich beantrage Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.',
    );
    expect(bundle.part1.paragraphs.join(' | ')).toContain(
      'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild',
    );
    expect(bundle.part1.paragraphs.join(' | ')).toContain(
      'wissenschaftliche Erkenntnisse: Musterstudie 2024, doi:10.1000/example',
    );
    expect(bundle.part1.paragraphs.join(' | ')).not.toContain(
      EVIDENCE_SUFFICIENT_TEXT,
    );
    expect(bundle.part1.attachments).toEqual([]);
  });

  it('uses German defaults for fallback values independent of requested locale', () => {
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

    expect(bundle.part1.senderLines[0]).toBe('Max Mustermann');
    expect(bundle.part1.addresseeLines[0]).toBe('AOK Minus');
    expect(bundle.part1.subject).toContain('BITTE AUSWÄHLEN');
  });

  it('keeps core export text German while checklist stays English for locale en', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'en',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.subject).toContain('Antrag auf Kostenübernahme');
    expect(model.arzt.subject).toContain(
      'Begleitschreiben zum Off-Label-Antrag',
    );
    expect(model.sourcesHeading).toBe('Quellen');

    expect(model.postExportChecklist.title).toBe(
      'Checklist - Next steps after export',
    );
    expect(model.postExportChecklist.documentsHeading).toBe(
      '1) Review documents',
    );
    expect(model.postExportChecklist.note).toContain(
      'Processing deadlines may vary',
    );
  });

  it('uses i18n runtime language for checklist when requested locale is not en', () => {
    const i18nState = i18n as unknown as { language?: string };
    const previousLanguage = i18nState.language;
    i18nState.language = 'en';

    try {
      const model = buildOffLabelAntragDocumentModel(
        {
          request: {
            drug: 'ivabradine',
          },
        },
        'de',
        { exportedAt: FIXED_EXPORTED_AT },
      );

      expect(model.kk.subject).toContain('Antrag auf Kostenübernahme');
      expect(model.sourcesHeading).toBe('Quellen');
      expect(model.postExportChecklist.title).toBe(
        'Checklist - Next steps after export',
      );
    } finally {
      i18nState.language = previousLanguage;
    }
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
    expect(letter.signatureBlocks).toEqual([]);
    expect(
      letter.paragraphs.some((p) => p.includes(EVIDENCE_SUFFICIENT_TEXT)),
    ).toBe(true);
  });

  it('exposes part 2 doctor letter via document model', () => {
    const letter = buildOffLabelAntragDocumentModel(
      {
        patient: { firstName: 'Mara', lastName: 'Example' },
        doctor: { name: 'Dr. Muster' },
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    ).arzt;

    expect(letter.subject).toContain('Begleitschreiben');
    expect(
      letter.paragraphs.some((p) =>
        p.includes('Ich bereite mit Hilfe einen Antrag auf Kostenübernahme'),
      ),
    ).toBe(true);
    expect(
      letter.paragraphs.some((p) =>
        p.includes('Vielen Dank für Ihre Unterstützung.'),
      ),
    ).toBe(true);
    expect(
      letter.paragraphs.some((p) =>
        p.includes('Haftungsausschluss (vom Patienten zu unterzeichnen)'),
      ),
    ).toBe(false);
    expect(letter.liabilityHeading).toBe(
      'Aufklärung und Einwilligung zum Off-Label-Use: Ivabradin',
    );
    expect(letter.liabilityParagraphs?.[0]).toContain('Patient*in:');
    expect(letter.paragraphs).toContain('Mit freundlichen Grüßen');
    expect(letter.paragraphs).toContain('Mara Example');
    expect(letter.attachments).toEqual([]);
    expect(letter.attachmentsHeading).toBe('');
  });
});
