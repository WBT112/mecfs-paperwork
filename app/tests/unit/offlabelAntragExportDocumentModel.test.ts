import { describe, expect, it, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildOffLabelAntragDocumentModel } from '../../src/formpacks/offlabel-antrag/export/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');
const TEST_DOCTOR_NAME = 'Dr. Hausarzt';
const TEST_DOCTOR_PRACTICE = 'Praxis Nord';
const TEST_INSURER_NAME = 'Musterkasse';
const TEST_INSURER_DEPARTMENT = 'Leistungsabteilung';

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

    expect(model.sources).toHaveLength(2);
    expect(model.sources[0]).toContain('Bewertung Ivabradin');
    expect(model.kk.attachments).toEqual([]);
    expect(model.kk.attachmentsHeading).toBe('');
  });

  it('projects selected indication into DOCX paragraphs for multi-indication medications', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'vortioxetine',
          selectedIndicationKey: 'vortioxetine.long_post_covid_depressive',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const part1 = model.kk.paragraphs.join('\n');
    const part3 = model.part3.paragraphs.join('\n');

    expect(part1).toContain(
      'zur Behandlung von Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part1).toContain(
      'Punkt 2: Die Diagnose depressive Symptome im Rahmen von Long/Post-COVID ist gesichert',
    );
    expect(part1).toContain(
      'Indikation: Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part3).toContain(
      'Diagnose: Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part1).not.toContain('und/oder');
  });

  it('inserts blank DOCX paragraphs between part 1 points for readability', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.paragraphs).toContain('');
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
    expect(part1).toContain(
      'Punkt 7: Ich beantrage eine Genehmigung nach § 2 Abs. 1a SGB V.',
    );
    expect(part1).not.toContain(
      'Punkt 7: Ich beantrage hilfsweise eine Genehmigung nach § 2 Abs. 1a SGB V.',
    );

    expect(model.sources).toHaveLength(1);
    expect(model.sources[0]).toContain('LSG Niedersachsen-Bremen');
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
      'Punkt 2: Die Diagnose ist gesichert.',
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
          name: TEST_DOCTOR_NAME,
          practice: TEST_DOCTOR_PRACTICE,
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

  it('omits signature blocks in part 1', () => {
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

    expect(model.kk.signatureBlocks).toEqual([]);
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
    expect(model.kk.attachments).toEqual([
      'Arztbrief vom 2026-01-10',
      'Befundbericht',
      'Laborwerte',
    ]);
    expect(model.kk.attachmentsHeading).toBe('Anlagen');
  });

  it('keeps practice address only in header and uses the updated part-2 subject', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        doctor: {
          name: TEST_DOCTOR_NAME,
          practice: TEST_DOCTOR_PRACTICE,
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

    const part2Text = model.arzt.paragraphs.join('\n');

    expect(model.arzt.subject).toBe(
      'Begleitschreiben zum Off-Label-Antrag - Bitte um Unterstützung',
    );
    expect(part2Text).not.toContain('Adressat:');
    expect(part2Text).not.toContain(TEST_DOCTOR_PRACTICE);
    expect(part2Text).not.toContain(TEST_DOCTOR_NAME);
    expect(part2Text).not.toContain('Testweg 1');
    expect(part2Text).not.toContain('12345 Berlin');
  });

  it('uses insurer addressee/header fields and the updated subject in part 3', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        doctor: {
          name: TEST_DOCTOR_NAME,
          practice: TEST_DOCTOR_PRACTICE,
          streetAndNumber: 'Praxisstraße 2',
          postalCode: '12345',
          city: 'Musterstadt',
        },
        insurer: {
          name: TEST_INSURER_NAME,
          department: TEST_INSURER_DEPARTMENT,
          streetAndNumber: 'Kassenweg 3',
          postalCode: '54321',
          city: 'Kassel',
        },
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.part3.senderLines).toEqual([
      TEST_DOCTOR_PRACTICE,
      TEST_DOCTOR_NAME,
      'Praxisstraße 2',
      '12345 Musterstadt',
    ]);
    expect(model.part3.addresseeLines).toEqual([
      TEST_INSURER_NAME,
      TEST_INSURER_DEPARTMENT,
      'Kassenweg 3',
      '54321 Kassel',
    ]);
    expect(model.part3.subject).toBe(
      'Ärztliche Stellungnahme / Befundbericht zum Offlabel-User',
    );
    expect(model.part3.title).toBe('');
  });

  it('exposes a complete exportBundle with all three parts', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.exportBundle.part1).toBeDefined();
    expect(model.exportBundle.part2).toBeDefined();
    expect(model.exportBundle.part3).toBeDefined();
    expect(model.exportBundle.part2.attachments[0]).toBe(
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
    );
    expect(model.exportBundle.part1.signatureBlocks).toEqual([]);
  });

  it('keeps exportBundle sections aligned with projected kk/arzt/part3 sections', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'agomelatin',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.exportBundle.part1).toEqual(model.kk);
    expect(model.exportBundle.part2).toEqual(model.arzt);
    expect(model.exportBundle.part3).toEqual(model.part3);
  });
});
