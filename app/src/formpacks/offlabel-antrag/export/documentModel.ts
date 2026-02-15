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

export type OffLabelPart3Section = {
  title: string;
  paragraphs: string[];
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

type OffLabelLegacyPart3 = {
  title: string;
  bodyParagraphs: string[];
};

export type OffLabelExportBundle = {
  exportedAtIso: string;
  part1: OffLabelLegacyLetter;
  part2: OffLabelLegacyLetter;
  part3: OffLabelLegacyPart3;
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
    standardOfCareTriedFreeText: string;
  };
  attachmentsFreeText: string;
  attachments: {
    items: string[];
  };
  kk: OffLabelLetterSection;
  arzt: OffLabelLetterSection;
  part3: OffLabelPart3Section;
  sourcesHeading: string;
  sources: string[];
  exportedAtIso: string;
  exportBundle: OffLabelExportBundle;
};

type BuildOptions = {
  exportedAt?: Date;
  defaults?: OfflabelAntragExportDefaults;
};

type KnownDrug = 'agomelatin' | 'ivabradine' | 'vortioxetine';
const EXPERT_SOURCE_KEYS = {
  agomelatin: 'offlabel-antrag.export.sources.expert.agomelatin',
  ivabradine: 'offlabel-antrag.export.sources.expert.ivabradin',
  vortioxetine: 'offlabel-antrag.export.sources.expert.vortioxetin',
} as const;

const EXPERT_ATTACHMENT_KEYS = {
  agomelatin: 'offlabel-antrag.export.attachments.autoExpert.agomelatin',
  ivabradine: 'offlabel-antrag.export.attachments.autoExpert.ivabradin',
  vortioxetine: 'offlabel-antrag.export.attachments.autoExpert.vortioxetin',
} as const;

type ExpertSourceKey =
  | 'offlabel-antrag.export.sources.expert.agomelatin'
  | 'offlabel-antrag.export.sources.expert.ivabradin'
  | 'offlabel-antrag.export.sources.expert.vortioxetin';
type ExpertAttachmentKey =
  | 'offlabel-antrag.export.attachments.autoExpert.agomelatin'
  | 'offlabel-antrag.export.attachments.autoExpert.ivabradin'
  | 'offlabel-antrag.export.attachments.autoExpert.vortioxetin';

type DrugFacts = {
  medicationName: string;
  medicationIngredient: string;
  diagnosisMain: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  expertSourceKey: ExpertSourceKey;
  expertAttachmentKey: ExpertAttachmentKey;
};

type I18nT = (key: string, options?: Record<string, unknown>) => string;

const FALLBACK_DIAGNOSIS_MAIN_KEY =
  'offlabel-antrag.export.defaults.fallbackDiagnosisMain';
const FALLBACK_DIAGNOSIS_MAIN_TEXT = 'postinfektiöses ME/CFS / Long COVID';
const FALLBACK_TARGET_SYMPTOMS =
  'relevante Symptomlast, Belastungsintoleranz und Lebensqualität';
const FALLBACK_DOSE_AND_DURATION =
  'gemäß individueller ärztlicher Entscheidung, zeitlich befristeter Therapieversuch';
const FALLBACK_MONITORING_AND_STOP =
  'engmaschige Verlaufskontrolle, Abbruch bei fehlendem Nutzen oder relevanten Nebenwirkungen';

