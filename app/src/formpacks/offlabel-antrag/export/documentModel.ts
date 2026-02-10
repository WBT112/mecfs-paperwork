import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import {
  getOfflabelAntragExportDefaults,
  type OfflabelAntragExportDefaults,
} from '../../../export/offlabelAntragDefaults';
import { isRecord } from '../../../lib/utils';

export type OffLabelSignatureBlock = {
  label: string;
  name: string;
  extraLine?: string;
};

export type OffLabelLetterSection = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  paragraphs: string[];
  attachmentsHeading: string;
  attachments: string[];
  signatureBlocks: OffLabelSignatureBlock[];
};

type OffLabelLegacyLetter = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  bodyParagraphs: string[];
  attachmentsHeading: string;
  attachmentsItems: string[];
  signatureBlocks: Array<{
    label: string;
    name: string;
    extraLines?: string[];
  }>;
};

export type OffLabelExportBundle = {
  exportedAtIso: string;
  part1: OffLabelLegacyLetter;
  part2?: OffLabelLegacyLetter;
};

export type OffLabelAntragDocumentModel = {
  patient: {
    firstName: string;
    lastName: string;
    birthDate: string;
    insuranceNumber: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  doctor: {
    name: string;
    practice: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  insurer: {
    name: string;
    department: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  request: {
    drug: string;
    indicationFreeText: string;
    symptomsFreeText: string;
    standardOfCareTriedFreeText: string;
    doctorRationaleFreeText: string;
    doctorSupport: {
      enabled: boolean;
    };
  };
  export: {
    includeDoctorCoverLetter: boolean;
    includeSources: boolean;
  };
  attachmentsFreeText: string;
  attachments: {
    items: string[];
  };
  kk: OffLabelLetterSection;
  arzt?: OffLabelLetterSection;
  hasPart2: string;
  hasSources: string;
  sourcesHeading: string;
  sources: string[];
  exportedAtIso: string;
  exportBundle: OffLabelExportBundle;
};

type BuildOptions = {
  exportedAt?: Date;
  defaults?: OfflabelAntragExportDefaults;
  includeDoctorCoverLetter?: boolean;
  includeSources?: boolean;
};

type KnownDrug = 'agomelatin' | 'ivabradine' | 'vortioxetine';

type I18nT = (key: string, options?: Record<string, unknown>) => string;

type SeverityFragmentSpec = {
  key: string;
  value: string | null;
  defaultValue: string;
  options?: Record<string, unknown>;
};

type MedicationParagraphSpec = {
  key: string;
  defaultValue: string;
  options?: (args: {
    diagnosisPots: string;
    targetSymptoms: string;
  }) => Record<string, unknown>;
};

type MedicationStatementField =
  | 'doseText'
  | 'durationText'
  | 'stopText'
  | 'monitoringText';

const DRUG_LABELS: Record<
  SupportedLocale,
  Record<KnownDrug, { name: string; substance: string }>
> = {
  de: {
    agomelatin: { name: 'Agomelatin', substance: 'Agomelatin' },
    ivabradine: { name: 'Ivabradin', substance: 'Ivabradin' },
    vortioxetine: { name: 'Vortioxetin', substance: 'Vortioxetin' },
  },
  en: {
    agomelatin: { name: 'Agomelatine', substance: 'Agomelatine' },
    ivabradine: { name: 'Ivabradine', substance: 'Ivabradine' },
    vortioxetine: { name: 'Vortioxetine', substance: 'Vortioxetine' },
  },
};

const MEDICATION_PARAGRAPH_SPECS: Record<KnownDrug, MedicationParagraphSpec[]> =
  {
    agomelatin: [
      {
        key: 'offlabel-antrag.export.medication.agomelatin.p1',
        defaultValue:
          'BfArM evaluates agomelatine in the long/post-COVID context and explicitly references fatigue in post-infectious ME/CFS.',
      },
      {
        key: 'offlabel-antrag.export.medication.agomelatin.p2',
        defaultValue:
          'The treatment goal is a meaningful improvement in {{targetSymptoms}}, especially fatigue and sleep-wake regulation. Planned use: 25 mg in the evening with an optional increase to 50 mg after medical review.',
        options: ({ targetSymptoms }) => ({ targetSymptoms }),
      },
      {
        key: 'offlabel-antrag.export.medication.agomelatin.p3',
        defaultValue:
          'Safety and monitoring include liver function checks according to product information, contraindications, and interaction checks.',
      },
    ],
    ivabradine: [
      {
        key: 'offlabel-antrag.export.medication.ivabradine.p1',
        defaultValue:
          'BfArM evaluates ivabradine for long/post-COVID associated PoTS in adults, especially when beta blockers are not tolerated or not appropriate.',
      },
      {
        key: 'offlabel-antrag.export.medication.ivabradine.p2',
        defaultValue:
          'The treatment goal is reduced orthostatic tachycardia and a meaningful improvement in {{targetSymptoms}} in {{diagnosisPots}}. Planned use: gradual titration (e.g. 2.5 mg twice daily) with clinical adjustments.',
        options: ({ targetSymptoms, diagnosisPots }) => ({
          targetSymptoms,
          diagnosisPots,
        }),
      },
      {
        key: 'offlabel-antrag.export.medication.ivabradine.p3',
        defaultValue:
          'Safety and monitoring include pulse/blood pressure, ECG where indicated, and review of contraindications and interactions.',
      },
    ],
    vortioxetine: [
      {
        key: 'offlabel-antrag.export.medication.vortioxetine.p1',
        defaultValue:
          'BfArM evaluates vortioxetine in the long/post-COVID context for cognitive impairment and/or depressive symptoms.',
      },
      {
        key: 'offlabel-antrag.export.medication.vortioxetine.p2',
        defaultValue:
          'The treatment goal is a meaningful improvement in {{targetSymptoms}}, especially cognitive impairment (brain fog) and/or depressive symptoms. Planned use: gradual dosing (e.g. 5 mg daily start) with benefit evaluation after around 12 weeks.',
        options: ({ targetSymptoms }) => ({ targetSymptoms }),
      },
      {
        key: 'offlabel-antrag.export.medication.vortioxetine.p3',
        defaultValue:
          'Safety and monitoring include adverse effects, contraindications, interactions, and close medical follow-up; local market availability should be considered.',
      },
    ],
  };

const MEDICATION_STATEMENT_KEYS: Record<
  KnownDrug,
  Record<MedicationStatementField, string>
> = {
  agomelatin: {
    doseText: 'offlabel-antrag.export.statement.medication.agomelatin.doseText',
    durationText:
      'offlabel-antrag.export.statement.medication.agomelatin.durationText',
    stopText: 'offlabel-antrag.export.statement.medication.agomelatin.stopText',
    monitoringText:
      'offlabel-antrag.export.statement.medication.agomelatin.monitoringText',
  },
  ivabradine: {
    doseText: 'offlabel-antrag.export.statement.medication.ivabradine.doseText',
    durationText:
      'offlabel-antrag.export.statement.medication.ivabradine.durationText',
    stopText: 'offlabel-antrag.export.statement.medication.ivabradine.stopText',
    monitoringText:
      'offlabel-antrag.export.statement.medication.ivabradine.monitoringText',
  },
  vortioxetine: {
    doseText:
      'offlabel-antrag.export.statement.medication.vortioxetine.doseText',
    durationText:
      'offlabel-antrag.export.statement.medication.vortioxetine.durationText',
    stopText:
      'offlabel-antrag.export.statement.medication.vortioxetine.stopText',
    monitoringText:
      'offlabel-antrag.export.statement.medication.vortioxetine.monitoringText',
  },
};

const MEDICATION_STATEMENT_DEFAULTS: Record<
  KnownDrug,
  Record<MedicationStatementField, string>
> = {
  agomelatin: {
    doseText:
      'Standard dosage 25 mg in the evening; if no symptom improvement after 4 weeks, increase to 50 mg in the evening.',
    durationText:
      'Treatment duration between 2 weeks and 3 months (stop if no improvement); continue longer only when there is clear benefit.',
    stopText:
      'Stop treatment if transaminases exceed 3x upper normal limit and/or there are clinical signs of liver injury; stop during pregnancy.',
    monitoringText:
      'Liver function tests before start and during treatment according to product information; continuous benefit-risk review.',
  },
  ivabradine: {
    doseText:
      'Initial 2.5 mg twice daily; after 2 weeks increase to 5 mg twice daily if symptoms persist and resting pulse is >= 60/min.',
    durationText: 'Treatment duration 4-12 weeks (symptom-oriented trial).',
    stopText:
      'Reduce dose or stop when resting pulse is < 50/min or bradycardia symptoms occur; stop when no pulse reduction and no clinical improvement are achieved.',
    monitoringText:
      'Monitor resting pulse and blood pressure; ECG monitoring as clinically required.',
  },
  vortioxetine: {
    doseText:
      'Initial 5 mg once daily; after 2 weeks increase to 10 mg once daily when response is insufficient; reduce back to 5 mg if not tolerated.',
    durationText: 'Treatment duration 4-12 weeks (trial).',
    stopText:
      'Stop treatment when there is no clinical improvement or severe adverse effects occur (e.g. serotonin syndrome signs).',
    monitoringText:
      'Clinical monitoring of adverse effects, tolerability and efficacy; consider interaction and serotonergic risk.',
  },
};

const getT = (locale: SupportedLocale): I18nT =>
  i18n.getFixedT(locale, 'formpack:offlabel-antrag');

const tr = (
  t: I18nT,
  key: string,
  defaultValue: string,
  options: Record<string, unknown> = {},
): string => t(key, { defaultValue, ...options });

const getRecordValue = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

const getStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getBooleanValue = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const formatBirthDate = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const ymdDashMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (ymdDashMatch) {
    return `${ymdDashMatch[3]}-${ymdDashMatch[2]}-${ymdDashMatch[1]}`;
  }

  const ymdSlashMatch = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value);
  if (ymdSlashMatch) {
    return `${ymdSlashMatch[3]}-${ymdSlashMatch[2]}-${ymdSlashMatch[1]}`;
  }

  const dmyDotMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (dmyDotMatch) {
    return `${dmyDotMatch[1]}-${dmyDotMatch[2]}-${dmyDotMatch[3]}`;
  }

  const dmyDashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (dmyDashMatch) {
    return `${dmyDashMatch[1]}-${dmyDashMatch[2]}-${dmyDashMatch[3]}`;
  }

  return value;
};

const withFallback = (
  value: string | null | undefined,
  fallback: string,
): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const withDefaultStringField = (
  record: Record<string, unknown> | null,
  field: string,
  fallback: string,
): string => withFallback(getStringValue(record?.[field]), fallback);

const resolveStringFields = <FieldName extends string>(
  record: Record<string, unknown> | null,
  defaults: Record<FieldName, string>,
  fields: readonly FieldName[],
): Record<FieldName, string> =>
  fields.reduce(
    (resolved, field) => ({
      ...resolved,
      [field]: withDefaultStringField(record, field, defaults[field]),
    }),
    {} as Record<FieldName, string>,
  );

export const parseOfflabelAttachments = (
  attachmentsFreeText: string | null | undefined,
): string[] => {
  if (!attachmentsFreeText) {
    return [];
  }

  return attachmentsFreeText
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*•]\s+/, '')
        .trim(),
    )
    .filter((line) => line.length > 0);
};

