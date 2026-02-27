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
  liabilityHeading?: string;
  liabilityParagraphs?: string[];
  liabilityDateLine?: string;
  liabilitySignerName?: string;
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

export type OffLabelPostExportChecklist = {
  title: string;
  intro: string;
  documentsHeading: string;
  documentsItems: string[];
  signaturesHeading: string;
  signaturesItems: string[];
  physicianSupportHeading: string;
  physicianSupportItems: string[];
  attachmentsHeading: string;
  attachmentsItems: string[];
  attachmentsChecklistItems: string[];
  attachmentsFallbackItem: string;
  shippingHeading: string;
  shippingItems: string[];
  note: string;
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
    otherEvidenceReference: string;
  };
  attachmentsFreeText: string;
  attachments: {
    items: string[];
  };
  kk: OffLabelLetterSection;
  arzt: OffLabelLetterSection;
  part3: OffLabelPart3Section;
  postExportChecklist: OffLabelPostExportChecklist;
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
  'otherEvidenceReference',
] as const;

const DEFAULT_PART3_SUBJECT_KEY = 'offlabel-antrag.export.part3.subject';
const DEFAULT_PART3_SUBJECT =
  'Ärztliche Stellungnahme / Befundbericht zum Off-Label-Use';
const PART2_TITLE = 'Teil 2 – Schreiben an die behandelnde Praxis';
const PART2_LIABILITY_HEADING_PREFIX =
  'Aufklärung und Einwilligung zum Off-Label-Use:';
const PART2_LIABILITY_LEGACY_HEADING =
  'Haftungsausschluss (vom Patienten zu unterzeichnen)';
const GREETING_LINES = new Set(['Mit freundlichen Grüßen', 'Kind regards']);

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

const getBool = (value: unknown): boolean =>
  value === true || value === 'true' || value === 1 || value === '1';

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

const getDateOnly = (locale: SupportedLocale, exportedAt: Date): string => {
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  return new Intl.DateTimeFormat(localeTag).format(exportedAt);
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
    listItemBlankLines?: boolean;
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
    listItemBlankLines: options.listItemBlankLines,
  });
};

const trimSurroundingBlankLines = (paragraphs: string[]): string[] => {
  let start = 0;
  let end = paragraphs.length;
  while (start < end && paragraphs[start] === '') {
    start += 1;
  }
  while (end > start && paragraphs[end - 1] === '') {
    end -= 1;
  }
  return paragraphs.slice(start, end);
};

const buildPart2Paragraphs = (
  part: OfflabelRenderedDocument | null,
): {
  body: string[];
  liabilityHeading: string;
  liabilityParagraphs: string[];
} => {
  if (!part) {
    return { body: [], liabilityHeading: '', liabilityParagraphs: [] };
  }

  const bodyBlocks = part.blocks.filter(
    (block) =>
      !(
        block.kind === 'paragraph' &&
        (block.text.startsWith('Adressat:') ||
          block.text.startsWith('Addressee:'))
      ),
  );

  const flattened = flattenBlocksToParagraphs(bodyBlocks, {
    includeHeadings: true,
    blankLineBetweenBlocks: true,
    compactAroundKinds: ['heading'],
    listPrefix: '',
    listItemBlankLines: true,
  }).filter((paragraph) => paragraph !== PART2_TITLE);

  const liabilityHeadingIndex = flattened.findIndex(
    (paragraph) =>
      paragraph.startsWith(PART2_LIABILITY_HEADING_PREFIX) ||
      paragraph === PART2_LIABILITY_LEGACY_HEADING,
  );
  if (liabilityHeadingIndex < 0) {
    return { body: flattened, liabilityHeading: '', liabilityParagraphs: [] };
  }

  return {
    body: trimSurroundingBlankLines(flattened.slice(0, liabilityHeadingIndex)),
    liabilityHeading: flattened[liabilityHeadingIndex],
    liabilityParagraphs: trimSurroundingBlankLines(
      flattened.slice(liabilityHeadingIndex + 1),
    ),
  };
};