const DRUG_FACTS_DE: Record<KnownDrug, DrugFacts> = {
  agomelatin: {
    medicationName: 'Agomelatin',
    medicationIngredient: 'Agomelatin',
    diagnosisMain:
      'postinfektiösem ME/CFS und/oder Long-/Post-COVID mit Fatigue',
    targetSymptoms:
      'Verbesserung von Fatigue und gesundheitsbezogener Lebensqualität (HRQoL)',
    doseAndDuration:
      '25 mg zur Nacht; nach 2 Wochen ggf. 50 mg. Behandlungsdauer mindestens 12 Wochen, danach Nutzen-Risiko-Prüfung',
    monitoringAndStop:
      'Leberwerte überwachen; bei Leberschädigungssymptomen sofort absetzen; Abbruch bei Transaminasen > 3x oberer Normwert',
    expertSourceKey: EXPERT_SOURCE_KEYS.agomelatin,
    expertAttachmentKey: EXPERT_ATTACHMENT_KEYS.agomelatin,
  },
  ivabradine: {
    medicationName: 'Ivabradin',
    medicationIngredient: 'Ivabradin',
    diagnosisMain:
      'postinfektiösem PoTS bei Long/Post-COVID, insbesondere bei Betablocker-Unverträglichkeit',
    targetSymptoms:
      'Senkung der Herzfrequenz und Verbesserung der gesundheitsbezogenen Lebensqualität (HRQoL)',
    doseAndDuration:
      'Start 2,5 mg morgens; Titration bis max. 2x5 mg (Standard 2x5 mg, Abenddosis ggf. weglassen)',
    monitoringAndStop:
      'Absetzen erwägen, wenn innerhalb von 3 Monaten keine klinisch relevante Reduktion der Ruhe-HF und nur eingeschränkte Symptomverbesserung erreicht wird; Abbruch bei persistierender Bradykardie (HF <50), Bradykardie-Symptomen oder schweren Nebenwirkungen',
    expertSourceKey: EXPERT_SOURCE_KEYS.ivabradine,
    expertAttachmentKey: EXPERT_ATTACHMENT_KEYS.ivabradine,
  },
  vortioxetine: {
    medicationName: 'Vortioxetin',
    medicationIngredient: 'Vortioxetin',
    diagnosisMain:
      'Long/Post-COVID mit kognitiven Beeinträchtigungen und/oder depressiven Symptomen',
    targetSymptoms:
      'Verbesserung von Kognition und/oder depressiver Symptomatik sowie der gesundheitsbezogenen Lebensqualität (HRQoL)',
    doseAndDuration:
      '5-20 mg 1x täglich; Start 5 mg, nach 2 Wochen Dosisanpassung; Fortführung bis mindestens 6 Monate nach Symptomfreiheit',
    monitoringAndStop:
      'Abbruch bei Serotonin-Syndrom, hyponatriämischer Enzephalopathie, neuroleptischem malignen Syndrom oder nicht tolerierbaren Nebenwirkungen; Hinweis: in Deutschland nicht verfügbar, Import/Verfügbarkeit prüfen',
    expertSourceKey: EXPERT_SOURCE_KEYS.vortioxetine,
    expertAttachmentKey: EXPERT_ATTACHMENT_KEYS.vortioxetine,
  },
};