const isKnownDrug = (value: string | null): value is KnownDrug =>
  value === 'agomelatin' || value === 'ivabradine' || value === 'vortioxetine';

const buildPatientName = (patient: {
  firstName: string;
  lastName: string;
}): string => `${patient.firstName} ${patient.lastName}`.trim();

const getDateLine = (
  locale: SupportedLocale,
  city: string,
  exportedAt: Date,
): string => {
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  const formattedDate = new Intl.DateTimeFormat(localeTag).format(exportedAt);
  return `${city}, ${formattedDate}`;
};

const getNoSeveritySummary = (t: I18nT): string =>
  tr(
    t,
    'offlabel-antrag.export.defaults.noSeverity',
    'No dedicated severity values are currently documented.',
  );

const buildOptionalSeverityFragment = (
  t: I18nT,
  key: string,
  value: string | null,
  defaultValue: string,
  options: Record<string, unknown> = {},
): string | null => {
  if (!value) {
    return null;
  }
  return tr(t, key, defaultValue, options);
};

const buildSeverityFragments = (
  t: I18nT,
  specs: SeverityFragmentSpec[],
): string[] =>
  specs
    .map((spec) =>
      buildOptionalSeverityFragment(
        t,
        spec.key,
        spec.value,
        spec.defaultValue,
        spec.options,
      ),
    )
    .filter((entry): entry is string => Boolean(entry));

