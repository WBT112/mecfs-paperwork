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
    symptomCluster: string[];
    standardOfCareTriedFreeText: string;
    hasDoctorSupport: boolean;
  };
  export: {
    includeSources: boolean;
    includeSection2Abs1a: boolean;
  };
  attachmentsFreeText: string;
  attachments: {
    items: string[];
  };
  kk: OffLabelLetterSection;
  arzt: OffLabelLetterSection;
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
  includeSources?: boolean;
  includeSection2Abs1a?: boolean;
};

type KnownDrug = 'agomelatin' | 'ivabradine' | 'vortioxetine';
type SymptomClusterKey =
  | 'fatiguePem'
  | 'orthostaticIntolerance'
  | 'tachycardia'
  | 'cognitiveImpairment'
  | 'depressiveSymptoms'
  | 'sleepDisorder';
type DrugInfo = {
  label: string;
  offLabelIndication: string;
  treatmentGoal: string;
  patientGroup: string;
  dosage: string;
  duration: string;
  monitoring: string;
  notes: string;
  expertGroupSource: {
    title: string;
    url: string;
    stand: string;
  };
  defaultSymptomCluster: SymptomClusterKey[];
};

type I18nT = (key: string, options?: Record<string, unknown>) => string;

type SeverityFragmentSpec = {
  key: string;
  value: string | null;
  defaultValue: string;
  options?: Record<string, unknown>;
};

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

const EXPERT_GROUP_SOURCE_URL =
  'https://www.bfarm.de/SharedDocs/Downloads/DE/Arzneimittel/Zulassung/zulassung_node.html?nn=10932956';
const FALLBACK_DIAGNOSIS_MAIN_KEY =
  'offlabel-antrag.export.defaults.fallbackDiagnosisMain';
const FALLBACK_DIAGNOSIS_MAIN_TEXT = 'postinfektiöses ME/CFS / Long COVID';

