import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';
import { resolveDecisionTree, type DecisionAnswers } from './decisionEngine';

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
    streetAndNumber?: string | null;
    postalCode?: string | null;
    city?: string | null;
  };
  decision?: {
    caseId: number;
    caseText: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  const ymdDash = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdDash) {
    return `${ymdDash[3]}-${ymdDash[2]}-${ymdDash[1]}`;
  }

  const ymdSlash = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlash) {
    return `${ymdSlash[3]}-${ymdSlash[2]}-${ymdSlash[1]}`;
  }

  const dmyDot = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmyDot) {
    return `${dmyDot[1]}-${dmyDot[2]}-${dmyDot[3]}`;
  }

  const dmyDash = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyDash) {
    return `${dmyDash[1]}-${dmyDash[2]}-${dmyDash[3]}`;
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

  const t = i18n.getFixedT(locale, `formpack:${formpackId}`);

  if (formpackId === 'doctor-letter') {
    const patient = getRecordValue(formData.patient);
    const doctor = getRecordValue(formData.doctor);
    const decision = getRecordValue(formData.decision);

    const decisionAnswers: DecisionAnswers = {
      q1: decision?.q1 === true ? true : decision?.q1 === false ? false : undefined,
      q2: decision?.q2 === true ? true : decision?.q2 === false ? false : undefined,
      q3: decision?.q3 === true ? true : decision?.q3 === false ? false : undefined,
      q4: typeof decision?.q4 === 'string' ? (decision.q4 as DecisionAnswers['q4']) : undefined,
      q5: typeof decision?.q5 === 'string' ? (decision.q5 as DecisionAnswers['q5']) : undefined,
      q6: decision?.q6 === true ? true : decision?.q6 === false ? false : undefined,
      q7: decision?.q7 === true ? true : decision?.q7 === false ? false : undefined,
      q8: typeof decision?.q8 === 'string' ? (decision.q8 as DecisionAnswers['q8']) : undefined,
    };

    const result = resolveDecisionTree(decisionAnswers);
    const caseText = t(result.caseKey, {
      defaultValue: result.caseKey,
    });

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
      },
    };
  }

  if (formpackId !== 'notfallpass') {
    return { diagnosisParagraphs: [], ...baseModel };
  }

  const diagnosisParagraphs: string[] = [];
  const { meCfs, pots, longCovid } = getDiagnosisFlags(formData);

  if (!meCfs) {
    return { diagnosisParagraphs, ...baseModel };
  }

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