const enforceClosingLayout = (
  paragraphs: string[],
  opts: { appendBlankBeforeAttachments: boolean },
): string[] => {
  const greetingIndex = paragraphs.findIndex((line) =>
    GREETING_LINES.has(line.trim()),
  );
  if (greetingIndex < 0) {
    if (!opts.appendBlankBeforeAttachments) {
      return paragraphs;
    }
    const withTrailingBlank = [...paragraphs];
    if (withTrailingBlank.length === 0 || withTrailingBlank.at(-1) !== '') {
      withTrailingBlank.push('');
    }
    return withTrailingBlank;
  }

  const signatureIndex = paragraphs.findIndex(
    (line, index) => index > greetingIndex && line.trim().length > 0,
  );
  if (signatureIndex < 0) {
    return paragraphs;
  }

  const beforeGreeting = paragraphs.slice(0, greetingIndex);
  while (beforeGreeting.length > 0 && beforeGreeting.at(-1) === '') {
    beforeGreeting.pop();
  }

  const afterSignature = paragraphs.slice(signatureIndex + 1);
  const result = [
    ...beforeGreeting,
    '',
    paragraphs[greetingIndex],
    '',
    '',
    '',
    paragraphs[signatureIndex],
    ...afterSignature,
  ];

  if (!opts.appendBlankBeforeAttachments) {
    return result;
  }

  const trailing = [...result];
  if (trailing.length === 0 || trailing.at(-1) !== '') {
    trailing.push('');
  }
  return trailing;
};

const buildKkSignatures = (): OffLabelSignatureBlock[] => [];

const buildSourceItems = ({
  t,
  expertSource,
  includeCaseLawSource,
}: {
  t: I18nT;
  expertSource: string | null;
  includeCaseLawSource: boolean;
}): string[] => {
  const sources: string[] = [];

  if (expertSource) {
    sources.push(expertSource);
  }

  if (includeCaseLawSource) {
    sources.push(
      tr(
        t,
        'offlabel-antrag.export.sources.caseLaw',
        'LSG Niedersachsen-Bremen: Beschluss vom 14.10.2022, L 4 KR 373/22 B ER (ME/CFS; § 2 Abs. 1a SGB V; fehlende Standardtherapie).',
      ),
    );
  }

  return sources;
};

const checklistText = (
  t: I18nT,
  locale: SupportedLocale,
  key: string,
  deDefault: string,
  enDefault: string,
): string => tr(t, key, locale === 'en' ? enDefault : deDefault);