const DRUG_INFO: Record<KnownDrug, DrugInfo> = {
  agomelatin: {
    label: 'Agomelatin',
    offLabelIndication:
      'depressive Symptomatik und/oder Schlafstörungen im Zusammenhang mit Long/Post-COVID bzw. postinfektiösem ME/CFS',
    treatmentGoal:
      'Verbesserung von Fatigue, Schlafqualität und depressiver Symptomatik',
    patientGroup:
      'Erwachsene mit anhaltender Symptomlast trotz ausgeschöpfter Standardmaßnahmen',
    dosage: '25 mg abends, bei Bedarf Steigerung auf 50 mg abends',
    duration:
      'zeitlich befristeter Therapieversuch (ca. 2 Wochen bis 3 Monate) mit Verlaufskontrolle',
    monitoring:
      'Leberwerte vor Beginn und im Verlauf, Prüfung von Kontraindikationen/Interaktionen',
    notes:
      'Abbruch bei fehlendem Nutzen oder klinisch relevanten Nebenwirkungen',
    expertGroupSource: {
      title:
        'Expertengruppe Long COVID Off-Label-Use beim BfArM: Bewertung Agomelatin',
      url: EXPERT_GROUP_SOURCE_URL,
      stand: '02.12.2025',
    },
    defaultSymptomCluster: [
      'fatiguePem',
      'sleepDisorder',
      'depressiveSymptoms',
    ],
  },
  ivabradine: {
    label: 'Ivabradin',
    offLabelIndication:
      'postinfektiöses PoTS / orthostatische Tachykardie im Zusammenhang mit Long/Post-COVID',
    treatmentGoal:
      'Reduktion der orthostatischen Tachykardie und Verbesserung der Belastbarkeit im Alltag',
    patientGroup:
      'Erwachsene mit PoTS-Symptomatik, insbesondere bei Betablocker-Unverträglichkeit oder fehlender Eignung',
    dosage:
      'Initial 2,5 mg zweimal täglich; bei anhaltender Symptomatik Steigerung bis 5 mg zweimal täglich',
    duration: 'zeitlich befristeter Therapieversuch (ca. 4 bis 12 Wochen)',
    monitoring:
      'Puls und Blutdruck (Liegen/Stehen), ggf. EKG; Kontraindikationen/Interaktionen prüfen',
    notes:
      'Betablocker-Unverträglichkeit bzw. fehlende Eignung wird in der Indikationsstellung berücksichtigt',
    expertGroupSource: {
      title:
        'Expertengruppe Long COVID Off-Label-Use beim BfArM: Bewertung Ivabradin',
      url: EXPERT_GROUP_SOURCE_URL,
      stand: '15.10.2025',
    },
    defaultSymptomCluster: [
      'orthostaticIntolerance',
      'tachycardia',
      'fatiguePem',
    ],
  },
  vortioxetine: {
    label: 'Vortioxetin',
    offLabelIndication:
      'kognitive Einschränkungen und/oder depressive Symptomatik im Zusammenhang mit Long/Post-COVID',
    treatmentGoal:
      'Verbesserung von Kognition, Konzentrationsfähigkeit und depressiver Symptomatik',
    patientGroup:
      'Erwachsene mit klinisch relevanter kognitiver und/oder depressiver Symptomlast',
    dosage:
      'Initial 5 mg täglich, nach 1-2 Wochen bei Bedarf Steigerung auf 10 mg (max. 20 mg täglich)',
    duration:
      'zeitlich befristeter Therapieversuch (ca. 4 bis 12 Wochen) mit Nutzenbewertung',
    monitoring:
      'klinische Verlaufskontrolle, Nebenwirkungen/Interaktionen und Therapieverträglichkeit prüfen',
    notes:
      'Fortführung nur bei klinisch nachvollziehbarem Nutzen und vertretbarem Nutzen-Risiko-Profil',
    expertGroupSource: {
      title:
        'Expertengruppe Long COVID Off-Label-Use beim BfArM: Bewertung Vortioxetin',
      url: EXPERT_GROUP_SOURCE_URL,
      stand: '15.10.2025',
    },
    defaultSymptomCluster: [
      'cognitiveImpairment',
      'depressiveSymptoms',
      'fatiguePem',
    ],
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

const getStringArrayValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
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

const asSymptomClusterKey = (value: string): SymptomClusterKey | null =>
  value === 'fatiguePem' ||
  value === 'orthostaticIntolerance' ||
  value === 'tachycardia' ||
  value === 'cognitiveImpairment' ||
  value === 'depressiveSymptoms' ||
  value === 'sleepDisorder'
    ? value
    : null;

const getSymptomClusters = (
  requestRecord: Record<string, unknown> | null,
  drug: KnownDrug | null,
): SymptomClusterKey[] => {
  const selected = getStringArrayValue(requestRecord?.symptomCluster)
    .map((entry) => asSymptomClusterKey(entry))
    .filter((entry): entry is SymptomClusterKey => entry !== null);

  if (selected.length > 0) {
    return selected;
  }

  if (!drug) {
    return [];
  }

  return DRUG_INFO[drug].defaultSymptomCluster;
};

const buildSymptomClusterText = (
  t: I18nT,
  symptomClusters: SymptomClusterKey[],
): string => {
  if (!symptomClusters.length) {
    return tr(
      t,
      'offlabel-antrag.export.defaults.medicationSelectionHint',
      'Bitte wählen Sie ein Medikament aus der Liste, damit ein spezifischer Begründungsblock eingefügt werden kann.',
    );
  }

  return symptomClusters
    .map((cluster) =>
      tr(
        t,
        `offlabel-antrag.request.symptomCluster.option.${cluster}`,
        cluster,
      ),
    )
    .join(', ');
};

const getDrugInfo = (knownDrug: KnownDrug | null): DrugInfo | null =>
  knownDrug ? DRUG_INFO[knownDrug] : null;

const buildKkParagraphs = ({
  t,
  drugInfo,
  drugDisplayName,
  severitySummary,
  triedTreatments,
  symptomClusterText,
  hasDoctorSupport,
  patientName,
  includeSection2Abs1a,
}: {
  t: I18nT;
  drugInfo: DrugInfo | null;
  drugDisplayName: string;
  severitySummary: string;
  triedTreatments: string;
  symptomClusterText: string;
  hasDoctorSupport: boolean;
  patientName: string;
  includeSection2Abs1a: boolean;
}): string[] => [
  tr(
    t,
    'offlabel-antrag.export.part1.p1',
    'Hiermit beantrage ich die Kostenübernahme für eine Off-Label-Verordnung von {{drug}} zur Behandlung von {{indication}}. Grundlage ist die Bewertung der Expertengruppe Long COVID Off-Label-Use beim BfArM nach § 35c Abs. 1 SGB V (siehe Anlagen).',
    {
      drug: drugInfo?.label ?? drugDisplayName,
      indication:
        drugInfo?.offLabelIndication ??
        tr(t, FALLBACK_DIAGNOSIS_MAIN_KEY, FALLBACK_DIAGNOSIS_MAIN_TEXT),
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p2',
    'Die Erkrankung führt zu einer anhaltenden, erheblichen Einschränkung der Lebensqualität und Alltagsfunktion: {{severitySummary}}. Nachweise siehe Anlagen.',
    { severitySummary },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p3',
    'Eine kausale Therapie steht derzeit nicht zur Verfügung. Die Versorgung erfolgt überwiegend symptomorientiert; etablierte Maßnahmen wurden - soweit möglich - ausgeschöpft, waren unzureichend oder nicht verträglich.',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p4',
    'Der beantragte Off-Label-Einsatz erfüllt nach summarischer Darstellung die in Rechtsprechung und Begutachtungsmaßstäben beschriebenen Voraussetzungen (u. a. schwerwiegende Erkrankung, fehlende Standardtherapie/keine ausreichende Alternative, begründete Aussicht auf Behandlungserfolg).',
  ),
  ...(includeSection2Abs1a
    ? [
        tr(
          t,
          'offlabel-antrag.export.part1.p5',
          'Ergänzend kommt - bei schwerem Verlauf und fehlenden ausreichenden Standardoptionen - eine Einzelfallleistung nach § 2 Abs. 1a SGB V in Betracht.',
        ),
      ]
    : []),
  tr(
    t,
    'offlabel-antrag.export.part1.p6',
    'Bisherige Behandlungsansätze (Auszug): {{triedTreatments}}',
    { triedTreatments },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p7',
    'Indikation (Off-Label): {{indication}}. Behandlungsziel: {{goal}}. Patientengruppe: {{patientGroup}}. Dosierung: {{dosage}}. Behandlungsdauer: {{duration}}. Monitoring/Sicherheit: {{monitoring}}.{{notes}}',
    {
      indication:
        drugInfo?.offLabelIndication ??
        tr(t, FALLBACK_DIAGNOSIS_MAIN_KEY, FALLBACK_DIAGNOSIS_MAIN_TEXT),
      goal: drugInfo?.treatmentGoal ?? '—',
      patientGroup: drugInfo?.patientGroup ?? '—',
      dosage: drugInfo?.dosage ?? '—',
      duration: drugInfo?.duration ?? '—',
      monitoring: drugInfo?.monitoring ?? '—',
      notes: drugInfo?.notes ? ` Hinweis: ${drugInfo.notes}` : '',
    },
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p8',
    'Relevante Symptomcluster: {{symptomCluster}}.',
    { symptomCluster: symptomClusterText },
  ),
  tr(
    t,
    hasDoctorSupport
      ? 'offlabel-antrag.export.part1.doctorSupportProvided'
      : 'offlabel-antrag.export.part1.doctorSupportPending',
    hasDoctorSupport
      ? 'Eine ärztliche Stellungnahme mit medizinischer Begründung und Monitoringplan ist beigefügt.'
      : 'Eine ärztliche Stellungnahme (Begründung/Monitoringplan) wird nachgereicht.',
  ),
  tr(
    t,
    'offlabel-antrag.export.part1.p9',
    'Ich bitte um eine zeitnahe schriftliche Entscheidung. Für Rückfragen steht meine behandelnde Praxis zur Verfügung.',
  ),
  tr(t, 'offlabel-antrag.export.part1.p10', 'Mit freundlichen Grüßen'),
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

const buildArztParagraphs = ({
  t,
  patientName,
  patientBirthDate,
  doctorName,
  diagnosisMain,
  diagnosisIcdList,
  symptomClusterText,
  severitySummary,
  severityHighlights,
  priorTreatments,
  drugInfo,
  drugDisplayName,
  dateLine,
}: {
  t: I18nT;
  patientName: string;
  patientBirthDate: string;
  doctorName: string;
  diagnosisMain: string;
  diagnosisIcdList: string;
  symptomClusterText: string;
  severitySummary: string;
  severityHighlights: string;
  priorTreatments: string;
  drugInfo: DrugInfo | null;
  drugDisplayName: string;
  dateLine: string;
}): string[] => {
  return [
    tr(
      t,
      'offlabel-antrag.export.part2.p1',
      'Anbei erhalten Sie meinen Antrag an die Krankenkasse (Teil 1) zur Kostenübernahme einer Off-Label-Verordnung von {{drug}}.',
      { drug: drugInfo?.label ?? drugDisplayName },
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.p2',
      'Ich bitte Sie um einen wohlwollenden Befundbericht / eine ärztliche Stellungnahme mit Diagnose, Leitsymptomen, Schweregrad, bisherigen Behandlungsversuchen sowie Nutzen-Risiko-Abwägung und Monitoringplan.',
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.p3',
      'Nachfolgend finden Sie einen vorformulierten Entwurf, den Sie auf Praxisbriefkopf übernehmen und fachlich anpassen können.',
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
        targetSymptoms: symptomClusterText,
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
      'For symptomatic treatment, off-label therapy with {{drugName}} ({{drugSubstance}}) is requested, treatment goal: {{targetSymptoms}}. The indication rationale references the documentation of the Expert Group Long COVID Off-Label Use at BfArM.',
      {
        drugName: drugInfo?.label ?? drugDisplayName,
        drugSubstance: drugInfo?.label ?? drugDisplayName,
        targetSymptoms: drugInfo?.treatmentGoal ?? symptomClusterText,
      },
    ),
    tr(
      t,
      'offlabel-antrag.export.part2.statement.p5',
      'Dosage proposal: {{doseText}} Treatment duration/trial: {{durationText}} Stop criteria: {{stopText}} Monitoring/safety: {{monitoringText}}',
      {
        doseText: drugInfo?.dosage ?? '—',
        durationText: drugInfo?.duration ?? '—',
        stopText: drugInfo?.notes ?? '—',
        monitoringText: drugInfo?.monitoring ?? '—',
      },
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

const getExpertSourceForDrug = (
  t: I18nT,
  drug: KnownDrug | null,
): string | null => {
  if (!drug) {
    return null;
  }

  const info = DRUG_INFO[drug];
  return tr(
    t,
    `offlabel-antrag.export.sources.expert.${drug}`,
    `${info.expertGroupSource.title} (Stand ${info.expertGroupSource.stand}, ${info.expertGroupSource.url}).`,
  );
};

const getSourceItems = (
  t: I18nT,
  drug: KnownDrug | null,
  includeSection2Abs1a: boolean,
): string[] => {
  const sources: string[] = [
    tr(
      t,
      'offlabel-antrag.export.sources.md',
      'MD Bund, appraisal guideline "Hinweise zum Off-Label-Use", status 2024-06-24.',
    ),
  ];

  const expertSource = getExpertSourceForDrug(t, drug);
  if (expertSource) {
    sources.push(expertSource);
  }

  if (includeSection2Abs1a) {
    sources.push(
      tr(
        t,
        'offlabel-antrag.export.sources.lsg',
        'LSG Niedersachsen-Bremen, interim decision on ME/CFS and Section 2(1a) SGB V.',
      ),
    );
  }

  return sources;
};

const resolveExportFlags = (
  formData: Record<string, unknown>,
  options: BuildOptions,
) => {
  const exportRecord = getRecordValue(formData.export);
  const includeSources =
    options.includeSources ??
    getBooleanValue(exportRecord?.includeSources) ??
    true;
  const includeSection2Abs1a =
    options.includeSection2Abs1a ??
    getBooleanValue(exportRecord?.includeSection2Abs1a) ??
    false;

  return { includeSources, includeSection2Abs1a };
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
  };
};

const resolveDiagnosisMain = (t: I18nT, drugInfo: DrugInfo | null): string =>
  drugInfo?.offLabelIndication ??
  tr(t, FALLBACK_DIAGNOSIS_MAIN_KEY, FALLBACK_DIAGNOSIS_MAIN_TEXT);

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
  includePart1AutoItem: boolean,
  expertSourceAttachment: string | null,
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
  ...(expertSourceAttachment ? [expertSourceAttachment] : []),
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

  const { includeSources, includeSection2Abs1a } = resolveExportFlags(
    formData,
    options,
  );

  const rawDrug = getStringValue(requestRecord?.drug);
  const { knownDrug, drugName } = resolveLocalizedDrug(
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
    standardOfCareTriedFreeText: withDefaultStringField(
      requestRecord,
      'standardOfCareTriedFreeText',
      defaults.request.standardOfCareTriedFreeText,
    ),
    symptomCluster: getSymptomClusters(requestRecord, knownDrug),
    hasDoctorSupport:
      getBooleanValue(requestRecord?.hasDoctorSupport) ??
      defaults.request.hasDoctorSupport,
  };

  const rawAttachmentsFreeText = getStringValue(formData.attachmentsFreeText);
  const attachmentsFreeText = withFallback(
    rawAttachmentsFreeText,
    defaults.attachmentsFreeText,
  );
  const attachmentsItems = parseOfflabelAttachments(rawAttachmentsFreeText);
  const expertSourceAttachment = includeSources
    ? getExpertSourceForDrug(t, knownDrug)
    : null;
  const sources = includeSources
    ? getSourceItems(t, knownDrug, includeSection2Abs1a)
    : [];

  const patientName = buildPatientName(patient);
  const dateLine = getDateLine(locale, patient.city, exportedAt);
  const drugInfo = getDrugInfo(knownDrug);
  const diagnosisMain = resolveDiagnosisMain(t, drugInfo);
  const symptomClusterText = buildSymptomClusterText(t, request.symptomCluster);
  const severitySummary = buildSeveritySummary(t, formData);
  const severityHighlights = buildSeverityStatementHighlights(t, formData);
  const diagnosisIcdList = tr(
    t,
    'offlabel-antrag.export.statement.defaults.icdList',
    '—',
  );

  const kkSignatures = buildKkSignatures({
    t,
    patientName,
  });
  const kkAttachments = buildSectionAttachments(
    t,
    attachmentsItems,
    false,
    expertSourceAttachment,
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
      drugInfo,
      drugDisplayName: drugName,
      severitySummary,
      triedTreatments: request.standardOfCareTriedFreeText,
      symptomClusterText,
      hasDoctorSupport: request.hasDoctorSupport,
      patientName,
      includeSection2Abs1a,
    }),
    attachmentsHeading,
    attachments: kkAttachments,
    signatureBlocks: kkSignatures,
  };

  const arztAttachments = buildSectionAttachments(
    t,
    attachmentsItems,
    true,
    expertSourceAttachment,
  );

  const arzt: OffLabelLetterSection = {
    senderLines: buildPatientSenderLines(patientName, patient),
    addresseeLines: buildAddressLines([doctor.practice, doctor.name], doctor),
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
      symptomClusterText,
      severitySummary,
      severityHighlights,
      priorTreatments: request.standardOfCareTriedFreeText,
      drugInfo,
      drugDisplayName: drugName,
      dateLine,
    }),
    attachmentsHeading,
    attachments: arztAttachments,
    signatureBlocks: [buildPatientSignature(t, patientName)],
  };

  const exportBundle: OffLabelExportBundle = {
    exportedAtIso: exportedAt.toISOString(),
    part1: toLegacyLetter(kk),
    part2: toLegacyLetter(arzt),
  };

  return {
    patient,
    doctor,
    insurer,
    request,
    export: {
      includeSources,
      includeSection2Abs1a,
    },
    attachmentsFreeText,
    attachments: {
      items: attachmentsItems,
    },
    kk,
    arzt,
    hasPart2: '1',
    hasSources: includeSources ? '1' : '',
    sourcesHeading: tr(t, 'offlabel-antrag.export.sourcesHeading', 'Sources'),
    sources,
    exportedAtIso: exportedAt.toISOString(),
    exportBundle,
  };
};
