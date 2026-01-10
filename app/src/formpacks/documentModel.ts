import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';

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
  };
  contacts: Array<{
    name: string | null;
    phone: string | null;
    relation: string | null;
  }>;
  diagnosesFormatted: string | null;
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
      birthDate: getStringValue(person?.birthDate),
    },
    contacts,
    diagnosesFormatted: getStringValue(diagnoses?.formatted),
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