const buildPostExportChecklist = ({
  t,
  locale,
  attachments,
}: {
  t: I18nT;
  locale: SupportedLocale;
  attachments: string[];
}): OffLabelPostExportChecklist => {
  const text = (key: string, deDefault: string, enDefault: string): string =>
    checklistText(t, locale, key, deDefault, enDefault);
  const attachmentsFallbackItem = text(
    'offlabel-antrag.export.checklist.attachments.fallback',
    'Anlagenliste geprüft und ggf. ergänzt (z. B. Befunde, Bescheide, relevante Unterlagen)',
    'Attachments list reviewed and completed as needed (e.g. findings, notices, relevant documents)',
  );
  const attachmentsChecklistItems =
    attachments.length > 0 ? attachments : [attachmentsFallbackItem];

  return {
    title: text(
      'offlabel-antrag.export.checklist.title',
      'Checkliste - Nächste Schritte nach dem Export',
      'Checklist - Next steps after export',
    ),
    intro: text(
      'offlabel-antrag.export.checklist.intro',
      'Diese Liste hilft euch, den Antrag vollständig vorzubereiten. Hakt ab, was erledigt ist.',
      'This list helps you prepare a complete application. Tick off what has been completed.',
    ),
    documentsHeading: text(
      'offlabel-antrag.export.checklist.documents.heading',
      '1) Dokumente prüfen',
      '1) Review documents',
    ),
    documentsItems: [
      text(
        'offlabel-antrag.export.checklist.documents.item.application',
        'Antrag an die Krankenkasse geprüft (Daten, Datum, Empfänger)',
        'Application to the health insurer reviewed (data, date, recipient)',
      ),
      text(
        'offlabel-antrag.export.checklist.documents.item.coverLetter',
        'Arztanschreiben geprüft',
        'Cover letter to physician reviewed',
      ),
      text(
        'offlabel-antrag.export.checklist.documents.item.statementTemplate',
        'Vorlage „Ärztliche Stellungnahme/Befundbericht“ geprüft',
        'Template "Physician statement/report summary" reviewed',
      ),
      text(
        'offlabel-antrag.export.checklist.documents.item.consent',
        'Aufklärung & Einwilligung geprüft (sofern relevant)',
        'Information & consent form reviewed (if relevant)',
      ),
    ],
    signaturesHeading: text(
      'offlabel-antrag.export.checklist.signatures.heading',
      '2) Unterschriften',
      '2) Signatures',
    ),
    signaturesItems: [
      text(
        'offlabel-antrag.export.checklist.signatures.item.applicationSigned',
        'Antrag unterschrieben',
        'Application signed',
      ),
      text(
        'offlabel-antrag.export.checklist.signatures.item.patientConsentSigned',
        'Aufklärung & Einwilligung: Patient unterschrieben (sofern relevant)',
        'Information & consent: patient signed (if relevant)',
      ),
    ],
    physicianSupportHeading: text(
      'offlabel-antrag.export.checklist.physician.heading',
      '3) Ärztliche Unterstützung',
      '3) Physician support',
    ),
    physicianSupportItems: [
      text(
        'offlabel-antrag.export.checklist.physician.item.sentToPractice',
        'Praxis kontaktiert: Arztanschreiben + Vorlage übergeben/gesendet und um ärztliche Stellungnahme gebeten',
        'Practice contacted: cover letter + template handed over/sent and physician statement requested',
      ),
      text(
        'offlabel-antrag.export.checklist.physician.item.alignedDeadline',
        'Abstimmung erledigt: Rückgabe/Frist vereinbart und offene Punkte geklärt (z. B. Dosierung, Monitoring, Abbruchkriterien)',
        'Coordination completed: return/deadline agreed and open points clarified (e.g. dosage, monitoring, stop criteria)',
      ),
      text(
        'offlabel-antrag.export.checklist.physician.item.doctorConsentSigned',
        'Finale Unterlagen aus der Praxis erhalten (Stellungnahme/Befundbericht; ggf. Einwilligung unterschrieben)',
        'Final documents received from practice (statement/report summary; consent signed if applicable)',
      ),
    ],
    attachmentsHeading: text(
      'offlabel-antrag.export.checklist.attachments.heading',
      '4) Anlagen (aus euren Eingaben)',
      '4) Attachments (from your entries)',
    ),
    attachmentsItems: attachments,
    attachmentsChecklistItems,
    attachmentsFallbackItem,
    shippingHeading: text(
      'offlabel-antrag.export.checklist.shipping.heading',
      '5) Versand & Archiv',
      '5) Dispatch & archive',
    ),
    shippingItems: [
      text(
        'offlabel-antrag.export.checklist.shipping.item.fullSet',
        'Vollständigen Antragssatz zusammengestellt (Antrag + Anlagen + ärztliche Stellungnahme)',
        'Complete application package assembled (application + attachments + physician statement)',
      ),
      text(
        'offlabel-antrag.export.checklist.shipping.item.copy',
        'Kopie/Scan für eigene Unterlagen erstellt',
        'Copy/scan created for own records',
      ),
      text(
        'offlabel-antrag.export.checklist.shipping.item.dispatchPrepared',
        'Versand vorbereitet (z. B. Einwurfeinschreiben oder Upload/Portal, falls verfügbar, Einschreiben mit Post App eingescannt bzw. Nummer notiert)',
        'Dispatch prepared (e.g. tracked mail or upload/portal where available)',
      ),
      text(
        'offlabel-antrag.export.checklist.shipping.item.followUp',
        'Wiedervorlage notiert (Nachfragen, Rückmeldung der Kasse)',
        'Follow-up reminder noted (queries, insurer feedback)',
      ),
      text(
        'offlabel-antrag.export.checklist.shipping.item.dates',
        'Versand am: ____________________ Frist 3 Wochen: _____________________ Frist 5 Wochen: _____________________',
        'Sent on: ____________________  3-week deadline: _____________________  5-week deadline: _____________________',
      ),
    ],
    note: text(
      'offlabel-antrag.export.checklist.note',
      'Hinweis: Bearbeitungsfristen können variieren; achtet auf Rückfragen/Nachforderungen.',
      'Note: Processing deadlines may vary; watch for follow-up questions or requests for additional documents.',
    ),
  };
};