const getSeverityRecord = (
  formData: Record<string, unknown>,
): Record<string, unknown> | null => {
  const request = getRecordValue(formData.request);
  const requestSeverity = getRecordValue(request?.severity);
  const topLevelSeverity = getRecordValue(formData.severity);
  return requestSeverity ?? topLevelSeverity;
};

const buildSeveritySummary = (
  t: I18nT,
  formData: Record<string, unknown>,
): string => {
  const severity = getSeverityRecord(formData);
  if (!severity) {
    return getNoSeveritySummary(t);
  }

  const bellScore = getStringValue(severity.bellScore);
  const gdb = getStringValue(severity.gdb);
  const merkzeichen = gdb ? getStringValue(severity.merkzeichen) : null;
  const pflegegrad = getStringValue(severity.pflegegrad);
  const workStatus = getStringValue(severity.workStatus);
  const rawMobilityLevel = getStringValue(severity.mobilityLevel);
  const mobilityLevel =
    rawMobilityLevel === 'housebound' || rawMobilityLevel === 'bedbound'
      ? tr(
          t,
          `offlabel-antrag.severity.mobilityLevel.option.${rawMobilityLevel}`,
          rawMobilityLevel,
        )
      : rawMobilityLevel;

  const marker =
    merkzeichen && merkzeichen.length > 0 ? `, ${merkzeichen}` : '';
  const fragments = buildSeverityFragments(t, [
    {
      key: 'offlabel-antrag.export.severity.bell',
      value: bellScore,
      defaultValue: 'My functional level is Bell score {{bellScore}}.',
      options: { bellScore },
    },
    {
      key: 'offlabel-antrag.export.severity.gdb',
      value: gdb,
      defaultValue:
        'A disability degree (GdB) of {{gdb}} is documented{{marker}}.',
      options: { gdb, marker },
    },
    {
      key: 'offlabel-antrag.export.severity.pflegegrad',
      value: pflegegrad,
      defaultValue: 'A nursing care level of {{pflegegrad}} is in place.',
      options: { pflegegrad },
    },
    {
      key: 'offlabel-antrag.export.severity.workStatus',
      value: workStatus,
      defaultValue: 'My current work status is {{workStatus}}.',
      options: { workStatus },
    },
    {
      key: 'offlabel-antrag.export.severity.mobility',
      value: mobilityLevel,
      defaultValue: 'I am predominantly {{mobilityLevel}}.',
      options: { mobilityLevel },
    },
  ]);

  if (!fragments.length) {
    return getNoSeveritySummary(t);
  }

  return fragments.join(' ');
};

