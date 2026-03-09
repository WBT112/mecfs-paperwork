// @vitest-environment node
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
const TEST_DOCTOR_NAME = 'Dr. Hausarzt';
const TEST_DOCTOR_PRACTICE = 'Praxis Nord';
const TEST_INSURER_NAME = 'Musterkasse';
const TEST_INSURER_DEPARTMENT = 'Leistungsabteilung';
const PART2_LIABILITY_HEADING_IVABRADIN =
  'Aufklärung und Einwilligung zum Off-Label-Use: Ivabradin';
const DIAGNOSIS_SECURED_NO_TEXT =
  'Die zugrunde liegende Erkrankung ist diagnostisch gesichert und ärztlich dokumentiert.';
const DIRECT_SECTION_2A_REQUEST_TEXT =
  'Ich beantrage Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.';
const HILFSWEISE_SECTION_2A_REQUEST_TEXT =
  'Hilfsweise beantrage ich Leistungen nach § 2 Abs. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung.';
const IVABRADINE_EXPERT_SOURCE_LABEL =
  'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Ivabradin';
const CASE_LAW_SOURCE_LABEL = 'LSG Niedersachsen-Bremen';
const EXPECTED_PARSED_ATTACHMENTS = [
  'Arztbrief vom 2026-01-10',
  'Befundbericht',
  'Laborwerte',
];
const buildPart2Intro = (drug: string): string =>
  `Ich bereite mit Hilfe einen Antrag auf Kostenübernahme bei meiner Krankenkasse für einen Off-Label-Therapieversuch mit ${drug} vor und bitte Sie um Ihre ärztliche Unterstützung bei der medizinischen Einordnung und Begleitung, insbesondere durch:`;

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
  it('parses line-based attachment input with mixed bullet prefixes', () => {
    expect(
      parseOfflabelAttachments(
        '- Arztbrief\n* Befundbericht\n• Laborwerte\n\n',
      ),
    ).toEqual(['Arztbrief', 'Befundbericht', 'Laborwerte']);
  });

  it('uses preview-canonical standard path with evidence text and without §2-only wording', () => {
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

    expect(part1).toContain(
      'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben.',
    );
    expect(part1).not.toContain(
      'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild',
    );
    expect(part1).not.toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1).not.toMatch(/Punkt \d+:/);
    expect(part1).toContain(IVABRADINE_EXPERT_SOURCE_LABEL);

    expect(model.sources).toHaveLength(1);
    expect(model.sources[0]).toContain(IVABRADINE_EXPERT_SOURCE_LABEL);
    expect(model.sources.join('\n')).not.toContain(CASE_LAW_SOURCE_LABEL);
    expect(model.kk.attachments).toEqual([]);
    expect(model.kk.attachmentsHeading).toBe('');
  });

  it('includes the LSG source for standard medication when fallback §2 is enabled', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
          applySection2Abs1a: true,
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.sources).toHaveLength(2);
    expect(model.sources[0]).toContain(IVABRADINE_EXPERT_SOURCE_LABEL);
    expect(model.sources[1]).toContain(CASE_LAW_SOURCE_LABEL);
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
    const part2 = model.arzt.paragraphs.join('\n');
    const part3 = model.part3.paragraphs.join('\n');

    expect(part1).toContain(
      'zur Behandlung von Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part1).toContain(
      'Die Diagnose Long/Post-COVID ist gesichert (siehe Befunde). Depressive Symptome sind dokumentiert.',
    );
    expect(part1).toContain(
      'Indikation: Long/Post-COVID mit depressiven Symptomen',
    );
    expect(
      model.kk.paragraphs.some(
        (paragraph) =>
          paragraph === 'Indikation: Long/Post-COVID mit depressiven Symptomen',
      ),
    ).toBe(true);
    expect(part3).toContain(
      'Diagnose: Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part2).toContain(buildPart2Intro('Vortioxetin'));
    expect(part3).toContain(
      'zur Behandlung der Indikation Long/Post-COVID mit depressiven Symptomen',
    );
    expect(part2).not.toContain('und/oder');
    expect(part3).not.toContain('und/oder');
  });

  it('inserts blank DOCX paragraphs between blocks across all document parts for readability', () => {
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
    expect(model.arzt.paragraphs).toContain('');
    expect(model.part3.paragraphs).toContain('');
  });

  it('keeps one blank line before and after list blocks in exported paragraphs', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'agomelatin',
          selectedIndicationKey: 'agomelatin.long_post_covid_fatigue',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const firstListIndex = model.kk.paragraphs.findIndex((paragraph) =>
      /^(Indikation|Behandlungsziel|Dosierung\/Dauer|Überwachung\/Abbruch):/.test(
        paragraph,
      ),
    );
    expect(firstListIndex).toBeGreaterThan(0);
    expect(model.kk.paragraphs[firstListIndex - 1]).toBe('');

    const lastListIndex = model.kk.paragraphs.findLastIndex((paragraph) =>
      /^(Indikation|Behandlungsziel|Dosierung\/Dauer|Überwachung\/Abbruch):/.test(
        paragraph,
      ),
    );
    expect(lastListIndex).toBeGreaterThan(firstListIndex);
    expect(model.kk.paragraphs[lastListIndex + 1]).toBe('');
  });

  it('uses preview-canonical notstand path for other', () => {
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
          otherEvidenceReference: 'Musterstudie 2024, doi:10.1000/example',
          standardOfCareTriedFreeText: 'Kompressionstherapie',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const part1 = model.kk.paragraphs.join('\n');

    expect(part1).toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1).not.toContain(HILFSWEISE_SECTION_2A_REQUEST_TEXT);
    expect(part1).toContain(
      'Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild',
    );
    expect(part1).toContain(
      'wissenschaftliche Erkenntnisse: Musterstudie 2024, doi:10.1000/example',
    );
    expect(part1).not.toContain(
      'Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen und damit eine zuverlässige, wissenschaftlich überprüfbare Aussage zum Nutzen-Risiko-Profil erlauben.',
    );
    expect(part1).not.toMatch(/Punkt \d+:/);

    expect(model.sources).toHaveLength(1);
    expect(model.sources[0]).toContain(CASE_LAW_SOURCE_LABEL);
    expect(model.kk.attachments).toEqual([]);
  });

  it('ignores stale hidden switches for other medication in exported paragraphs', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'other',
          otherDrugName: 'Midodrin',
          otherIndication: 'Orthostatische Intoleranz',
          applySection2Abs1a: true,
          indicationFullyMetOrDoctorConfirms: 'no',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const part1 = model.kk.paragraphs.join('\n');
    const part2 = model.arzt.paragraphs.join('\n');
    const part3 = model.part3.paragraphs.join('\n');

    expect(part1).toContain(DIRECT_SECTION_2A_REQUEST_TEXT);
    expect(part1).not.toContain(
      'Hilfsweise stelle ich – für den Fall, dass die Voraussetzungen des regulären Off-Label-Use nicht als erfüllt angesehen werden – zugleich Antrag auf Kostenübernahme gemäß § 2 Abs. 1a SGB V.',
    );
    expect(part1).not.toContain(HILFSWEISE_SECTION_2A_REQUEST_TEXT);

    expect(part2).toContain(buildPart2Intro('Midodrin'));
    expect(part2).not.toContain('Die klinische Symptomatik ist mit');

    expect(part3).toContain('Diagnose: Orthostatische Intoleranz');
    expect(part3).toContain(
      'zur Behandlung der Indikation Orthostatische Intoleranz',
    );
    expect(part3).not.toContain(
      'Die klinische Symptomatik ist mit Orthostatische Intoleranz vergleichbar;',
    );
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

    expect(model.kk.paragraphs.join('\n')).toContain(DIAGNOSIS_SECURED_NO_TEXT);
    expect(model.kk.paragraphs.join('\n')).toContain(
      'zur symptomorientierten Behandlung bei einer klinischen Symptomatik',
    );
    expect(model.kk.paragraphs.join('\n')).not.toContain(
      'zur Behandlung von postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(model.arzt.paragraphs.join('\n')).toContain(
      buildPart2Intro('Ivabradin'),
    );
    expect(model.arzt.paragraphs.join('\n')).not.toContain(
      'mit der Indikation postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(model.arzt.paragraphs.join('\n')).not.toContain(
      'Die klinische Symptomatik ist mit postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit vergleichbar.',
    );
    expect(model.part3.paragraphs.join('\n')).toContain(
      'Die klinische Symptomatik ist mit postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit vergleichbar;',
    );
    expect(model.part3.paragraphs.join('\n')).toContain(
      'zur symptomorientierten Behandlung der vorliegenden klinischen Symptomatik medizinisch nachvollziehbar',
    );
    expect(model.part3.paragraphs.join('\n')).not.toContain(
      'zur Behandlung der Indikation postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(model.part3.paragraphs.join('\n')).not.toContain(
      'Diagnose: postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(model.kk.paragraphs.join('\n')).not.toContain(
      'Klinische Symptomatik (vergleichbar mit postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit)',
    );
    expect(model.kk.paragraphs.join('\n')).not.toContain(
      'Indikation: postinfektiöses PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    );
    expect(model.part3.paragraphs.join('\n')).not.toContain(
      'Klinische Symptomatik (vergleichbar mit postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit)',
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

  it('uses date-only line in part 3 without city prefix', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        patient: {
          city: 'Hamburg',
        },
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const expectedDateOnly = new Intl.DateTimeFormat('de-DE').format(
      FIXED_EXPORTED_AT,
    );
    expect(model.part3.dateLine).toBe(expectedDateOnly);
    expect(model.kk.dateLine).toBe(expectedDateOnly);
    expect(model.arzt.dateLine).toBe(expectedDateOnly);
    expect(model.part3.dateLine).not.toContain('Hamburg');
    expect(model.kk.dateLine).not.toContain('Hamburg');
    expect(model.arzt.dateLine).not.toContain('Hamburg');
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

    expect(model.attachments.items).toEqual(EXPECTED_PARSED_ATTACHMENTS);
    expect(model.kk.attachments).toEqual(EXPECTED_PARSED_ATTACHMENTS);
    expect(model.kk.attachmentsHeading).toBe('Anlagen');
    expect(model.postExportChecklist.attachmentsItems).toEqual(
      EXPECTED_PARSED_ATTACHMENTS,
    );
  });

  it('uses checklist fallback text when no attachments are provided', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        request: {
          drug: 'ivabradine',
        },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.postExportChecklist.attachmentsItems).toEqual([]);
    expect(model.postExportChecklist.attachmentsFallbackItem).toContain(
      'Anlagenliste geprüft und ggf. ergänzt',
    );
  });

  it('applies formal closing spacing before signature and attachments', () => {
    const model = buildOffLabelAntragDocumentModel(
      {
        patient: {
          firstName: 'Mara',
          lastName: 'Example',
        },
        request: {
          drug: 'ivabradine',
        },
        attachmentsFreeText: 'Befundbericht',
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    const greetingIndex = model.kk.paragraphs.indexOf(
      'Mit freundlichen Grüßen',
    );
    const signatureIndex = model.kk.paragraphs.indexOf('Mara Example');
    expect(greetingIndex).toBeGreaterThan(0);
    expect(signatureIndex).toBe(greetingIndex + 4);
    expect(model.kk.paragraphs[greetingIndex - 1]).toBe('');
    expect(model.kk.paragraphs[signatureIndex - 1]).toBe('');
    expect(model.kk.paragraphs[signatureIndex - 2]).toBe('');
    expect(model.kk.paragraphs[signatureIndex - 3]).toBe('');
    expect(model.kk.paragraphs.at(-1)).toBe('');
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
    expect(part2Text).toContain(`Guten Tag ${TEST_DOCTOR_NAME},`);
    expect(part2Text).not.toContain('Testweg 1');
    expect(part2Text).not.toContain('12345 Berlin');
    expect(part2Text).not.toContain(PART2_LIABILITY_HEADING_IVABRADIN);
    expect(model.arzt.liabilityHeading).toBe(PART2_LIABILITY_HEADING_IVABRADIN);
    expect(model.arzt.liabilityParagraphs?.join('\n')).not.toContain(
      'Aufklärung und Einwilligung zum Off-Label-Use',
    );
    expect(model.arzt.liabilityParagraphs?.join('\n')).toContain('Patient*in:');
    expect(model.arzt.liabilityDateLine).toMatch(/\d{1,2}\.\d{1,2}\.\d{4}/);
    expect(model.arzt.liabilitySignerName).toBe('Max Mustermann');
    expect(model.arzt.attachments).toEqual([]);
    expect(model.arzt.attachmentsHeading).toBe('');
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
      'Ärztliche Stellungnahme / Befundbericht zum Off-Label-Use',
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
    expect(model.exportBundle.part2.attachments).toEqual([]);
    expect(model.exportBundle.part2.attachmentsHeading).toBe('');
    expect(model.exportBundle.part2.liabilityHeading).toBe(
      PART2_LIABILITY_HEADING_IVABRADIN,
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