const buildLetterSection = ({
  senderLines,
  addresseeLines,
  dateLine,
  subject,
  paragraphs,
  liabilityHeading,
  liabilityParagraphs,
  liabilityDateLine,
  liabilitySignerName,
  attachmentsHeading,
  attachments,
  signatureBlocks,
}: LetterCompositionInput & {
  subject: string;
  paragraphs: string[];
  liabilityHeading?: string;
  liabilityParagraphs?: string[];
  liabilityDateLine?: string;
  liabilitySignerName?: string;
  attachments: string[];
  signatureBlocks: OffLabelSignatureBlock[];
}): OffLabelLetterSection => ({
  senderLines,
  addresseeLines,
  dateLine,
  subject,
  paragraphs,
  liabilityHeading,
  liabilityParagraphs,
  liabilityDateLine,
  liabilitySignerName,
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
  const isDirectSection2Path = builtInProfile === null;
  const isFallbackSection2Path = getBool(requestRecord?.applySection2Abs1a);
  const includeCaseLawSource = isDirectSection2Path || isFallbackSection2Path;

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
  const previewPart2Content = buildPart2Paragraphs(previewPart2);

  const kkBaseParagraphs = buildPartParagraphs(previewPart1, {
    blankLineBetweenBlocks: true,
    listPrefix: '',
    listItemBlankLines: true,
  });
  const arztBaseParagraphs = previewPart2Content.body;
  const part3Paragraphs = buildPartParagraphs(previewPart3, {
    blankLineBetweenBlocks: true,
    listPrefix: '',
    listItemBlankLines: true,
  });

  const patientName = buildPatientName(patient);
  const dateLine = getDateOnly(locale, exportedAt);

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
  const kkParagraphs = enforceClosingLayout(kkBaseParagraphs, {
    appendBlankBeforeAttachments: userAttachments.length > 0,
  });
  const arztParagraphs = enforceClosingLayout(arztBaseParagraphs, {
    appendBlankBeforeAttachments: false,
  });

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
    attachmentsHeading: '',
    addresseeLines: buildAddressLines([doctor.practice, doctor.name], doctor),
    subject: tr(
      t,
      'offlabel-antrag.export.part2.subject',
      locale === 'en'
        ? 'Cover letter regarding the off-label request (part 1) - request for support'
        : 'Begleitschreiben zum Off-Label-Antrag - Bitte um Unterstützung',
    ),
    paragraphs: arztParagraphs,
    liabilityHeading: previewPart2Content.liabilityHeading,
    liabilityParagraphs: previewPart2Content.liabilityParagraphs,
    liabilityDateLine: previewPart2Content.liabilityHeading
      ? getDateOnly(locale, exportedAt)
      : '',
    liabilitySignerName: previewPart2Content.liabilityHeading
      ? patientName
      : '',
    attachments: [],
    signatureBlocks: [],
  });

  const part3: OffLabelPart3Section = {
    title: '',
    senderLines: buildAddressLines([doctor.practice, doctor.name], doctor),
    addresseeLines: buildAddressLines(
      [insurer.name, insurer.department],
      insurer,
    ),
    dateLine: getDateOnly(locale, exportedAt),
    subject: tr(t, DEFAULT_PART3_SUBJECT_KEY, DEFAULT_PART3_SUBJECT),
    paragraphs: part3Paragraphs,
  };

  const sources = buildSourceItems({
    t,
    expertSource: medicationFacts.expertSource,
    includeCaseLawSource,
  });
  const postExportChecklist = buildPostExportChecklist({
    t,
    locale,
    attachments: attachmentEntries,
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
    postExportChecklist,
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