const buildMedicationSpecificParagraphs = (
  t: I18nT,
  drug: KnownDrug | null,
  diagnosisPots: string,
  targetSymptoms: string,
): string[] => {
  if (drug) {
    const optionsInput = { diagnosisPots, targetSymptoms };
    return MEDICATION_PARAGRAPH_SPECS[drug].map((spec) =>
      tr(
        t,
        spec.key,
        spec.defaultValue,
        spec.options ? spec.options(optionsInput) : {},
      ),
    );
  }

  return [
    tr(
      t,
      'offlabel-antrag.export.defaults.medicationSelectionHint',
      'Please select a medication from the list to include the medication-specific rationale block.',
    ),
  ];
};

const buildKkParagraphs = ({
  t,
  drugName,
  drugSubstance,
  diagnosisMain,
  severitySummary,
  triedTreatments,
  targetSymptoms,
  doctorRationale,
  medicationParagraphs,
  patientName,
}: {
  t: I18nT;
  drugName: string;
  drugSubstance: string;
  diagnosisMain: string;
  severitySummary: string;
  triedTreatments: string;
  targetSymptoms: string;
  doctorRationale: string;
  medicationParagraphs: string[];
  patientName: string;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part1.p1',
    'I hereby request cost coverage / authorization of a prescribed off-label use of {{drugName}} ({{drugSubstance}}) for symptoms related to {{diagnosisMain}}.',
    { drugName, drugSubstance, diagnosisMain },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p2',
    'The disease causes a sustained and substantial impairment in quality of life and daily functioning. {{severitySummary}} (Supporting documents are listed in the attachments.)',
    { severitySummary },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p3',
    'There is currently no generally accepted causal standard therapy for {{diagnosisMain}}; routine care is mainly symptom-oriented.',
    { diagnosisMain },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p4',
    'Based on off-label appraisal criteria (serious disease, no standard treatment alternative, indication-based evidence of benefit with acceptable risk), I kindly request a positive individual decision.',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p5',
    'Section 2(1a) SGB V should also be considered where a comparably severe disease exists and no standard benefit is available. Relevant case law has treated severe ME/CFS as a meaningful basis in this context.',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p6',
    'Previously attempted/exhausted treatment approaches (excerpt): {{triedTreatments}} Sustainable symptom control could not be achieved, or measures were not tolerated.',
    { triedTreatments },
  ),
  ...medicationParagraphs,
  tr(
    t,
    'offlabel-antrag.export.part1.p7',
    'Further target symptoms/burden: {{targetSymptoms}}',
    { targetSymptoms },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p8',
    'Medical rationale/monitoring (additional): {{doctorRationale}}',
    { doctorRationale },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p9',
    'I kindly request a timely written decision (appealable formal notice). I am available for follow-up questions or additional documents.',
  ),
  tr(t, 'offlabel-antrag.export.part1.p10', 'Sincerely,'),
  patientName,
];

