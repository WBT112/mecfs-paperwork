import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';
import { isRecord } from '../lib/utils';
import { normalizeParagraphText } from '../lib/text/paragraphs';
import { resolveDecisionTree, type DecisionAnswers } from './decisionEngine';
import {
  buildOffLabelAntragDocumentModel,
  type OffLabelExportBundle,
  type OffLabelLetterSection,
} from './offlabel-antrag/export/documentModel';

type DiagnosisFlags = {
  meCfs?: boolean;
  pots?: boolean;
  longCovid?: boolean;
};

export type DocumentModel = {
  diagnosisParagraphs: string[];
  person: {
    name: string | null;
    birthDate: string | null;
    email?: string | null;
    website?: string | null;
  };
  contacts: Array<{
    name: string | null;
    phone: string | null;
    relation: string | null;
  }>;
  diagnoses: {
    formatted: string | null;
  };
  symptoms: string | null;
  medications: Array<{
    name: string | null;
    dosage: string | null;
    schedule: string | null;
  }>;
  allergies: string | null;
  doctor: {
    name: string | null;
    phone: string | null;
    practice?: string | null;
    title?: string | null;
    gender?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  patient?: {
    firstName: string | null;
    lastName: string | null;
    birthDate?: string | null;
    insuranceNumber?: string | null;
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  insurer?: {
    name: string | null;
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
  };
  attachmentsFreeText?: string | null;
  attachments?: {
    items: string[];
  };
  export?: {
    includeSources?: boolean;
    includeSection2Abs1a?: boolean;
  };
  kk?: OffLabelLetterSection;
  arzt?: OffLabelLetterSection;
  hasPart2?: string;
  hasSources?: string;
  sourcesHeading?: string;
  sources?: string[];
  exportedAtIso?: string;
  exportBundle?: OffLabelExportBundle;
  decision?: {
    caseId: number;
    caseText: string;
    caseParagraphs: string[];
  };
};

const getDiagnosisFlags = (
  formData: Record<string, unknown>,
): DiagnosisFlags => {
  const diagnoses = isRecord(formData.diagnoses) ? formData.diagnoses : null;
  return {
    meCfs: diagnoses?.meCfs === true,
    pots: diagnoses?.pots === true,
    longCovid: diagnoses?.longCovid === true,
  };
};

const getStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

const getRecordValue = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

const getArrayValue = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const buildBaseDocumentModel = (
  formData: Record<string, unknown>,
): Omit<DocumentModel, 'diagnosisParagraphs'> => {
  const person = getRecordValue(formData.person);
  const diagnoses = getRecordValue(formData.diagnoses);
  const doctor = getRecordValue(formData.doctor);

  const contacts = getArrayValue(formData.contacts)
    .map((entry) => {
      const record = getRecordValue(entry);
      if (!record) {
        return null;
      }
      const name = getStringValue(record.name);
      const phone = getStringValue(record.phone);
      const relation = getStringValue(record.relation);
      if (!name && !phone && !relation) {
        return null;
      }
      return { name, phone, relation };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const medications = getArrayValue(formData.medications)
    .map((entry) => {
      const record = getRecordValue(entry);
      if (!record) {
        return null;
      }
      const name = getStringValue(record.name);
      const dosage = getStringValue(record.dosage);
      const schedule = getStringValue(record.schedule);
      if (!name && !dosage && !schedule) {
        return null;
      }
      return { name, dosage, schedule };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return {
    person: {
      name: getStringValue(person?.name),
      birthDate: formatBirthDate(getStringValue(person?.birthDate)),
      email: getStringValue(person?.email),
      website: getStringValue(person?.website),
    },
    contacts,
    diagnoses: {
      formatted: getStringValue(diagnoses?.formatted),
    },
    symptoms: getStringValue(formData.symptoms),
    medications,
    allergies: getStringValue(formData.allergies),
    doctor: {
      name: getStringValue(doctor?.name),
      phone: getStringValue(doctor?.phone),
    },
  };
};

const getYesNoValue = (value: unknown): 'yes' | 'no' | undefined => {
  if (value === 'yes' || value === true) return 'yes';
  if (value === 'no' || value === false) return 'no';
  return undefined;
};

const getDecisionAnswers = (
  decision: Record<string, unknown> | null,
): DecisionAnswers => ({
  q1: getYesNoValue(decision?.q1),
  q2: getYesNoValue(decision?.q2),
  q3: getYesNoValue(decision?.q3),
  q4:
    typeof decision?.q4 === 'string'
      ? (decision.q4 as DecisionAnswers['q4'])
      : undefined,
  q5:
    typeof decision?.q5 === 'string'
      ? (decision.q5 as DecisionAnswers['q5'])
      : undefined,
  q6: getYesNoValue(decision?.q6),
  q7: getYesNoValue(decision?.q7),
  q8:
    typeof decision?.q8 === 'string'
      ? (decision.q8 as DecisionAnswers['q8'])
      : undefined,
});

const buildDoctorLetterModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => {
  const patient = getRecordValue(formData.patient);
  const doctor = getRecordValue(formData.doctor);
  const decision = getRecordValue(formData.decision);

  const decisionAnswers = getDecisionAnswers(decision);
  const result = resolveDecisionTree(decisionAnswers);
  const t = i18n.getFixedT(locale, 'formpack:doctor-letter');
  const rawCaseText = t(result.caseKey, {
    defaultValue: result.caseKey,
  });
  const { paragraphs: caseParagraphs, text: caseText } =
    normalizeParagraphText(rawCaseText);

  return {
    diagnosisParagraphs: [],
    ...baseModel,
    patient: {
      firstName: getStringValue(patient?.firstName),
      lastName: getStringValue(patient?.lastName),
      streetAndNumber: getStringValue(patient?.streetAndNumber),
      postalCode: getStringValue(patient?.postalCode),
      city: getStringValue(patient?.city),
    },
    doctor: {
      ...baseModel.doctor,
      practice: getStringValue(doctor?.practice),
      title: getStringValue(doctor?.title),
      gender: getStringValue(doctor?.gender),
      name: getStringValue(doctor?.name),
      streetAndNumber: getStringValue(doctor?.streetAndNumber),
      postalCode: getStringValue(doctor?.postalCode),
      city: getStringValue(doctor?.city),
    },
    decision: {
      caseId: result.caseId,
      caseText,
      caseParagraphs,
    },
  };
};

const buildNotfallpassModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => {
  const diagnosisParagraphs: string[] = [];
  const { meCfs, pots, longCovid } = getDiagnosisFlags(formData);

  if (!meCfs) {
    return { diagnosisParagraphs, ...baseModel };
  }

  const t = i18n.getFixedT(locale, 'formpack:notfallpass');

  diagnosisParagraphs.push(
    t('notfallpass.export.diagnoses.meCfs.paragraph', {
      defaultValue: 'notfallpass.export.diagnoses.meCfs.paragraph',
    }),
  );

  if (pots) {
    diagnosisParagraphs.push(
      t('notfallpass.export.diagnoses.pots.paragraph', {
        defaultValue: 'notfallpass.export.diagnoses.pots.paragraph',
      }),
    );
  }

  if (longCovid) {
    diagnosisParagraphs.push(
      t('notfallpass.export.diagnoses.longCovid.paragraph', {
        defaultValue: 'notfallpass.export.diagnoses.longCovid.paragraph',
      }),
    );
  }

  return { diagnosisParagraphs, ...baseModel };
};

const buildOfflabelAntragModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => {
  const projected = buildOffLabelAntragDocumentModel(formData, locale);

  return {
    diagnosisParagraphs: [],
    ...baseModel,
    patient: projected.patient,
    doctor: {
      ...baseModel.doctor,
      practice: projected.doctor.practice,
      title: getStringValue(getRecordValue(formData.doctor)?.title),
      gender: getStringValue(getRecordValue(formData.doctor)?.gender),
      name: projected.doctor.name,
      streetAndNumber: projected.doctor.streetAndNumber,
      postalCode: projected.doctor.postalCode,
      city: projected.doctor.city,
    },
    insurer: projected.insurer,
    request: projected.request,
    attachmentsFreeText: projected.attachmentsFreeText,
    attachments: projected.attachments,
    export: projected.export,
    kk: projected.kk,
    arzt: projected.arzt,
    hasPart2: projected.hasPart2,
    hasSources: projected.hasSources,
    sourcesHeading: projected.sourcesHeading,
    sources: projected.sources,
    exportedAtIso: projected.exportedAtIso,
    exportBundle: projected.exportBundle,
  };
};

/**
 * Builds a document projection for exports using formpack i18n content.
 */
export const buildDocumentModel = (
  formpackId: string | null,
  locale: SupportedLocale,
  formData: Record<string, unknown>,
): DocumentModel => {
  const baseModel = buildBaseDocumentModel(formData);

  if (!formpackId) {
    return { diagnosisParagraphs: [], ...baseModel };
  }

  if (formpackId === 'doctor-letter') {
    return buildDoctorLetterModel(formData, locale, baseModel);
  }

  if (formpackId === 'notfallpass') {
    return buildNotfallpassModel(formData, locale, baseModel);
  }

  if (formpackId === 'offlabel-antrag') {
    return buildOfflabelAntragModel(formData, locale, baseModel);
  }

  return { diagnosisParagraphs: [], ...baseModel };
};