const DRUG_FACTS_EN: Record<KnownDrug, DrugFacts> = {
  agomelatin: {
    medicationName: 'Agomelatine',
    medicationIngredient: 'Agomelatine',
    diagnosisMain: 'post-infectious ME/CFS and/or long/post-COVID with fatigue',
    targetSymptoms:
      'improvement of fatigue and health-related quality of life (HRQoL)',
    doseAndDuration:
      '25 mg at night; after 2 weeks increase to 50 mg if needed. Continue for at least 12 weeks and re-evaluate benefit-risk',
    monitoringAndStop:
      'monitor liver function; stop immediately with liver injury symptoms; discontinue if transaminases exceed 3x upper normal limit',
    expertSourceKey: EXPERT_SOURCE_KEYS.agomelatin,
    expertAttachmentKey: EXPERT_ATTACHMENT_KEYS.agomelatin,
  },
  ivabradine: {
    medicationName: 'Ivabradine',
    medicationIngredient: 'Ivabradine',
    diagnosisMain:
      'post-infectious PoTS in long/post-COVID, especially when beta blockers are not tolerated',
    targetSymptoms:
      'heart-rate reduction and improved health-related quality of life (HRQoL)',
    doseAndDuration:
      'start at 2.5 mg in the morning; titrate up to max. 5 mg twice daily (standard 5 mg twice daily; evening dose may be omitted)',
    monitoringAndStop:
      'consider discontinuation if no clinically relevant resting heart-rate reduction is achieved within 3 months and symptom improvement remains limited; stop with persistent bradycardia (HR <50), bradycardia symptoms, or severe adverse events',
    expertSourceKey: EXPERT_SOURCE_KEYS.ivabradine,
    expertAttachmentKey: EXPERT_ATTACHMENT_KEYS.ivabradine,
  },
  vortioxetine: {
    medicationName: 'Vortioxetine',
    medicationIngredient: 'Vortioxetine',
    diagnosisMain:
      'long/post-COVID with cognitive impairment and/or depressive symptoms',
    targetSymptoms:
      'improvement of cognition and/or depressive symptoms, plus health-related quality of life (HRQoL)',
    doseAndDuration:
      '5-20 mg once daily; start with 5 mg and adjust dose after 2 weeks; continue for at least 6 months after symptom remission',
    monitoringAndStop:
      'discontinue in serotonin syndrome, hyponatremic encephalopathy, neuroleptic malignant syndrome, or intolerable adverse events; note: not available in Germany, verify import/availability',
    expertSourceKey: EXPERT_SOURCE_KEYS.vortioxetine,
    expertAttachmentKey: EXPERT_ATTACHMENT_KEYS.vortioxetine,
  },
};

const getFactsTable = (locale: SupportedLocale) =>
  locale === 'de' ? DRUG_FACTS_DE : DRUG_FACTS_EN;

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

const ALLOWED_MERKZEICHEN_VALUES = new Set(['G', 'aG', 'H', 'B']);
const MERKZEICHEN_ORDER = ['G', 'aG', 'H', 'B'] as const;
const ALLOWED_MERKZEICHEN_COMBINATIONS = new Set([
  'G',
  'aG',
  'G|H',
  'B|G',
  'B|G|H',
  'B|aG',
  'H|aG',
  'B|H|aG',
]);

const normalizeMerkzeichenValues = (values: string[]): string[] =>
  [...new Set(values)]
    .filter((entry) => ALLOWED_MERKZEICHEN_VALUES.has(entry))
    .sort(
      (left, right) =>
        MERKZEICHEN_ORDER.indexOf(left as (typeof MERKZEICHEN_ORDER)[number]) -
        MERKZEICHEN_ORDER.indexOf(right as (typeof MERKZEICHEN_ORDER)[number]),
    );

const getMerkzeichenValues = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return ALLOWED_MERKZEICHEN_COMBINATIONS.has(trimmed) ? [trimmed] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const values = normalizeMerkzeichenValues(
    value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim()),
  );

  return ALLOWED_MERKZEICHEN_COMBINATIONS.has(values.join('|')) ? values : [];
};

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
    'Derzeit liegen keine gesonderten Schweregradangaben vor.',
  );

type SeverityFragmentSpec = {
  key: string;
  value: string | null;
  defaultValue: string;
  options?: Record<string, unknown>;
};

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
  const bellAssessment = bellScore
    ? tr(t, `offlabel-antrag.export.severity.bell.assessment.${bellScore}`, '')
    : null;
  const gdb = getStringValue(severity.gdb);
  const merkzeichen = gdb ? getMerkzeichenValues(severity.merkzeichen) : [];
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
    merkzeichen.length > 0 ? `, Merkzeichen ${merkzeichen.join(', ')}` : '';
  const fragments = buildSeverityFragments(t, [
    {
      key: 'offlabel-antrag.export.severity.bell',
      value: bellScore,
      defaultValue:
        'Mein Bell-Score liegt bei {{bellScore}}. {{bellAssessment}}',
      options: { bellScore, bellAssessment },
    },
    {
      key: 'offlabel-antrag.export.severity.gdb',
      value: gdb,
      defaultValue:
        'Es liegt ein Grad der Behinderung (GdB) von {{gdb}} vor{{marker}}.',
      options: { gdb, marker },
    },
    {
      key: 'offlabel-antrag.export.severity.pflegegrad',
      value: pflegegrad,
      defaultValue: 'Zudem besteht Pflegegrad {{pflegegrad}}.',
      options: { pflegegrad },
    },
    {
      key: 'offlabel-antrag.export.severity.workStatus',
      value: workStatus,
      defaultValue: 'Mein aktueller Arbeitsstatus ist {{workStatus}}.',
      options: { workStatus },
    },
    {
      key: 'offlabel-antrag.export.severity.mobility',
      value: mobilityLevel,
      defaultValue: 'Ich bin überwiegend {{mobilityLevel}}.',
      options: { mobilityLevel },
    },
  ]);

  if (!fragments.length) {
    return getNoSeveritySummary(t);
  }

  return fragments.join(' ');
};