const buildSeverityStatementHighlights = (
  t: I18nT,
  formData: Record<string, unknown>,
): string => {
  const severity = getSeverityRecord(formData);
  if (!severity) {
    return tr(
      t,
      'offlabel-antrag.export.statement.defaults.severityHighlights',
      'No additional severity markers documented.',
    );
  }

  const bellScore = getStringValue(severity.bellScore);
  const gdb = getStringValue(severity.gdb);
  const merkzeichen = getStringValue(severity.merkzeichen);
  const pflegegrad = getStringValue(severity.pflegegrad);
  const workStatus = getStringValue(severity.workStatus);
  const rawMobilityLevel = getStringValue(severity.mobilityLevel);
  const mobilityLevel =
    rawMobilityLevel === 'housebound' || rawMobilityLevel === 'bedbound'
      ? tr(
          t,
          `offlabel-antrag.severity.mobilityLevel.option.${rawMobilityLevel}`,
          rawMobilityLevel,
        )
      : rawMobilityLevel;
  const gdbSuffix =
    merkzeichen && merkzeichen.length > 0 ? `, ${merkzeichen}` : '';

  const highlights = buildSeverityFragments(t, [
    {
      key: 'offlabel-antrag.export.statement.severity.bell',
      value: bellScore,
      defaultValue: 'Bell score {{bellScore}}',
      options: { bellScore },
    },
    {
      key: 'offlabel-antrag.export.statement.severity.gdb',
      value: gdb,
      defaultValue: 'GdB {{gdb}}{{gdbSuffix}}',
      options: { gdb, gdbSuffix },
    },
    {
      key: 'offlabel-antrag.export.statement.severity.pflegegrad',
      value: pflegegrad,
      defaultValue: 'Care level {{pflegegrad}}',
      options: { pflegegrad },
    },
    {
      key: 'offlabel-antrag.export.statement.severity.workStatus',
      value: workStatus,
      defaultValue: 'Work status {{workStatus}}',
      options: { workStatus },
    },
    {
      key: 'offlabel-antrag.export.statement.severity.mobility',
      value: mobilityLevel,
      defaultValue: 'Predominantly {{mobilityLevel}}',
      options: { mobilityLevel },
    },
  ]);

  if (!highlights.length) {
    return tr(
      t,
      'offlabel-antrag.export.statement.defaults.severityHighlights',
      'No additional severity markers documented.',
    );
  }

  return highlights.join(', ');
};

const buildMedicationStatementTexts = (
  t: I18nT,
  drug: KnownDrug | null,
): Record<MedicationStatementField, string> => {
  if (!drug) {
    return {
      doseText: tr(
        t,
        'offlabel-antrag.export.statement.medication.generic.doseText',
        'Please define dosage in the final medical statement.',
      ),
      durationText: tr(
        t,
        'offlabel-antrag.export.statement.medication.generic.durationText',
        'Please define trial duration in the final medical statement.',
      ),
      stopText: tr(
        t,
        'offlabel-antrag.export.statement.medication.generic.stopText',
        'Please define stop criteria in the final medical statement.',
      ),
      monitoringText: tr(
        t,
        'offlabel-antrag.export.statement.medication.generic.monitoringText',
        'Please define monitoring and safety checks in the final medical statement.',
      ),
    };
  }

  return (
    Object.keys(MEDICATION_STATEMENT_KEYS[drug]) as MedicationStatementField[]
  ).reduce(
    (resolved, field) => ({
      ...resolved,
      [field]: tr(
        t,
        MEDICATION_STATEMENT_KEYS[drug][field],
        MEDICATION_STATEMENT_DEFAULTS[drug][field],
      ),
    }),
    {} as Record<MedicationStatementField, string>,
  );
};

