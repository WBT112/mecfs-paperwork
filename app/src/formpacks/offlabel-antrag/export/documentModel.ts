import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import {
  getOfflabelAntragExportDefaults,
  type OfflabelAntragExportDefaults,
} from '../../../export/offlabelAntragDefaults';
import { isRecord } from '../../../lib/utils';
import {
  MEDICATIONS,
  type MedicationProfile,
  resolveMedicationProfile,
} from '../medications';

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
    otherDrugName: string;
    otherIndication: string;
    otherTreatmentGoal: string;
    otherDose: string;
    otherDuration: string;
    otherMonitoring: string;
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
const FALLBACK_PRIOR_MEASURES_KEY =
  'offlabel-antrag.export.defaults.fallbackPriorMeasures';
const FALLBACK_PRIOR_MEASURES_DE =
  'Bisherige Maßnahmen wurden ausgeschöpft bzw. waren unzureichend oder nicht verträglich.';
const FALLBACK_PRIOR_MEASURES_EN =
  'Prior measures were exhausted, insufficient, or not tolerated.';
const DEFAULT_EXPERT_SOURCE_DE =
  MEDICATIONS.ivabradine.autoFacts?.de.expertSourceText ??
  'Bewertung Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025).';
const DEFAULT_EXPERT_SOURCE_EN =
  MEDICATIONS.ivabradine.autoFacts?.en.expertSourceText ??
  'Assessment ivabradine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15).';
const DEFAULT_EXPERT_ATTACHMENT_DE =
  MEDICATIONS.ivabradine.autoFacts?.de.expertAttachmentText ??
  'Bewertung: Ivabradin – Expertengruppe Long COVID Off-Label-Use beim BfArM (Stand 15.10.2025)';
const DEFAULT_EXPERT_ATTACHMENT_EN =
  MEDICATIONS.ivabradine.autoFacts?.en.expertAttachmentText ??
  'Assessment: Ivabradine – Expert Group Long COVID Off-Label-Use at BfArM (status 2025-10-15)';

const getT = (locale: SupportedLocale): I18nT =>
  i18n.getFixedT(locale, 'formpack:offlabel-antrag');

const tr = (
  t: I18nT,
  key: string,
  defaultValue: string,
  options: Record<string, unknown> = {},
): string => t(key, { defaultValue, ...options });

const localeDefault = (
  locale: SupportedLocale,
  de: string,
  en: string,
): string => (locale === 'en' ? en : de);

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

const buildPriorMeasuresListText = (
  enteredPriorMeasuresItems: string[],
): string | null =>
  enteredPriorMeasuresItems.length > 0
    ? enteredPriorMeasuresItems.join('; ')
    : null;

const resolveKnownMedicationProfile = (
  value: string | null,
): MedicationProfile | null => {
  const profile = resolveMedicationProfile(value);
  if (!profile || profile.isOther) {
    return null;
  }
  return profile;
};

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

const buildDoseAndDuration = (
  dose: string | null,
  duration: string | null,
): string => {
  if (dose && duration) {
    return `${dose}; ${duration}`;
  }
  return dose ?? duration ?? FALLBACK_DOSE_AND_DURATION;
};

const resolvePriorMeasuresText = (
  t: I18nT,
  locale: SupportedLocale,
  profile: MedicationProfile | null,
  requestRecord: Record<string, unknown> | null,
): string => {
  if (profile?.autoFacts) {
    const localeFacts =
      locale === 'de' ? profile.autoFacts.de : profile.autoFacts.en;
    return localeFacts.priorMeasuresDefault;
  }

  const freeText = getStringValue(requestRecord?.standardOfCareTriedFreeText);
  if (freeText) {
    return freeText;
  }

  return tr(
    t,
    FALLBACK_PRIOR_MEASURES_KEY,
    locale === 'de' ? FALLBACK_PRIOR_MEASURES_DE : FALLBACK_PRIOR_MEASURES_EN,
  );
};

const getProfileDisplayName = (
  profile: MedicationProfile,
  locale: SupportedLocale,
): string => (locale === 'de' ? profile.displayNameDe : profile.displayNameEn);

const getLocaleFacts = (
  profile: MedicationProfile | null,
  locale: SupportedLocale,
) => {
  if (!profile?.autoFacts) {
    return null;
  }

  return locale === 'de' ? profile.autoFacts.de : profile.autoFacts.en;
};

