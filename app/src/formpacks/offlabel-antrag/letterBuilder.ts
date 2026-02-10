import i18n from '../../i18n';
import type { SupportedLocale } from '../../i18n/locale';
import {
  getOfflabelAntragExportDefaults,
  type OfflabelAntragExportDefaults,
} from '../../export/offlabelAntragDefaults';

type OfflabelAntragSignatureBlock = {
  label: string;
  name: string;
  extraLines?: string[];
};

export type OfflabelAntragLetter = {
  senderLines: string[];
  addresseeLines: string[];
  dateLine: string;
  subject: string;
  bodyParagraphs: string[];
  attachmentsHeading: string;
  attachmentsItems: string[];
  signatureBlocks: OfflabelAntragSignatureBlock[];
};

export type OfflabelAntragExportBundle = {
  exportedAtIso: string;
  part1: OfflabelAntragLetter;
  part2?: OfflabelAntragLetter;
};

type OfflabelAntragBundleInput = {
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    birthDate?: string | null;
    insuranceNumber?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  doctor?: {
    name?: string | null;
    practice?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  insurer?: {
    name?: string | null;
    department?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  request?: {
    drug?: string | null;
    indicationFreeText?: string | null;
    symptomsFreeText?: string | null;
    standardOfCareTriedFreeText?: string | null;
    doctorRationaleFreeText?: string | null;
    doctorSupport?: {
      enabled?: boolean;
      doctorSignsPart1?: boolean;
    };
  };
  export?: {
    includeDoctorCoverLetter?: boolean;
  };
  attachmentsFreeText?: string | null;
  attachments?: {
    items?: string[];
  };
};

type BuildOfflabelAntragExportBundleArgs = {
  locale: SupportedLocale;
  documentModel: OfflabelAntragBundleInput;
  defaults?: OfflabelAntragExportDefaults;
  exportedAt?: Date;
  includeDoctorCoverLetter?: boolean;
};

const PATIENT_SIGNATURE_KEY = 'offlabel-antrag.export.signatures.patientLabel';
const DOCTOR_SIGNATURE_KEY = 'offlabel-antrag.export.signatures.doctorLabel';
const ATTACHMENTS_HEADING_KEY = 'offlabel-antrag.export.attachmentsHeading';

type MergedModel = {
  patient: Required<OfflabelAntragExportDefaults['patient']>;
  doctor: Required<OfflabelAntragExportDefaults['doctor']>;
  insurer: Required<OfflabelAntragExportDefaults['insurer']>;
  request: Required<OfflabelAntragExportDefaults['request']> & {
    doctorSupport: {
      enabled: boolean;
      doctorSignsPart1: boolean;
    };
  };
  attachmentsFreeText: string;
  attachments: {
    items: string[];
  };
  includeDoctorCoverLetter: boolean;
};

const coalesceText = (
  value: string | null | undefined,
  fallback: string,
): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const coalesceBoolean = (value: boolean | undefined, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

export const parseAttachments = (
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

const mergeWithDefaults = (
  model: OfflabelAntragBundleInput,
  defaults: OfflabelAntragExportDefaults,
  explicitIncludeDoctorCoverLetter?: boolean,
): MergedModel => {
  const supportEnabled = coalesceBoolean(
    model.request?.doctorSupport?.enabled,
    false,
  );
  const includeDoctorCoverLetter =
    typeof explicitIncludeDoctorCoverLetter === 'boolean'
      ? explicitIncludeDoctorCoverLetter
      : typeof model.export?.includeDoctorCoverLetter === 'boolean'
        ? model.export.includeDoctorCoverLetter
        : supportEnabled;

  const attachmentsFreeText = coalesceText(
    model.attachmentsFreeText,
    defaults.attachmentsFreeText,
  );
  const parsedFromModelItems = Array.isArray(model.attachments?.items)
    ? model.attachments.items
        .map((item) => coalesceText(item, '').trim())
        .filter((item) => item.length > 0)
    : [];
  const parsedFromFreeText = parseAttachments(attachmentsFreeText);
  const attachmentsItems =
    parsedFromModelItems.length > 0 ? parsedFromModelItems : parsedFromFreeText;

  return {
    patient: {
      firstName: coalesceText(
        model.patient?.firstName,
        defaults.patient.firstName,
      ),
      lastName: coalesceText(
        model.patient?.lastName,
        defaults.patient.lastName,
      ),
      birthDate: coalesceText(
        model.patient?.birthDate,
        defaults.patient.birthDate,
      ),
      insuranceNumber: coalesceText(
        model.patient?.insuranceNumber,
        defaults.patient.insuranceNumber,
      ),
      streetAndNumber: coalesceText(
        model.patient?.streetAndNumber,
        defaults.patient.streetAndNumber,
      ),
      postalCode: coalesceText(
        model.patient?.postalCode,
        defaults.patient.postalCode,
      ),
      city: coalesceText(model.patient?.city, defaults.patient.city),
    },
    doctor: {
      practice: coalesceText(model.doctor?.practice, defaults.doctor.practice),
      name: coalesceText(model.doctor?.name, defaults.doctor.name),
      streetAndNumber: coalesceText(
        model.doctor?.streetAndNumber,
        defaults.doctor.streetAndNumber,
      ),
      postalCode: coalesceText(
        model.doctor?.postalCode,
        defaults.doctor.postalCode,
      ),
      city: coalesceText(model.doctor?.city, defaults.doctor.city),
    },
    insurer: {
      name: coalesceText(model.insurer?.name, defaults.insurer.name),
      department: coalesceText(
        model.insurer?.department,
        defaults.insurer.department,
      ),
      streetAndNumber: coalesceText(
        model.insurer?.streetAndNumber,
        defaults.insurer.streetAndNumber,
      ),
      postalCode: coalesceText(
        model.insurer?.postalCode,
        defaults.insurer.postalCode,
      ),
      city: coalesceText(model.insurer?.city, defaults.insurer.city),
    },
    request: {
      drug: coalesceText(model.request?.drug, defaults.request.drug),
      indicationFreeText: coalesceText(
        model.request?.indicationFreeText,
        defaults.request.indicationFreeText,
      ),
      symptomsFreeText: coalesceText(
        model.request?.symptomsFreeText,
        defaults.request.symptomsFreeText,
      ),
      standardOfCareTriedFreeText: coalesceText(
        model.request?.standardOfCareTriedFreeText,
        defaults.request.standardOfCareTriedFreeText,
      ),
      doctorRationaleFreeText: coalesceText(
        model.request?.doctorRationaleFreeText,
        defaults.request.doctorRationaleFreeText,
      ),
      doctorSupport: {
        enabled: supportEnabled,
        doctorSignsPart1: coalesceBoolean(
          model.request?.doctorSupport?.doctorSignsPart1,
          false,
        ),
      },
    },
    attachmentsFreeText,
    attachments: {
      items: attachmentsItems,
    },
    includeDoctorCoverLetter,
  };
};

const getDateLine = (
  locale: SupportedLocale,
  city: string,
  exportedAt: Date,
): string => {
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  const formattedDate = new Intl.DateTimeFormat(localeTag).format(exportedAt);
  return `${city}, ${formattedDate}`;
};

const buildPatientName = (model: MergedModel): string =>
  `${model.patient.firstName} ${model.patient.lastName}`.trim();

const buildPart1Signatures = (
  model: MergedModel,
  t: (key: string, options?: Record<string, unknown>) => string,
): OfflabelAntragSignatureBlock[] => {
  const signatures: OfflabelAntragSignatureBlock[] = [
    {
      label: t(PATIENT_SIGNATURE_KEY, {
        defaultValue: PATIENT_SIGNATURE_KEY,
      }),
      name: buildPatientName(model),
    },
  ];

  if (
    model.request.doctorSupport.enabled &&
    model.request.doctorSupport.doctorSignsPart1
  ) {
    signatures.push({
      label: t(DOCTOR_SIGNATURE_KEY, {
        defaultValue: DOCTOR_SIGNATURE_KEY,
      }),
      name: model.doctor.name,
      extraLines: [model.doctor.practice],
    });
  }

  return signatures;
};

type BuildLetterContext = {
  locale: SupportedLocale;
  model: MergedModel;
  exportedAt: Date;
};

export const buildPart1KkLetter = ({
  locale,
  model,
  exportedAt,
}: BuildLetterContext): OfflabelAntragLetter => {
  const t = i18n.getFixedT(locale, 'formpack:offlabel-antrag');

  return {
    senderLines: [
      buildPatientName(model),
      model.patient.streetAndNumber,
      `${model.patient.postalCode} ${model.patient.city}`,
    ],
    addresseeLines: [
      model.insurer.name,
      model.insurer.department,
      model.insurer.streetAndNumber,
      `${model.insurer.postalCode} ${model.insurer.city}`,
    ],
    dateLine: getDateLine(locale, model.patient.city, exportedAt),
    subject: t('offlabel-antrag.export.part1.subject', {
      defaultValue: 'offlabel-antrag.export.part1.subject',
      drug: model.request.drug,
    }),
    bodyParagraphs: [
      t('offlabel-antrag.export.part1.p1', {
        defaultValue: 'offlabel-antrag.export.part1.p1',
        drug: model.request.drug,
      }),
      t('offlabel-antrag.export.part1.p2', {
        defaultValue: 'offlabel-antrag.export.part1.p2',
        indication: model.request.indicationFreeText,
      }),
      t('offlabel-antrag.export.part1.p3', {
        defaultValue: 'offlabel-antrag.export.part1.p3',
        symptoms: model.request.symptomsFreeText,
      }),
      t('offlabel-antrag.export.part1.p4', {
        defaultValue: 'offlabel-antrag.export.part1.p4',
        standardOfCare: model.request.standardOfCareTriedFreeText,
      }),
      t('offlabel-antrag.export.part1.p5', {
        defaultValue: 'offlabel-antrag.export.part1.p5',
        rationale: model.request.doctorRationaleFreeText,
      }),
      t('offlabel-antrag.export.part1.p6', {
        defaultValue: 'offlabel-antrag.export.part1.p6',
      }),
    ],
    attachmentsHeading: t(ATTACHMENTS_HEADING_KEY, {
      defaultValue: ATTACHMENTS_HEADING_KEY,
    }),
    attachmentsItems: model.attachments.items,
    signatureBlocks: buildPart1Signatures(model, t),
  };
};

export const buildPart2DoctorLetter = ({
  locale,
  model,
  exportedAt,
}: BuildLetterContext): OfflabelAntragLetter => {
  const t = i18n.getFixedT(locale, 'formpack:offlabel-antrag');
  const supportBullets = [
    t('offlabel-antrag.export.part2.supportBullets.b1', {
      defaultValue: 'offlabel-antrag.export.part2.supportBullets.b1',
    }),
    t('offlabel-antrag.export.part2.supportBullets.b2', {
      defaultValue: 'offlabel-antrag.export.part2.supportBullets.b2',
    }),
    t('offlabel-antrag.export.part2.supportBullets.b3', {
      defaultValue: 'offlabel-antrag.export.part2.supportBullets.b3',
    }),
    t('offlabel-antrag.export.part2.supportBullets.b4', {
      defaultValue: 'offlabel-antrag.export.part2.supportBullets.b4',
    }),
    t('offlabel-antrag.export.part2.supportBullets.b5', {
      defaultValue: 'offlabel-antrag.export.part2.supportBullets.b5',
    }),
  ].map((entry) => `• ${entry}`);

  return {
    senderLines: [
      buildPatientName(model),
      model.patient.streetAndNumber,
      `${model.patient.postalCode} ${model.patient.city}`,
    ],
    addresseeLines: [
      model.doctor.practice,
      model.doctor.name,
      model.doctor.streetAndNumber,
      `${model.doctor.postalCode} ${model.doctor.city}`,
    ],
    dateLine: getDateLine(locale, model.patient.city, exportedAt),
    subject: t('offlabel-antrag.export.part2.subject', {
      defaultValue: 'offlabel-antrag.export.part2.subject',
    }),
    bodyParagraphs: [
      t('offlabel-antrag.export.part2.p1', {
        defaultValue: 'offlabel-antrag.export.part2.p1',
      }),
      t('offlabel-antrag.export.part2.p2', {
        defaultValue: 'offlabel-antrag.export.part2.p2',
      }),
      t('offlabel-antrag.export.part2.p3', {
        defaultValue: 'offlabel-antrag.export.part2.p3',
      }),
      ...supportBullets,
    ],
    attachmentsHeading: t(ATTACHMENTS_HEADING_KEY, {
      defaultValue: ATTACHMENTS_HEADING_KEY,
    }),
    attachmentsItems: [
      t('offlabel-antrag.export.part2.attachmentsAutoItem', {
        defaultValue: 'offlabel-antrag.export.part2.attachmentsAutoItem',
      }),
      ...model.attachments.items,
    ],
    signatureBlocks: [
      {
        label: t(PATIENT_SIGNATURE_KEY, {
          defaultValue: PATIENT_SIGNATURE_KEY,
        }),
        name: buildPatientName(model),
      },
    ],
  };
};

export const buildOfflabelAntragExportBundle = ({
  locale,
  documentModel,
  defaults: defaultsOverride,
  exportedAt = new Date(),
  includeDoctorCoverLetter,
}: BuildOfflabelAntragExportBundleArgs): OfflabelAntragExportBundle => {
  const defaults = defaultsOverride ?? getOfflabelAntragExportDefaults(locale);
  const mergedModel = mergeWithDefaults(
    documentModel,
    defaults,
    includeDoctorCoverLetter,
  );
  const part1 = buildPart1KkLetter({
    locale,
    model: mergedModel,
    exportedAt,
  });
  const part2 = mergedModel.includeDoctorCoverLetter
    ? buildPart2DoctorLetter({
        locale,
        model: mergedModel,
        exportedAt,
      })
    : undefined;

  return {
    exportedAtIso: exportedAt.toISOString(),
    part1,
    ...(part2 ? { part2 } : {}),
  };
};