const buildArztParagraphs = ({
  t,
  patientName,
  patientBirthDate,
  doctorName,
  diagnosisMain,
  diagnosisIcdList,
  targetSymptoms,
  severitySummary,
  severityHighlights,
  priorTreatments,
  drugName,
  drugSubstance,
  knownDrug,
  dateLine,
}: {
  t: I18nT;
  patientName: string;
  patientBirthDate: string;
  doctorName: string;
  diagnosisMain: string;
  diagnosisIcdList: string;
  targetSymptoms: string;
  severitySummary: string;
  severityHighlights: string;
  priorTreatments: string;
  drugName: string;
  drugSubstance: string;
  knownDrug: KnownDrug | null;
  dateLine: string;
}): string[] => {
  const medicationTexts = buildMedicationStatementTexts(t, knownDrug);

  return [
    tr(
      t,
      'offlabel-antrag.export.part2.p1',
      'Please find attached my insurer letter (part 1: off-label cost coverage request). I kindly ask for your support so the request is medically clear and decision-ready.',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.p2',
      'A short medical note (1-2 paragraphs) referring to part 1 would be particularly helpful:',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.supportBullets.b1',
      '- confirmed diagnoses and relevant findings',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.supportBullets.b2',
      '- leading symptoms and treatment goal',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.supportBullets.b3',
      '- prior treatment attempts and why no adequate standard option exists',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.supportBullets.b4',
      '- planned dosing, monitoring, and benefit-risk assessment',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.supportBullets.b5',
      '- where relevant, why waiting may lead to significant deterioration',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.p3',
      'I ask you to support the request from part 1 by preparing a short medical statement / findings report. Ideal content includes diagnosis, severity/functional level, prior measures, missing standard therapy, and your medical assessment of the requested off-label therapy (benefit-risk, monitoring, treatment goal). A pre-formulated draft is included below and can be adapted.',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.heading',
      'DRAFT - Medical statement supporting an off-label application (please transfer to practice letterhead)',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p1',
      'I, {{doctorName}}, confirm treatment of {{patientName}}, date of birth {{patientBirthDate}}. Diagnoses: {{diagnosisMain}} (ICD where available: {{diagnosisIcdList}}). Leading symptoms/exertion intolerance: {{targetSymptoms}}.',
      {
        doctorName,
        patientName,
        patientBirthDate,
        diagnosisMain,
        diagnosisIcdList,
        targetSymptoms,
      },
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p2',
      'The disease burden is clinically relevant: {{severitySummary}} Functional capacity is clearly reduced (e.g. {{severityHighlights}}).',
      {
        severitySummary,
        severityHighlights,
      },
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p3',
      'A causal, generally accepted standard therapy is currently not available; care is mainly symptom-oriented. Prior measures/treatments (excerpt): {{priorTreatments}}. Relevant disease burden remains despite prior measures.',
      {
        priorTreatments,
      },
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p4',
      'For symptomatic treatment, off-label therapy with {{drugName}} ({{drugSubstance}}) is requested, treatment goal: {{targetSymptoms}}. The indication rationale references BfArM expert group long-COVID off-label documentation.',
      {
        drugName,
        drugSubstance,
        targetSymptoms,
      },
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p5',
      'Dosage proposal: {{doseText}} Treatment duration/trial: {{durationText}} Stop criteria: {{stopText}} Monitoring/safety: {{monitoringText}}',
      medicationTexts,
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p6',
      'From a medical perspective there is a plausible prospect of meaningful positive impact on symptom burden. Alternative standard options are exhausted or unavailable in this individual case. Off-label prescribing is planned as a time-limited trial with defined stop criteria and monitoring.',
    ),
    tr(t, 'offlabel-antrag.export.part2.statement.p7', '{{dateLine}}', {
      dateLine,
    }),
    tr(t, 'offlabel-antrag.export.part2.statement.p8', '{{doctorName}}', {
      doctorName,
    }),
    tr(t, 'offlabel-antrag.export.part2.p4', 'Thank you for your support.'),
    tr(t, 'offlabel-antrag.export.part2.p5', 'Sincerely,'),
    patientName,
  ];
};

const getSourceItems = (t: I18nT): string[] => [
  tr(
    t,
    'offlabel-antrag.export.sources.item1',
    'MD Bund, appraisal guideline “Hinweise zum Off-Label-Use”, status 2024-06-24.',
  ),
  tr(
    t,
    'offlabel-antrag.export.sources.item2',
    'BfArM, expert group long-COVID off-label use: agomelatine assessment (status 2025-10-15).',
  ),
  tr(
    t,
    'offlabel-antrag.export.sources.item3',
    'BfArM, expert group long-COVID off-label use: ivabradine assessment (status 2025-10-15).',
  ),
  tr(
    t,
    'offlabel-antrag.export.sources.item4',
    'BfArM, expert group long-COVID off-label use: vortioxetine assessment (status 2025-10-15).',
  ),
  tr(
    t,
    'offlabel-antrag.export.sources.item5',
    'LSG Niedersachsen-Bremen, interim decision on ME/CFS and Section 2(1a) SGB V.',
  ),
];

const resolveExportFlags = (
  formData: Record<string, unknown>,
  options: BuildOptions,
) => {
  // RATIONALE: Cover letter part 2 is always generated. Legacy toggle values
  // are intentionally ignored to keep exports deterministic.
  const includeDoctorCoverLetter = true;
  const exportRecord = getRecordValue(formData.export);
  const includeSources =
    options.includeSources ??
    getBooleanValue(exportRecord?.includeSources) ??
    true;

  return { includeDoctorCoverLetter, includeSources };
};

const resolveLocalizedDrug = (
  locale: SupportedLocale,
  rawDrug: string | null,
  defaults: OfflabelAntragExportDefaults,
) => {
  const knownDrug = isKnownDrug(rawDrug) ? rawDrug : null;
  const localizedDrug = knownDrug ? DRUG_LABELS[locale][knownDrug] : null;

  return {
    knownDrug,
    drugName: localizedDrug?.name ?? defaults.request.drug,
    drugSubstance: localizedDrug?.substance ?? defaults.request.drug,
  };
};