const getOtherRequestValues = (
  requestRecord: Record<string, unknown> | null,
) => ({
  otherDrugName: getStringValue(requestRecord?.otherDrugName),
  otherIndication: getStringValue(requestRecord?.otherIndication),
  otherTreatmentGoal: getStringValue(requestRecord?.otherTreatmentGoal),
  otherDose: getStringValue(requestRecord?.otherDose),
  otherDuration: getStringValue(requestRecord?.otherDuration),
  otherMonitoring: getStringValue(requestRecord?.otherMonitoring),
});

const resolveExpertTexts = (
  locale: SupportedLocale,
  profile: MedicationProfile | null,
) => {
  if (!profile?.autoFacts) {
    return { expertSource: null, expertAttachment: null };
  }

  const localeFacts = getLocaleFacts(profile, locale);
  const expertSource = localeFacts?.expertSourceText ?? null;
  const expertAttachment = localeFacts?.expertAttachmentText ?? null;

  return { expertSource, expertAttachment };
};

const resolveDrugFacts = ({
  t,
  locale,
  profile,
  requestRecord,
  fallbackDrugName,
}: {
  t: I18nT;
  locale: SupportedLocale;
  profile: MedicationProfile | null;
  requestRecord: Record<string, unknown> | null;
  fallbackDrugName: string;
}) => {
  const localeFacts = getLocaleFacts(profile, locale);
  const fallbackDiagnosis = tr(
    t,
    FALLBACK_DIAGNOSIS_MAIN_KEY,
    FALLBACK_DIAGNOSIS_MAIN_TEXT,
  );
  const {
    otherDrugName,
    otherIndication,
    otherTreatmentGoal,
    otherDose,
    otherDuration,
    otherMonitoring,
  } = getOtherRequestValues(requestRecord);
  const medicationName = profile
    ? getProfileDisplayName(profile, locale)
    : withFallback(otherDrugName, fallbackDrugName);
  const medicationIngredient = medicationName;
  const { expertSource, expertAttachment } = resolveExpertTexts(
    locale,
    profile,
  );
  const medicationSourceText =
    localeFacts?.expertSourceText ??
    expertSource ??
    (locale === 'de' ? DEFAULT_EXPERT_SOURCE_DE : DEFAULT_EXPERT_SOURCE_EN);

  return {
    medicationName,
    medicationIngredient,
    diagnosisMain:
      localeFacts?.diagnosisMain ??
      withFallback(otherIndication, fallbackDiagnosis),
    targetSymptoms:
      localeFacts?.targetSymptoms ??
      withFallback(otherTreatmentGoal, FALLBACK_TARGET_SYMPTOMS),
    doseAndDuration:
      localeFacts?.doseAndDuration ??
      buildDoseAndDuration(otherDose, otherDuration),
    monitoringAndStop:
      localeFacts?.monitoringAndStop ??
      withFallback(otherMonitoring, FALLBACK_MONITORING_AND_STOP),
    priorMeasuresText: resolvePriorMeasuresText(
      t,
      locale,
      profile,
      requestRecord,
    ),
    medicationSourceText,
    expertSource,
    expertAttachment,
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
  locale,
  medicationName,
  medicationIngredient,
  diagnosisMain,
  targetSymptoms,
  doseAndDuration,
  monitoringAndStop,
  priorMeasuresText,
  medicationSourceText,
  severitySummary,
  enteredPriorMeasuresListText,
}: {
  t: I18nT;
  locale: SupportedLocale;
  medicationName: string;
  medicationIngredient: string;
  diagnosisMain: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  priorMeasuresText: string;
  medicationSourceText: string;
  severitySummary: string;
  enteredPriorMeasuresListText: string | null;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part1.p1',
    localeDefault(
      locale,
      'Hiermit beantrage ich die Kostenübernahme für die Off-Label-Verordnung des Wirkstoffs {{medicationIngredient}} zur Behandlung von {{diagnosisMain}}.',
      'I hereby request cost coverage for off-label prescription of {{medicationIngredient}} to treat {{diagnosisMain}}.',
    ),
    {
      medicationIngredient,
      diagnosisMain,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p2',
    localeDefault(
      locale,
      'Die Voraussetzungen für eine Leistung im Off-Label-Use sind erfüllt: Es handelt sich um eine schwerwiegende Erkrankung, für die keine allgemein anerkannte, dem medizinischen Standard entsprechende Therapie verfügbar ist. Es besteht eine nicht ganz entfernt liegende Aussicht auf eine spürbar positive Einwirkung auf den Krankheitsverlauf bzw. die Symptomlast.',
      'The prerequisites for off-label coverage are met: this is a serious condition without a generally accepted standard therapy. There is a not-remote prospect of meaningful positive impact on disease course or symptom burden.',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p3',
    localeDefault(
      locale,
      'Für {{diagnosisMain}} existiert derzeit keine kausale Standardtherapie. Die Versorgung erfolgt symptomorientiert und individuell.',
      'For {{diagnosisMain}}, no causal standard therapy is currently available. Care is symptom-oriented and individualized.',
    ),
    { diagnosisMain },
  ),
  tr(t, 'offlabel-antrag.export.part1.p4', '{{severitySummary}}', {
    severitySummary,
  }),
  tr(
    t,
    'offlabel-antrag.export.part1.p5',
    localeDefault(
      locale,
      'Ergänzend beantrage ich die Kostenübernahme auch unter dem Gesichtspunkt des § 2 Abs. 1a SGB V. Bei schwerwiegenden Verläufen und fehlenden ausreichend wirksamen Standardoptionen kann eine Einzelfallleistung in Betracht kommen, wenn eine nicht ganz entfernt liegende Aussicht auf eine spürbare positive Einwirkung auf den Krankheitsverlauf besteht. Zur Einordnung der Versorgungssituation bei ME/CFS und der Anwendung des § 2 Abs. 1a SGB V verweise ich auf den Beschluss des LSG Niedersachsen-Bremen vom 14.10.2022 (L 4 KR 373/22 B ER; Anlage/Quelle).',
      'In addition, I request cost coverage with explicit consideration of Section 2(1a) SGB V. In severe courses with no sufficiently effective standard options, individual coverage may be considered when there is a not-remote prospect of a meaningful positive impact on disease course. For classification of the ME/CFS care situation and application of Section 2(1a) SGB V, I refer to the decision of LSG Niedersachsen-Bremen dated 2022-10-14 (L 4 KR 373/22 B ER; attachment/source).',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p6',
    localeDefault(
      locale,
      'Das beantragte Medikament: {{medicationName}} ({{medicationIngredient}}).',
      'Requested medication: {{medicationName}} ({{medicationIngredient}}).',
    ),
    {
      medicationName,
      medicationIngredient,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p7',
    localeDefault(
      locale,
      'Behandlungsziel: {{targetSymptoms}} Dosierung und Behandlungsdauer: {{doseAndDuration}} Monitoring/Abbruchkriterien: {{monitoringAndStop}}',
      'Treatment goal: {{targetSymptoms}} Dosing and duration: {{doseAndDuration}} Monitoring/stop criteria: {{monitoringAndStop}}',
    ),
    {
      targetSymptoms,
      doseAndDuration,
      monitoringAndStop,
    },
  ),
  tr(
    t,
    enteredPriorMeasuresListText
      ? 'offlabel-antrag.export.part1.p11.manual'
      : 'offlabel-antrag.export.part1.p11',
    enteredPriorMeasuresListText
      ? localeDefault(
          locale,
          'Zusätzlich wurden folgende Therapieversuche unternommen: {{enteredPriorMeasuresListText}}',
          'Additionally, the following treatment attempts were undertaken: {{enteredPriorMeasuresListText}}',
        )
      : localeDefault(
          locale,
          'Bisherige Maßnahmen: {{priorMeasuresText}}',
          'Prior measures: {{priorMeasuresText}}',
        ),
    enteredPriorMeasuresListText
      ? { enteredPriorMeasuresListText }
      : { priorMeasuresText },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p12',
    localeDefault(
      locale,
      'Medikamentenspezifische Quellenbasis: {{medicationSourceText}}',
      'Medication-specific source basis: {{medicationSourceText}}',
    ),
    { medicationSourceText },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p8',
    localeDefault(
      locale,
      'Eine ärztliche Stellungnahme zur medizinischen Notwendigkeit sowie zur individuellen Begründung/Verordnung ist als Vorlage beigefügt. Siehe Begleitschreiben an die behandelnde Praxis (Teil 2) und Vorlage (Teil 3).',
      'A medical statement on necessity and individualized rationale/prescribing is attached as a template. See cover letter to the treating practice (part 2) and template (part 3).',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p9',
    localeDefault(
      locale,
      'Ich bitte um eine schriftliche Entscheidung innerhalb der gesetzlichen Fristen. Für Rückfragen stehe ich zur Verfügung.',
      'I request a written decision within statutory deadlines. I am available for follow-up questions.',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p10',
    localeDefault(locale, 'Mit freundlichen Grüßen', 'Sincerely,'),
  ),
];

const buildArztParagraphs = ({
  t,
  locale,
  patientName,
  doctorName,
  medicationName,
  medicationIngredient,
  targetSymptoms,
  doseAndDuration,
  monitoringAndStop,
}: {
  t: I18nT;
  locale: SupportedLocale;
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
    localeDefault(
      locale,
      'Sehr geehrte/r Frau/Herr Dr. {{doctorName}},',
      'Dear Dr. {{doctorName}},',
    ),
    { doctorName },
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p2',
    localeDefault(
      locale,
      'ich bereite einen Antrag auf Kostenübernahme (Teil 1) bei meiner Krankenkasse für eine Off-Label-Verordnung vor. Ich bitte Sie um Ihre Unterstützung in Form einer kurzen ärztlichen Stellungnahme/Befundzusammenfassung (medizinische Notwendigkeit, Schweregrad, bisherige Maßnahmen, erwarteter Nutzen, Monitoring).',
      'I am preparing a cost-coverage request (part 1) to my insurer for an off-label prescription. I kindly ask for your support via a brief medical statement/findings summary (medical necessity, severity, prior measures, expected benefit, monitoring).',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p3',
    localeDefault(
      locale,
      'Als fachliche Grundlage dienen die Bewertungen der "Expertengruppe Long COVID Off-Label-Use beim BfArM" zum ausgewählten Wirkstoff (siehe Quellen/Anlagen im Dokument).',
      'The technical basis is the assessment of the "Expert Group Long COVID Off-Label Use at BfArM" for the selected active ingredient (see sources/attachments).',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p4',
    localeDefault(
      locale,
      'Ich würde mich freuen, wenn Sie - sofern Sie dies medizinisch vertreten können - die Verordnung vertragsärztlich ausstellen und die Stellungnahme beifügen. Eine vorformulierte Vorlage (Teil 3) ist beigefügt und kann von Ihnen angepasst werden.',
      'Important: Part 1 is my letter to the insurer and is not signed by you. Please provide a separate medical statement/findings summary as an attachment instead. A pre-formulated template (Part 3) is included and can be adapted by your practice.',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part2.p5',
    localeDefault(
      locale,
      'Kurzüberblick zum Vorhaben: {{medicationName}} ({{medicationIngredient}}); Behandlungsziel: {{targetSymptoms}} Dosierung/Dauer: {{doseAndDuration}} Monitoring/Abbruch: {{monitoringAndStop}}',
      'Summary: {{medicationName}} ({{medicationIngredient}}); treatment goal: {{targetSymptoms}} dosing/duration: {{doseAndDuration}} monitoring/stop: {{monitoringAndStop}}',
    ),
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
    localeDefault(
      locale,
      'Vielen Dank für Ihre Unterstützung.\n\nMit freundlichen Grüßen\n{{patientName}}',
      'Thank you for your support.\n\nSincerely,\n{{patientName}}',
    ),
    {
      patientName,
    },
  ),
];

const buildPart3Paragraphs = ({
  t,
  locale,
  patient,
  diagnosisMain,
  severitySummary,
  medicationName,
  medicationIngredient,
  targetSymptoms,
  doseAndDuration,
  monitoringAndStop,
  priorMeasuresText,
  medicationSourceText,
  enteredPriorMeasuresListText,
}: {
  t: I18nT;
  locale: SupportedLocale;
  patient: OffLabelAntragDocumentModel['patient'];
  diagnosisMain: string;
  severitySummary: string;
  medicationName: string;
  medicationIngredient: string;
  targetSymptoms: string;
  doseAndDuration: string;
  monitoringAndStop: string;
  priorMeasuresText: string;
  medicationSourceText: string;
  enteredPriorMeasuresListText: string | null;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part3.p1',
    localeDefault(
      locale,
      'Patient: {{firstName}} {{lastName}}, geb. {{birthDate}}; Versichertennr.: {{insuranceNumber}}',
      'Patient: {{firstName}} {{lastName}}, DOB {{birthDate}}; insurance no.: {{insuranceNumber}}',
    ),
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
    localeDefault(
      locale,
      'Diagnose / Verdachtsdiagnose: {{diagnosisMain}}',
      'Diagnosis / suspected diagnosis: {{diagnosisMain}}',
    ),
    { diagnosisMain },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p3',
    localeDefault(
      locale,
      'Schweregrad / Funktionseinschränkung (kurz): {{severitySummary}}',
      'Severity / functional impairment (short): {{severitySummary}}',
    ),
    { severitySummary },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p4',
    localeDefault(
      locale,
      'Bisherige Behandlung/Versorgung: Es besteht keine kausale Standardtherapie; die Behandlung erfolgt symptomorientiert. Bisherige Maßnahmen/Medikamente: {{priorMeasuresText}}',
      'Prior treatment/care: no causal standard therapy available; treatment is symptom-oriented. Prior measures/medication: {{priorMeasuresText}}',
    ),
    { priorMeasuresText },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p5',
    localeDefault(
      locale,
      'Begründung der Off-Label-Verordnung: Aus ärztlicher Sicht ist der Einsatz von {{medicationIngredient}} zur Behandlung von {{diagnosisMain}} medizinisch nachvollziehbar, da eine schwerwiegende Erkrankung vorliegt, keine Standardtherapie verfügbar ist und eine spürbare positive Einwirkung auf die Symptomlast plausibel ist.',
      'Rationale for off-label prescription: from a medical perspective, use of {{medicationIngredient}} for {{diagnosisMain}} is clinically plausible because the condition is severe, no standard therapy is available, and meaningful symptom improvement is plausible.',
    ),
    {
      medicationIngredient,
      diagnosisMain,
    },
  ),
  ...(enteredPriorMeasuresListText
    ? [
        tr(
          t,
          'offlabel-antrag.export.part3.p5a',
          localeDefault(
            locale,
            'Zusätzlich wurden folgende Therapieversuche unternommen: {{enteredPriorMeasuresListText}}',
            'Additionally, the following treatment attempts were undertaken: {{enteredPriorMeasuresListText}}',
          ),
          { enteredPriorMeasuresListText },
        ),
      ]
    : []),
  tr(
    t,
    'offlabel-antrag.export.part3.p6',
    localeDefault(
      locale,
      'Therapieplan (gemäß Fachgrundlage Expertengruppe): Behandlungsziel: {{targetSymptoms}} Dosierung/Dauer: {{doseAndDuration}}',
      'Treatment plan (based on Expert Group evidence): treatment goal: {{targetSymptoms}} dosing/duration: {{doseAndDuration}}',
    ),
    {
      targetSymptoms,
      doseAndDuration,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p7',
    localeDefault(
      locale,
      'Monitoring/Abbruchkriterien (bitte anpassen): {{monitoringAndStop}}',
      'Monitoring/stop criteria (please adapt): {{monitoringAndStop}}',
    ),
    {
      monitoringAndStop,
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p8',
    localeDefault(
      locale,
      'Erwarteter Nutzen / Therapieziel im Einzelfall (bitte ergänzen): ________________________________',
      'Expected benefit / individual therapy goal (please add): ________________________________',
    ),
  ),
  tr(
    t,
    'offlabel-antrag.export.part3.p9',
    localeDefault(
      locale,
      'Datum, Stempel, Unterschrift: ________________________________',
      'Date, stamp, signature: ________________________________',
    ),
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
  tr(
    t,
    'offlabel-antrag.export.part3.p11',
    localeDefault(
      locale,
      'Medikamentenspezifische Quellenbasis: {{medicationSourceText}}',
      'Medication-specific source basis: {{medicationSourceText}}',
    ),
    { medicationSourceText },
  ),
];

const getSourceItems = ({
  t,
  locale,
  expertSource,
}: {
  t: I18nT;
  locale: SupportedLocale;
  expertSource: string | null;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.sources.mdBund',
    'Medizinischer Dienst Bund: Begutachtungsanleitung / Begutachtungsmaßstäbe Off-Label-Use (Stand 05/2022).',
  ),
  expertSource ??
    (locale === 'de' ? DEFAULT_EXPERT_SOURCE_DE : DEFAULT_EXPERT_SOURCE_EN),
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
  const knownMedicationProfile = resolveKnownMedicationProfile(rawDrug);

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
    otherDrugName: withDefaultStringField(
      requestRecord,
      'otherDrugName',
      defaults.request.otherDrugName,
    ),
    otherIndication: withDefaultStringField(
      requestRecord,
      'otherIndication',
      defaults.request.otherIndication,
    ),
    otherTreatmentGoal: withDefaultStringField(
      requestRecord,
      'otherTreatmentGoal',
      defaults.request.otherTreatmentGoal,
    ),
    otherDose: withDefaultStringField(
      requestRecord,
      'otherDose',
      defaults.request.otherDose,
    ),
    otherDuration: withDefaultStringField(
      requestRecord,
      'otherDuration',
      defaults.request.otherDuration,
    ),
    otherMonitoring: withDefaultStringField(
      requestRecord,
      'otherMonitoring',
      defaults.request.otherMonitoring,
    ),
  };

  const rawAttachmentsFreeText = getStringValue(formData.attachmentsFreeText);
  const attachmentsFreeText = withFallback(
    rawAttachmentsFreeText,
    defaults.attachmentsFreeText,
  );
  const attachmentsItems = parseOfflabelAttachments(rawAttachmentsFreeText);
  const enteredPriorMeasuresItems = parseOfflabelAttachments(
    getStringValue(requestRecord?.standardOfCareTriedFreeText),
  );
  const enteredPriorMeasuresListText = buildPriorMeasuresListText(
    enteredPriorMeasuresItems,
  );

  const facts = resolveDrugFacts({
    t,
    locale,
    profile: knownMedicationProfile,
    requestRecord,
    fallbackDrugName: defaults.request.drug,
  });
  const patientName = buildPatientName(patient);
  const dateLine = getDateLine(locale, patient.city, exportedAt);
  const severitySummary = buildSeveritySummary(t, formData);

  const kkAttachments: string[] = [
    facts.expertAttachment ??
      (locale === 'de'
        ? DEFAULT_EXPERT_ATTACHMENT_DE
        : DEFAULT_EXPERT_ATTACHMENT_EN),
    ...attachmentsItems,
  ];

  const arztAttachments: string[] = [
    tr(
      t,
      'offlabel-antrag.export.part2.attachmentsAutoItem',
      localeDefault(
        locale,
        'Teil 1: Antrag an die Krankenkasse (Entwurf)',
        'Part 1: Insurer application (draft)',
      ),
    ),
    facts.expertAttachment ??
      (locale === 'de'
        ? DEFAULT_EXPERT_ATTACHMENT_DE
        : DEFAULT_EXPERT_ATTACHMENT_EN),
    ...attachmentsItems,
  ];

  const attachmentsHeading = tr(
    t,
    'offlabel-antrag.export.attachmentsHeading',
    localeDefault(locale, 'Anlagen', 'Attachments'),
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
      localeDefault(
        locale,
        'Antrag auf Kostenübernahme (Off-Label-Use): {{drug}}',
        'Application for case-by-case cost coverage (off-label use): {{drug}}',
      ),
      { drug: facts.medicationName },
    ),
    paragraphs: [
      ...buildKkParagraphs({
        t,
        locale,
        medicationName: facts.medicationName,
        medicationIngredient: facts.medicationIngredient,
        diagnosisMain: facts.diagnosisMain,
        targetSymptoms: facts.targetSymptoms,
        doseAndDuration: facts.doseAndDuration,
        monitoringAndStop: facts.monitoringAndStop,
        priorMeasuresText: facts.priorMeasuresText,
        medicationSourceText: facts.medicationSourceText,
        severitySummary,
        enteredPriorMeasuresListText,
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
      localeDefault(
        locale,
        'Begleitschreiben zum Off-Label-Antrag (Teil 1) - Bitte um Unterstützung',
        'Cover letter regarding the off-label request (part 1) - request for support',
      ),
    ),
    paragraphs: buildArztParagraphs({
      t,
      locale,
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
      localeDefault(
        locale,
        'Teil 3 - Vorlage für ärztliche Stellungnahme / Befundbericht (zur Anpassung durch die Praxis)',
        'Part 3 – Template for medical statement / findings report (to be adapted by the practice)',
      ),
    ),
    paragraphs: buildPart3Paragraphs({
      t,
      locale,
      patient,
      diagnosisMain: facts.diagnosisMain,
      severitySummary,
      medicationName: facts.medicationName,
      medicationIngredient: facts.medicationIngredient,
      targetSymptoms: facts.targetSymptoms,
      doseAndDuration: facts.doseAndDuration,
      monitoringAndStop: facts.monitoringAndStop,
      priorMeasuresText: facts.priorMeasuresText,
      medicationSourceText: facts.medicationSourceText,
      enteredPriorMeasuresListText,
    }),
  };

  const sources = getSourceItems({
    t,
    locale,
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
    sourcesHeading: tr(
      t,
      'offlabel-antrag.export.sourcesHeading',
      localeDefault(locale, 'Quellen', 'Sources'),
    ),
    sources,
    exportedAtIso: exportedAt.toISOString(),
    exportBundle,
  };
};