const resolveDrugFacts = (
  t: I18nT,
  locale: SupportedLocale,
  knownDrug: KnownDrug | null,
  fallbackDrugName: string,
) => {
  const facts = knownDrug ? getFactsTable(locale)[knownDrug] : null;
  const medicationName = facts?.medicationName ?? fallbackDrugName;
  const medicationIngredient = facts?.medicationIngredient ?? fallbackDrugName;

  return {
    knownDrug,
    medicationName,
    medicationIngredient,
    diagnosisMain:
      facts?.diagnosisMain ??
      tr(t, FALLBACK_DIAGNOSIS_MAIN_KEY, FALLBACK_DIAGNOSIS_MAIN_TEXT),
    targetSymptoms: facts?.targetSymptoms ?? FALLBACK_TARGET_SYMPTOMS,
    doseAndDuration: facts?.doseAndDuration ?? FALLBACK_DOSE_AND_DURATION,
    monitoringAndStop: facts?.monitoringAndStop ?? FALLBACK_MONITORING_AND_STOP,
    expertSource: facts
      ? tr(
          t,
          facts.expertSourceKey,
          'Expertengruppe Long COVID Off-Label-Use beim BfArM: Bewertung {{medication}}.',
          {
            medication: facts.medicationName,
          },
        )
      : null,
    expertAttachment: facts
      ? tr(
          t,
          facts.expertAttachmentKey,
          'Bewertung: {{medication}} - Expertengruppe Long COVID Off-Label-Use beim BfArM',
          {
            medication: facts.medicationName,
          },
        )
      : null,
  };
};

const buildPatientSignature = (
  t: I18nT,
  patientName: string,
): OffLabelSignatureBlock => ({
  label: tr(t, 'offlabel-antrag.export.signatures.patientLabel', 'Patient/in'),
  name: patientName,
});

const buildKkSignatures = ({
  t,
  patientName,
}: {
  t: I18nT;
  patientName: string;
}): OffLabelSignatureBlock[] => [buildPatientSignature(t, patientName)];