const resolveDiagnosisMain = (
  t: I18nT,
  indicationFreeText: string,
  defaults: OfflabelAntragExportDefaults,
): string =>
  indicationFreeText === defaults.request.indicationFreeText
    ? tr(
        t,
        'offlabel-antrag.export.defaults.fallbackDiagnosisMain',
        'post-infectious ME/CFS / Long COVID',
      )
    : indicationFreeText;

const resolveDiagnosisPots = (
  t: I18nT,
  knownDrug: KnownDrug | null,
  diagnosisMain: string,
): string => {
  if (knownDrug !== 'ivabradine') {
    return diagnosisMain;
  }
  return tr(
    t,
    'offlabel-antrag.export.defaults.fallbackDiagnosisPots',
    'PoTS / orthostatic tachycardia',
  );
};

const buildKkSignatures = ({
  t,
  patientName,
}: {
  t: I18nT;
  patientName: string;
}): OffLabelSignatureBlock[] => [buildPatientSignature(t, patientName)];

const buildPostalCityLine = (postalCode: string, city: string): string =>
  `${postalCode} ${city}`;

const buildPatientSenderLines = (
  patientName: string,
  patientAddress: {
    streetAndNumber: string;
    postalCode: string;
    city: string;
  },
): string[] => [
  patientName,
  patientAddress.streetAndNumber,
  buildPostalCityLine(patientAddress.postalCode, patientAddress.city),
];

const buildAddressLines = (
  primaryLines: string[],
  address: {
    streetAndNumber: string;
    postalCode: string;
    city: string;
  },
): string[] => [
  ...primaryLines,
  address.streetAndNumber,
  buildPostalCityLine(address.postalCode, address.city),
];

const buildPatientSignature = (
  t: I18nT,
  patientName: string,
): OffLabelSignatureBlock => ({
  label: tr(t, 'offlabel-antrag.export.signatures.patientLabel', 'Patient'),
  name: patientName,
});

const buildSectionAttachments = (
  t: I18nT,
  attachmentsItems: string[],
  includeSources: boolean,
  includePart1AutoItem: boolean,
): string[] => [
  ...(includePart1AutoItem
    ? [
        tr(
          t,
          'offlabel-antrag.export.part2.attachmentsAutoItem',
          'Part 1: Insurer application (draft)',
        ),
      ]
    : []),
  ...attachmentsItems,
  ...(includeSources
    ? [
        tr(
          t,
          'offlabel-antrag.export.defaults.sourcesAttachment',
          'Source block (see sources)',
        ),
      ]
    : []),
];

const toLegacyLetter = (
  section: OffLabelLetterSection,
): OffLabelLegacyLetter => ({
  senderLines: section.senderLines,
  addresseeLines: section.addresseeLines,
  dateLine: section.dateLine,
  subject: section.subject,
  bodyParagraphs: section.paragraphs,
  attachmentsHeading: section.attachmentsHeading,
  attachmentsItems: section.attachments,
  signatureBlocks: section.signatureBlocks.map((block) => ({
    label: block.label,
    name: block.name,
    ...(block.extraLine ? { extraLines: [block.extraLine] } : {}),
  })),
});

export const buildOffLabelAntragDocumentModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  options: BuildOptions = {},
): OffLabelAntragDocumentModel => {
  const t = getT(locale);
  const defaults = options.defaults ?? getOfflabelAntragExportDefaults(locale);
  const exportedAt = options.exportedAt ?? new Date();

  const patientRecord = getRecordValue(formData.patient);
  const doctorRecord = getRecordValue(formData.doctor);
  const insurerRecord = getRecordValue(formData.insurer);
  const requestRecord = getRecordValue(formData.request);

  const { includeDoctorCoverLetter, includeSources } = resolveExportFlags(
    formData,
    options,
  );

  const rawDrug = getStringValue(requestRecord?.drug);
  const { knownDrug, drugName, drugSubstance } = resolveLocalizedDrug(
    locale,
    rawDrug,
    defaults,
  );

  const patient = {
    ...resolveStringFields(patientRecord, defaults.patient, [
      'firstName',
      'lastName',
      'insuranceNumber',
      'streetAndNumber',
      'postalCode',
      'city',
    ] as const),
    birthDate: withFallback(
      formatBirthDate(getStringValue(patientRecord?.birthDate)),
      defaults.patient.birthDate,
    ),
  };

  const doctor = resolveStringFields(doctorRecord, defaults.doctor, [
    'name',
    'practice',
    'streetAndNumber',
    'postalCode',
    'city',
  ] as const);

  const insurer = resolveStringFields(insurerRecord, defaults.insurer, [
    'name',
    'department',
    'streetAndNumber',
    'postalCode',
    'city',
  ] as const);

  const request = {
    drug: rawDrug ?? '',
    ...resolveStringFields(requestRecord, defaults.request, [
      'indicationFreeText',
      'symptomsFreeText',
      'standardOfCareTriedFreeText',
      'doctorRationaleFreeText',
    ] as const),
    doctorSupport: {
      enabled: true,
    },
  };

  const rawAttachmentsFreeText = getStringValue(formData.attachmentsFreeText);
  const attachmentsFreeText = withFallback(
    rawAttachmentsFreeText,
    defaults.attachmentsFreeText,
  );
  const attachmentsItems = parseOfflabelAttachments(rawAttachmentsFreeText);
  const sources = includeSources ? getSourceItems(t) : [];

  const patientName = buildPatientName(patient);
  const dateLine = getDateLine(locale, patient.city, exportedAt);
  const diagnosisMain = resolveDiagnosisMain(
    t,
    request.indicationFreeText,
    defaults,
  );
  const diagnosisPots = resolveDiagnosisPots(t, knownDrug, diagnosisMain);
  const severitySummary = buildSeveritySummary(t, formData);
  const severityHighlights = buildSeverityStatementHighlights(t, formData);
  const diagnosisIcdList = tr(
    t,
    'offlabel-antrag.export.statement.defaults.icdList',
    '—',
  );
  const medicationParagraphs = buildMedicationSpecificParagraphs(
    t,
    knownDrug,
    diagnosisPots,
    request.symptomsFreeText,
  );

  const kkSignatures = buildKkSignatures({
    t,
    patientName,
  });
  const kkAttachments = buildSectionAttachments(
    t,
    attachmentsItems,
    includeSources,
    false,
  );

  const attachmentsHeading = tr(
    t,
    'offlabel-antrag.export.attachmentsHeading',
    'Attachments',
  );

  const kk: OffLabelLetterSection = {
    senderLines: buildPatientSenderLines(patientName, patient),
    addresseeLines: buildAddressLines(
      [insurer.name, insurer.department],
      insurer,
    ),
    dateLine,
    subject: tr(
      t,
      'offlabel-antrag.export.part1.subject',
      'Application for cost coverage (off-label use): {{drug}}',
      { drug: drugName },
    ),
    paragraphs: buildKkParagraphs({
      t,
      drugName,
      drugSubstance,
      diagnosisMain,
      severitySummary,
      triedTreatments: request.standardOfCareTriedFreeText,
      targetSymptoms: request.symptomsFreeText,
      doctorRationale: request.doctorRationaleFreeText,
      medicationParagraphs,
      patientName,
    }),
    attachmentsHeading,
    attachments: kkAttachments,
    signatureBlocks: kkSignatures,
  };

  const arztAttachments = buildSectionAttachments(
    t,
    attachmentsItems,
    includeSources,
    true,
  );

  const arzt: OffLabelLetterSection | undefined = includeDoctorCoverLetter
    ? {
        senderLines: buildPatientSenderLines(patientName, patient),
        addresseeLines: buildAddressLines(
          [doctor.practice, doctor.name],
          doctor,
        ),
        dateLine,
        subject: tr(
          t,
          'offlabel-antrag.export.part2.subject',
          'Cover letter for off-label application (part 1) - request for support',
        ),
        paragraphs: buildArztParagraphs({
          t,
          patientName,
          patientBirthDate: patient.birthDate,
          doctorName: doctor.name,
          diagnosisMain,
          diagnosisIcdList,
          targetSymptoms: request.symptomsFreeText,
          severitySummary,
          severityHighlights,
          priorTreatments: request.standardOfCareTriedFreeText,
          drugName,
          drugSubstance,
          knownDrug,
          dateLine,
        }),
        attachmentsHeading,
        attachments: arztAttachments,
        signatureBlocks: [buildPatientSignature(t, patientName)],
      }
    : undefined;

  const exportBundle: OffLabelExportBundle = {
    exportedAtIso: exportedAt.toISOString(),
    part1: toLegacyLetter(kk),
    ...(arzt ? { part2: toLegacyLetter(arzt) } : {}),
  };

  return {
    patient,
    doctor,
    insurer,
    request,
    export: {
      includeDoctorCoverLetter,
      includeSources,
    },
    attachmentsFreeText,
    attachments: {
      items: attachmentsItems,
    },
    kk,
    ...(arzt ? { arzt } : {}),
    hasPart2: includeDoctorCoverLetter ? '1' : '',
    hasSources: includeSources ? '1' : '',
    sourcesHeading: tr(t, 'offlabel-antrag.export.sourcesHeading', 'Sources'),
    sources,
    exportedAtIso: exportedAt.toISOString(),
    exportBundle,
  };
};
