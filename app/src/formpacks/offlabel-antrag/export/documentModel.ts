import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import {
  getOfflabelAntragExportDefaults,
  type OfflabelAntragExportDefaults,
} from '../../../export/offlabelAntragDefaults';
import {
  formatBirthDate,
  getRecordValue,
  getStringValue,
} from '../../modelValueUtils';
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
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  paragraphs: string[];
};

type OffLabelExportPart3 = {
  title: string;
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  paragraphs: string[];
};

export type OffLabelExportBundle = {
  exportedAtIso: string;
  part1: OffLabelLetterSection;
  part2: OffLabelLetterSection;
  part3: OffLabelExportPart3;
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
    selectedIndicationKey: string;
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
};

type LetterCompositionInput = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  attachmentsHeading: string;
};

const REQUEST_DEFAULT_FIELDS = [
  'selectedIndicationKey',
  'standardOfCareTriedFreeText',
  'otherDrugName',
  'otherIndication',
  'otherTreatmentGoal',
  'otherDose',
  'otherDuration',
  'otherMonitoring',
] as const;

const DEFAULT_PART3_SUBJECT_KEY = 'offlabel-antrag.export.part3.subject';
const DEFAULT_PART3_SUBJECT =
  'Ärztliche Stellungnahme / Befundbericht zum Off-Label-Use';
const PART2_TITLE = 'Teil 2 – Schreiben an die behandelnde Praxis';

const getT = (locale: SupportedLocale): I18nT =>
  i18n.getFixedT(locale, 'formpack:offlabel-antrag');

const tr = (
  t: I18nT,
  key: string,
  defaultValue: string,
  options: Record<string, unknown> = {},
): string => t(key, { defaultValue, ...options });

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
  Object.fromEntries(
    fields.map((field) => [
      field,
      withDefaultStringField(record, field, defaults[field]),
    ]),
  ) as Record<FieldName, string>;

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
  if (profile.isOther) {
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
  };
};

const getPreviewPart = (
  documents: OfflabelRenderedDocument[],
  id: OfflabelRenderedDocument['id'],
): OfflabelRenderedDocument | null =>
  documents.find((entry) => entry.id === id) ?? null;

const buildPartParagraphs = (
  part: OfflabelRenderedDocument | null,
  options: {
    blankLineBetweenBlocks?: boolean;
    compactAroundKinds?: OfflabelRenderedDocument['blocks'][number]['kind'][];
    listWrapAt?: number;
    listPrefix?: string;
  } = {},
): string[] => {
  if (!part) {
    return [];
  }

  return flattenBlocksToParagraphs(part.blocks, {
    includeHeadings: false,
    blankLineBetweenBlocks: options.blankLineBetweenBlocks ?? false,
    compactAroundKinds: options.compactAroundKinds,
    listWrapAt: options.listWrapAt,
    listPrefix: options.listPrefix,
  });
};

const buildPart2Paragraphs = (
  part: OfflabelRenderedDocument | null,
): string[] => {
  if (!part) {
    return [];
  }

  const bodyBlocks = part.blocks.filter(
    (block) =>
      !(
        block.kind === 'paragraph' &&
        (block.text.startsWith('Adressat:') ||
          block.text.startsWith('Addressee:'))
      ),
  );

  return flattenBlocksToParagraphs(bodyBlocks, {
    includeHeadings: true,
    blankLineBetweenBlocks: true,
    compactAroundKinds: ['heading', 'list'],
    listWrapAt: 78,
    listPrefix: '•\t',
  }).filter((paragraph) => paragraph !== PART2_TITLE);
};

const buildKkSignatures = (): OffLabelSignatureBlock[] => [];

