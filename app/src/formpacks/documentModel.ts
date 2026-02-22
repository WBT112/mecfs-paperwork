import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';
import { normalizeParagraphText } from '../lib/text/paragraphs';
import { resolveDecisionTree } from './decisionEngine';
import { normalizeDecisionAnswers } from './doctor-letter/decisionAnswers';
import {
  DOCTOR_LETTER_FORMPACK_ID,
  NOTFALLPASS_FORMPACK_ID,
  OFFLABEL_ANTRAG_FORMPACK_ID,
} from './ids';
import {
  formatBirthDate,
  getArrayValue,
  getRecordValue,
  getStringValue,
} from './modelValueUtils';
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
    selectedIndicationKey?: string | null;
    standardOfCareTriedFreeText?: string | null;
    otherDrugName?: string | null;
    otherIndication?: string | null;
    otherTreatmentGoal?: string | null;
    otherDose?: string | null;
    otherDuration?: string | null;
    otherMonitoring?: string | null;
  };
  attachmentsFreeText?: string | null;
  attachments?: {
    items: string[];
  };
  kk?: OffLabelLetterSection;
  arzt?: OffLabelLetterSection;
  part3?: {
    title: string;
    paragraphs: string[];
  };
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
  const diagnoses = getRecordValue(formData.diagnoses);
  return {
    meCfs: diagnoses?.meCfs === true,
    pots: diagnoses?.pots === true,
    longCovid: diagnoses?.longCovid === true,
  };
};

const projectRecordList = <T>(
  value: unknown,
  project: (record: Record<string, unknown>) => T | null,
): T[] =>
  getArrayValue(value)
    .map((entry) => {
      const record = getRecordValue(entry);
      return record ? project(record) : null;
    })
    .filter((entry): entry is T => Boolean(entry));

const buildBaseDocumentModel = (
  formData: Record<string, unknown>,
): Omit<DocumentModel, 'diagnosisParagraphs'> => {
  const person = getRecordValue(formData.person);
  const diagnoses = getRecordValue(formData.diagnoses);
  const doctor = getRecordValue(formData.doctor);

  const contacts = projectRecordList(formData.contacts, (record) => {
    const name = getStringValue(record.name);
    const phone = getStringValue(record.phone);
    const relation = getStringValue(record.relation);
    if (!name && !phone && !relation) {
      return null;
    }
    return { name, phone, relation };
  });

  const medications = projectRecordList(formData.medications, (record) => {
    const name = getStringValue(record.name);
    const dosage = getStringValue(record.dosage);
    const schedule = getStringValue(record.schedule);
    if (!name && !dosage && !schedule) {
      return null;
    }
    return { name, dosage, schedule };
  });

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

type ProjectedDoctorDetails = {
  practice: string | null;
  title: string | null;
  gender: string | null;
  name: string | null;
  streetAndNumber: string | null;
  postalCode: string | null;
  city: string | null;
};

const projectDoctorDetails = (
  doctor: Record<string, unknown> | null,
): ProjectedDoctorDetails => ({
  practice: getStringValue(doctor?.practice),
  title: getStringValue(doctor?.title),
  gender: getStringValue(doctor?.gender),
  name: getStringValue(doctor?.name),
  streetAndNumber: getStringValue(doctor?.streetAndNumber),
  postalCode: getStringValue(doctor?.postalCode),
  city: getStringValue(doctor?.city),
});

const buildDoctorLetterModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => {
  const patient = getRecordValue(formData.patient);
  const doctor = getRecordValue(formData.doctor);
  const doctorDetails = projectDoctorDetails(doctor);
  const decision = getRecordValue(formData.decision);

  const decisionAnswers = normalizeDecisionAnswers(decision ?? {});
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
      birthDate: formatBirthDate(getStringValue(patient?.birthDate)),
      streetAndNumber: getStringValue(patient?.streetAndNumber),
      postalCode: getStringValue(patient?.postalCode),
      city: getStringValue(patient?.city),
    },
    doctor: {
      ...baseModel.doctor,
      ...doctorDetails,
    },
    decision: {
      caseId: result.caseId,
      caseText,
      caseParagraphs,
    },
  };
};

const computePersonName = (
  formData: Record<string, unknown>,
): string | null => {
  const person = getRecordValue(formData.person);
  const firstName = getStringValue(person?.firstName);
  const lastName = getStringValue(person?.lastName);
  return [firstName, lastName].filter(Boolean).join(' ') || null;
};

const buildNotfallpassModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => {
  const person = {
    ...baseModel.person,
    name: computePersonName(formData),
  };

  const diagnosisParagraphs: string[] = [];
  const { meCfs, pots, longCovid } = getDiagnosisFlags(formData);

  if (!meCfs) {
    return { diagnosisParagraphs, ...baseModel, person };
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

  return { diagnosisParagraphs, ...baseModel, person };
};

const buildOfflabelAntragModel = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => {
  const projected = buildOffLabelAntragDocumentModel(formData, locale);
  const doctor = getRecordValue(formData.doctor);
  const doctorDetails = projectDoctorDetails(doctor);

  return {
    diagnosisParagraphs: [],
    ...baseModel,
    patient: projected.patient,
    doctor: {
      ...baseModel.doctor,
      ...doctorDetails,
      practice: projected.doctor.practice,
      name: projected.doctor.name,
      streetAndNumber: projected.doctor.streetAndNumber,
      postalCode: projected.doctor.postalCode,
      city: projected.doctor.city,
    },
    insurer: projected.insurer,
    request: projected.request,
    attachmentsFreeText: projected.attachmentsFreeText,
    attachments: projected.attachments,
    kk: projected.kk,
    arzt: projected.arzt,
    part3: projected.part3,
    sourcesHeading: projected.sourcesHeading,
    sources: projected.sources,
    exportedAtIso: projected.exportedAtIso,
    exportBundle: projected.exportBundle,
  };
};

const withEmptyDiagnosis = (
  model: Omit<DocumentModel, 'diagnosisParagraphs'>,
): DocumentModel => ({ diagnosisParagraphs: [], ...model });

type ModelBuilder = (
  formData: Record<string, unknown>,
  locale: SupportedLocale,
  baseModel: Omit<DocumentModel, 'diagnosisParagraphs'>,
) => DocumentModel;

const FORMPACK_MODEL_BUILDERS: Partial<Record<string, ModelBuilder>> = {
  [DOCTOR_LETTER_FORMPACK_ID]: buildDoctorLetterModel,
  [NOTFALLPASS_FORMPACK_ID]: buildNotfallpassModel,
  [OFFLABEL_ANTRAG_FORMPACK_ID]: buildOfflabelAntragModel,
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
    return withEmptyDiagnosis(baseModel);
  }

  const modelBuilder = FORMPACK_MODEL_BUILDERS[formpackId];
  return modelBuilder
    ? modelBuilder(formData, locale, baseModel)
    : withEmptyDiagnosis(baseModel);
};