const buildKkParagraphs = ({
  t,
  medicationName,
  medicationIngredient,
  diagnosisMain,
  targetSymptoms,
  doseAndDuration,
  monitoringAndStop,
  severitySummary,
}: {
  t: I18nT;
  medicationName: string;
  medicationIngredient: string;
  diagnosisMain: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  severitySummary: string;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part1.p1',
    'Hiermit beantrage ich die Kostenübernahme für die Off-Label-Verordnung des Wirkstoffs {{medicationIngredient}} zur Behandlung von {{diagnosisMain}}.',
    {
      medicationIngredient,
      diagnosisMain,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p2',
    'Die Voraussetzungen für eine Leistung im Off-Label-Use sind erfüllt: Es handelt sich um eine schwerwiegende Erkrankung, für die keine allgemein anerkannte, dem medizinischen Standard entsprechende Therapie verfügbar ist. Es besteht eine nicht ganz entfernt liegende Aussicht auf eine spürbar positive Einwirkung auf den Krankheitsverlauf bzw. die Symptomlast.',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p3',
    'Für {{diagnosisMain}} existiert derzeit keine kausale Standardtherapie. Die Versorgung erfolgt symptomorientiert und individuell.',
    { diagnosisMain },
  ),
  tr(t, 'offlabel-antrag.export.part1.p4', '{{severitySummary}}', {
    severitySummary,
  }),
  tr(
    t,
    'offlabel-antrag.export.part1.p5',
    'Ergänzend beantrage ich die Kostenübernahme auch unter dem Gesichtspunkt des § 2 Abs. 1a SGB V. Bei schwerwiegenden Verläufen und fehlenden ausreichend wirksamen Standardoptionen kann eine Einzelfallleistung in Betracht kommen, wenn eine nicht ganz entfernt liegende Aussicht auf eine spürbare positive Einwirkung auf den Krankheitsverlauf besteht. Zur Einordnung der Versorgungssituation bei ME/CFS und der Anwendung des § 2 Abs. 1a SGB V verweise ich auf den Beschluss des LSG Niedersachsen-Bremen vom 14.10.2022 (L 4 KR 373/22 B ER; Anlage/Quelle).',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p6',
    'Das beantragte Medikament: {{medicationName}} ({{medicationIngredient}}).',
    {
      medicationName,
      medicationIngredient,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p7',
    'Behandlungsziel: {{targetSymptoms}} Dosierung und Behandlungsdauer: {{doseAndDuration}} Monitoring/Abbruchkriterien: {{monitoringAndStop}}',
    {
      targetSymptoms,
      doseAndDuration,
      monitoringAndStop,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p8',
    'Eine ärztliche Stellungnahme zur medizinischen Notwendigkeit sowie zur individuellen Begründung/Verordnung ist als Vorlage beigefügt. Siehe Begleitschreiben an die behandelnde Praxis (Teil 2) und Vorlage (Teil 3).',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p9',
    'Ich bitte um eine schriftliche Entscheidung innerhalb der gesetzlichen Fristen. Für Rückfragen stehe ich zur Verfügung.',
  ),
  tr(t, 'offlabel-antrag.export.part1.p10', 'Mit freundlichen Grüßen'),
];

const buildArztParagraphs = ({
  t,
  patientName,
  doctorName,
  medicationName,
  medicationIngredient,
  targetSymptoms,
  doseAndDuration,
  monitoringAndStop,
}: {
  t: I18nT;
  patientName: string;
  doctorName: string;
  medicationName: string;
  medicationIngredient: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part2.p1',
    'Sehr geehrte/r Frau/Herr Dr. {{doctorName}},',
    { doctorName },
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p2',
    'ich bereite einen Antrag auf Kostenübernahme (Teil 1) bei meiner Krankenkasse für eine Off-Label-Verordnung vor. Ich bitte Sie um Ihre Unterstützung in Form einer kurzen ärztlichen Stellungnahme/Befundzusammenfassung (medizinische Notwendigkeit, Schweregrad, bisherige Maßnahmen, erwarteter Nutzen, Monitoring).',
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p3',
    'Als fachliche Grundlage dienen die Bewertungen der "Expertengruppe Long COVID Off-Label-Use beim BfArM" zum ausgewählten Wirkstoff (siehe Quellen/Anlagen im Dokument).',
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p4',
    'Ich würde mich freuen, wenn Sie - sofern Sie dies medizinisch vertreten können - die Verordnung vertragsärztlich ausstellen und die Stellungnahme beifügen. Eine vorformulierte Vorlage (Teil 3) ist beigefügt und kann von Ihnen angepasst werden.',
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p5',
    'Kurzüberblick zum Vorhaben: {{medicationName}} ({{medicationIngredient}}); Behandlungsziel: {{targetSymptoms}} Dosierung/Dauer: {{doseAndDuration}} Monitoring/Abbruch: {{monitoringAndStop}}',
    {
      medicationName,
      medicationIngredient,
      targetSymptoms,
      doseAndDuration,
      monitoringAndStop,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p6',
    'Vielen Dank für Ihre Unterstützung.\n\nMit freundlichen Grüßen\n{{patientName}}',
    {
      patientName,
    },
  ),
];

const buildPart3Paragraphs = ({
  t,
  patient,
  diagnosisMain,
  severitySummary,
  medicationName,
  medicationIngredient,
  targetSymptoms,
  doseAndDuration,
  monitoringAndStop,
}: {
  t: I18nT;
  patient: OffLabelAntragDocumentModel['patient'];
  diagnosisMain: string;
  severitySummary: string;
  medicationName: string;
  medicationIngredient: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part3.p1',
    'Patient: {{firstName}} {{lastName}}, geb. {{birthDate}}; Versichertennr.: {{insuranceNumber}}',
    {
      firstName: patient.firstName,
      lastName: patient.lastName,
      birthDate: patient.birthDate,
      insuranceNumber: patient.insuranceNumber,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p2',
    'Diagnose / Verdachtsdiagnose: {{diagnosisMain}}',
    { diagnosisMain },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p3',
    'Schweregrad / Funktionseinschränkung (kurz): {{severitySummary}}',
    { severitySummary },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p4',
    'Bisherige Behandlung/Versorgung: Es besteht keine kausale Standardtherapie; die Behandlung erfolgt symptomorientiert. Bisherige Maßnahmen/Medikamente (bitte ergänzen): ________________________________',
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p5',
    'Begründung der Off-Label-Verordnung: Aus ärztlicher Sicht ist der Einsatz von {{medicationIngredient}} zur Behandlung von {{diagnosisMain}} medizinisch nachvollziehbar, da eine schwerwiegende Erkrankung vorliegt, keine Standardtherapie verfügbar ist und eine spürbare positive Einwirkung auf die Symptomlast plausibel ist.',
    {
      medicationIngredient,
      diagnosisMain,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p6',
    'Therapieplan (gemäß Fachgrundlage Expertengruppe): Behandlungsziel: {{targetSymptoms}} Dosierung/Dauer: {{doseAndDuration}}',
    {
      targetSymptoms,
      doseAndDuration,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p7',
    'Monitoring/Abbruchkriterien (bitte anpassen): {{monitoringAndStop}}',
    {
      monitoringAndStop,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p8',
    'Erwarteter Nutzen / Therapieziel im Einzelfall (bitte ergänzen): ________________________________',
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p9',
    'Datum, Stempel, Unterschrift: ________________________________',
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p10',
    '{{medicationName}} ({{medicationIngredient}})',
    {
      medicationName,
      medicationIngredient,
    },
  ),
];

const getSourceItems = ({
  t,
  expertSource,
}: {
  t: I18nT;
  expertSource: string | null;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.sources.mdBund',
    'Medizinischer Dienst Bund: Begutachtungsanleitung / Begutachtungsmaßstäbe Off-Label-Use (Stand 05/2022).',
  ),
  expertSource ??
    tr(
      t,
      EXPERT_SOURCE_KEYS.ivabradine,
      'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).',
    ),
  tr(
    t,
    'offlabel-antrag.export.sources.caseLaw',
    'LSG Niedersachsen-Bremen: Beschluss vom 14.10.2022, L 4 KR 373/22 B ER (ME/CFS; § 2 Abs. 1a SGB V; fehlende Standardtherapie).',
  ),
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

  const rawDrug = getStringValue(requestRecord?.drug);
  const knownDrug = isKnownDrug(rawDrug) ? rawDrug : null;

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
    standardOfCareTriedFreeText: withDefaultStringField(
      requestRecord,
      'standardOfCareTriedFreeText',
      defaults.request.standardOfCareTriedFreeText,
    ),
  };

  const rawAttachmentsFreeText = getStringValue(formData.attachmentsFreeText);
  const attachmentsFreeText = withFallback(
    rawAttachmentsFreeText,
    defaults.attachmentsFreeText,
  );
  const attachmentsItems = parseOfflabelAttachments(rawAttachmentsFreeText);

  const facts = resolveDrugFacts(t, locale, knownDrug, defaults.request.drug);
  const patientName = buildPatientName(patient);
  const dateLine = getDateLine(locale, patient.city, exportedAt);
  const severitySummary = buildSeveritySummary(t, formData);

  const kkAttachments: string[] = [
    facts.expertAttachment ??
      tr(
        t,
        EXPERT_ATTACHMENT_KEYS.ivabradine,
        'Bewertung: Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
      ),
    ...attachmentsItems,
  ];

  const arztAttachments: string[] = [
    tr(
      t,
      'offlabel-antrag.export.part2.attachmentsAutoItem',
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
    ),
    facts.expertAttachment ??
      tr(
        t,
        EXPERT_ATTACHMENT_KEYS.ivabradine,
        'Bewertung: Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)',
      ),
    ...attachmentsItems,
  ];

  const attachmentsHeading = tr(
    t,
    'offlabel-antrag.export.attachmentsHeading',
    'Anlagen',
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
      'Antrag auf Kostenübernahme (Off-Label-Use): {{drug}}',
      { drug: facts.medicationName },
    ),
    paragraphs: [
      ...buildKkParagraphs({
        t,
        medicationName: facts.medicationName,
        medicationIngredient: facts.medicationIngredient,
        diagnosisMain: facts.diagnosisMain,
        targetSymptoms: facts.targetSymptoms,
        doseAndDuration: facts.doseAndDuration,
        monitoringAndStop: facts.monitoringAndStop,
        severitySummary,
      }),
      patientName,
    ],
    attachmentsHeading,
    attachments: kkAttachments,
    signatureBlocks: buildKkSignatures({
      t,
      patientName,
    }),
  };

  const arzt: OffLabelLetterSection = {
    senderLines: buildPatientSenderLines(patientName, patient),
    addresseeLines: buildAddressLines([doctor.practice, doctor.name], doctor),
    dateLine,
    subject: tr(
      t,
      'offlabel-antrag.export.part2.subject',
      'Begleitschreiben zum Off-Label-Antrag (Teil 1) - Bitte um Unterstützung',
    ),
    paragraphs: buildArztParagraphs({
      t,
      patientName,
      doctorName: doctor.name,
      medicationName: facts.medicationName,
      medicationIngredient: facts.medicationIngredient,
      targetSymptoms: facts.targetSymptoms,
      doseAndDuration: facts.doseAndDuration,
      monitoringAndStop: facts.monitoringAndStop,
    }),
    attachmentsHeading,
    attachments: arztAttachments,
    signatureBlocks: [],
  };

  const part3 = {
    title: tr(
      t,
      'offlabel-antrag.export.part3.title',
      'Teil 3 - Vorlage für ärztliche Stellungnahme / Befundbericht (zur Anpassung durch die Praxis)',
    ),
    paragraphs: buildPart3Paragraphs({
      t,
      patient,
      diagnosisMain: facts.diagnosisMain,
      severitySummary,
      medicationName: facts.medicationName,
      medicationIngredient: facts.medicationIngredient,
      targetSymptoms: facts.targetSymptoms,
      doseAndDuration: facts.doseAndDuration,
      monitoringAndStop: facts.monitoringAndStop,
    }),
  };

  const sources = getSourceItems({
    t,
    expertSource: facts.expertSource,
  });

  const exportBundle: OffLabelExportBundle = {
    exportedAtIso: exportedAt.toISOString(),
    part1: toLegacyLetter(kk),
    part2: toLegacyLetter(arzt),
    part3: {
      title: part3.title,
      bodyParagraphs: part3.paragraphs,
    },
  };

  return {
    patient,
    doctor,
    insurer,
    request,
    attachmentsFreeText,
    attachments: {
      items: attachmentsItems,
    },
    kk,
    arzt,
    part3,
    sourcesHeading: tr(t, 'offlabel-antrag.export.sourcesHeading', 'Quellen'),
    sources,
    exportedAtIso: exportedAt.toISOString(),
    exportBundle,
  };
};