const buildSourceItems = ({
  t,
  expertSource,
}: {
  t: I18nT;
  expertSource: string | null;
}): string[] => {
  const sources: string[] = [];

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

const buildLetterSection = ({
  senderLines,
  addresseeLines,
  dateLine,
  subject,
  paragraphs,
  attachmentsHeading,
  attachments,
  signatureBlocks,
}: LetterCompositionInput & {
  subject: string;
  paragraphs: string[];
  attachments: string[];
  signatureBlocks: OffLabelSignatureBlock[];
}): OffLabelLetterSection => ({
  senderLines,
  addresseeLines,
  dateLine,
  subject,
  paragraphs,
  attachmentsHeading,
  attachments,
  signatureBlocks,
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
    ...resolveStringFields(
      requestRecord,
      defaults.request,
      REQUEST_DEFAULT_FIELDS,
    ),
  };

  const rawAttachmentsFreeText = getStringValue(formData.attachmentsFreeText);
  const attachmentsFreeText = withFallback(
    rawAttachmentsFreeText,
    defaults.attachmentsFreeText,
  );
  const attachmentEntries = parseOfflabelAttachments(rawAttachmentsFreeText);

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

  const kkParagraphs = buildPartParagraphs(previewPart1, {
    blankLineBetweenBlocks: true,
    compactAroundKinds: ['list'],
    listWrapAt: 78,
    listPrefix: '•\t',
  });
  const arztParagraphs = buildPart2Paragraphs(previewPart2);
  const part3Paragraphs = buildPartParagraphs(previewPart3, {
    blankLineBetweenBlocks: true,
    compactAroundKinds: ['list'],
    listWrapAt: 78,
    listPrefix: '•\t',
  });

  const patientName = buildPatientName(patient);
  const dateLine = getDateLine(locale, patient.city, exportedAt);

  const attachmentsHeading = tr(
    t,
    'offlabel-antrag.export.attachmentsHeading',
    locale === 'en' ? 'Attachments' : 'Anlagen',
  );
  const letterInput: LetterCompositionInput = {
    senderLines: buildPatientSenderLines(patientName, patient),
    dateLine,
    attachmentsHeading,
    addresseeLines: [],
  };

  const userAttachments = attachmentEntries;
  const kkAttachmentsHeading =
    userAttachments.length > 0 ? attachmentsHeading : '';

  const kk = buildLetterSection({
    ...letterInput,
    attachmentsHeading: kkAttachmentsHeading,
    addresseeLines: buildAddressLines(
      [insurer.name, insurer.department],
      insurer,
    ),
    subject: tr(
      t,
      'offlabel-antrag.export.part1.subject',
      locale === 'en'
        ? 'Application for case-by-case cost coverage (off-label use): {{drug}}'
        : 'Antrag auf Kostenübernahme (Off-Label-Use): {{drug}}',
      { drug: medicationFacts.medicationName },
    ),
    paragraphs: kkParagraphs,
    attachments: userAttachments,
    signatureBlocks: buildKkSignatures(),
  });

  const arzt = buildLetterSection({
    ...letterInput,
    addresseeLines: buildAddressLines([doctor.practice, doctor.name], doctor),
    subject: tr(
      t,
      'offlabel-antrag.export.part2.subject',
      locale === 'en'
        ? 'Cover letter regarding the off-label request (part 1) - request for support'
        : 'Begleitschreiben zum Off-Label-Antrag - Bitte um Unterstützung',
    ),
    paragraphs: arztParagraphs,
    attachments: [
      tr(
        t,
        'offlabel-antrag.export.part2.attachmentsAutoItem',
        locale === 'en'
          ? 'Part 1: Insurer application (draft)'
          : 'Teil 1: Antrag an die Krankenkasse (Entwurf)',
      ),
      ...userAttachments,
    ],
    signatureBlocks: [],
  });

  const part3: OffLabelPart3Section = {
    title: '',
    senderLines: buildAddressLines([doctor.practice, doctor.name], doctor),
    addresseeLines: buildAddressLines(
      [insurer.name, insurer.department],
      insurer,
    ),
    dateLine,
    subject: tr(t, DEFAULT_PART3_SUBJECT_KEY, DEFAULT_PART3_SUBJECT),
    paragraphs: part3Paragraphs,
  };

  const sources = buildSourceItems({
    t,
    expertSource: medicationFacts.expertSource,
  });

  const exportBundle: OffLabelExportBundle = {
    exportedAtIso: exportedAt.toISOString(),
    part1: kk,
    part2: arzt,
    part3: {
      title: part3.title,
      senderLines: part3.senderLines,
      addresseeLines: part3.addresseeLines,
      dateLine: part3.dateLine,
      subject: part3.subject,
      paragraphs: part3.paragraphs,
    },
  };

  return {
    patient,
    doctor,
    insurer,
    request,
    attachmentsFreeText,
    attachments: {
      items: attachmentEntries,
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
