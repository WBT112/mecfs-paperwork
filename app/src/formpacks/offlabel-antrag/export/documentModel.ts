import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import {
  getOfflabelAntragExportDefaults,
  type OfflabelAntragExportDefaults,
} from '../../../export/offlabelAntragDefaults';
import { isRecord } from '../../../lib/utils';
import {
  type MedicationProfile,
  resolveMedicationProfile,
} from '../medications';
import {
  buildOfflabelDocuments,
  type OfflabelRenderedDocument,
} from '../content/buildOfflabelDocuments';
import { flattenBlocksToParagraphs } from './flattenBlocksToParagraphs';

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

type MedicationFacts = {
  medicationName: string;
  medicationIngredient: string;
  expertSource: string | null;
  expertAttachment: string | null;
};

const DEFAULT_PART3_TITLE_KEY = 'offlabel-antrag.export.part3.title';
const DEFAULT_PART3_TITLE =
  'Teil 3 – Vorlage für ärztliche Stellungnahme / Befundbericht (zur Anpassung durch die Praxis)';

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

const isBuiltInMedicationProfile = (
  value: string | null,
): MedicationProfile | null => {
  const profile = resolveMedicationProfile(value);
  if (!profile || profile.isOther) {
    return null;
  }
  return profile;
};

const resolveMedicationFacts = ({
  requestRecord,
  profile,
  locale,
  defaults,
}: {
  requestRecord: Record<string, unknown> | null;
  profile: MedicationProfile | null;
  locale: SupportedLocale;
  defaults: OfflabelAntragExportDefaults;
}): MedicationFacts => {
  if (profile?.autoFacts) {
    const localeFacts =
      locale === 'en' ? profile.autoFacts.en : profile.autoFacts.de;
    return {
      medicationName:
        locale === 'en' ? profile.displayNameEn : profile.displayNameDe,
      medicationIngredient:
        locale === 'en' ? profile.displayNameEn : profile.displayNameDe,
      expertSource: localeFacts.expertSourceText,
      expertAttachment: localeFacts.expertAttachmentText,
    };
  }

  const otherDrugName = withDefaultStringField(
    requestRecord,
    'otherDrugName',
    defaults.request.drug,
  );

  return {
    medicationName: otherDrugName,
    medicationIngredient: otherDrugName,
    expertSource: null,
    expertAttachment: null,
  };
};

const getPreviewPart = (
  documents: OfflabelRenderedDocument[],
  id: OfflabelRenderedDocument['id'],
): OfflabelRenderedDocument | null =>
  documents.find((entry) => entry.id === id) ?? null;

const buildPartParagraphs = (
  part: OfflabelRenderedDocument | null,
): string[] => {
  if (!part) {
    return [];
  }

  return flattenBlocksToParagraphs(part.blocks, {
    includeHeadings: false,
  });
};

const buildPart2Paragraphs = (
  part: OfflabelRenderedDocument | null,
): string[] => {
  const paragraphs = buildPartParagraphs(part);
  return paragraphs.filter((paragraph) => !paragraph.startsWith('Adressat:'));
};

const resolvePart3Title = (
  t: I18nT,
  part3: OfflabelRenderedDocument | null,
): string => {
  const headingBlock = part3?.blocks.find((block) => block.kind === 'heading');
  if (headingBlock && headingBlock.text.trim().length > 0) {
    return headingBlock.text.trim();
  }
  return tr(t, DEFAULT_PART3_TITLE_KEY, DEFAULT_PART3_TITLE);
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

const buildSourceItems = ({
  t,
  expertSource,
}: {
  t: I18nT;
  expertSource: string | null;
}): string[] => {
  const sources = [
    tr(
      t,
      'offlabel-antrag.export.sources.mdBund',
      'Medizinischer Dienst Bund: Begutachtungsanleitung / Begutachtungsmaßstäbe Off-Label-Use (Stand 05/2022).',
    ),
  ];

  if (expertSource) {
    sources.push(expertSource);
  }

  sources.push(
    tr(
      t,
      'offlabel-antrag.export.sources.caseLaw',
      'LSG Niedersachsen-Bremen: Beschluss vom 14.10.2022, L 4 KR 373/22 B ER (ME/CFS; § 2 Abs. 1a SGB V; fehlende Standardtherapie).',
    ),
  );

  return sources;
};

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
  const builtInProfile = isBuiltInMedicationProfile(rawDrug);

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

  const medicationFacts = resolveMedicationFacts({
    requestRecord,
    profile: builtInProfile,
    locale,
    defaults,
  });

  const previewDocuments = buildOfflabelDocuments(formData, 'de');
  const previewPart1 = getPreviewPart(previewDocuments, 'part1');
  const previewPart2 = getPreviewPart(previewDocuments, 'part2');
  const previewPart3 = getPreviewPart(previewDocuments, 'part3');

  const kkParagraphs = buildPartParagraphs(previewPart1);
  const arztParagraphs = buildPart2Paragraphs(previewPart2);
  const part3Paragraphs = buildPartParagraphs(previewPart3);
  const part3Title = resolvePart3Title(t, previewPart3);

  const patientName = buildPatientName(patient);
  const dateLine = getDateLine(locale, patient.city, exportedAt);

  const userAndExpertAttachments = [
    ...(medicationFacts.expertAttachment
      ? [medicationFacts.expertAttachment]
      : []),
    ...attachmentsItems,
  ];

  const attachmentsHeading = tr(
    t,
    'offlabel-antrag.export.attachmentsHeading',
    locale === 'en' ? 'Attachments' : 'Anlagen',
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
      locale === 'en'
        ? 'Application for case-by-case cost coverage (off-label use): {{drug}}'
        : 'Antrag auf Kostenübernahme (Off-Label-Use): {{drug}}',
      { drug: medicationFacts.medicationName },
    ),
    paragraphs: kkParagraphs,
    attachmentsHeading,
    attachments: userAndExpertAttachments,
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
      locale === 'en'
        ? 'Cover letter regarding the off-label request (part 1) - request for support'
        : 'Begleitschreiben zum Off-Label-Antrag (Teil 1) - Bitte um Unterstützung',
    ),
    paragraphs: arztParagraphs,
    attachmentsHeading,
    attachments: [
      tr(
        t,
        'offlabel-antrag.export.part2.attachmentsAutoItem',
        locale === 'en'
          ? 'Part 1: Insurer application (draft)'
          : 'Teil 1: Antrag an die Krankenkasse (Entwurf)',
      ),
      ...userAndExpertAttachments,
    ],
    signatureBlocks: [],
  };

  const part3: OffLabelPart3Section = {
    title: part3Title,
    paragraphs: part3Paragraphs,
  };

  const sources = buildSourceItems({
    t,
    expertSource: medicationFacts.expertSource,
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
      locale === 'en' ? 'Sources' : 'Quellen',
    ),
    sources,
    exportedAtIso: exportedAt.toISOString(),
    exportBundle,
  };
};
