import i18n from '../../../i18n';
import type { SupportedLocale } from '../../../i18n/locale';
import { buildDocumentModel } from '../../documentModel';
import { buildParagraphBlocks } from '../../../lib/text/paragraphs';
import type { DocumentModel } from '../../../export/pdf/types';
import {
  getDoctorLetterExportDefaults,
  hasDoctorLetterDecisionAnswers,
} from '../../../export/doctorLetterDefaults';
import { formatPdfDate } from '../../../export/pdf/render';

export type BuildDoctorLetterDocumentModelOptions = {
  formData: Record<string, unknown>;
  locale: SupportedLocale;
  exportedAt?: Date;
};

const PATIENT_FIELDS = [
  'firstName',
  'lastName',
  'streetAndNumber',
  'postalCode',
  'city',
] as const;

const DOCTOR_FIELDS = [
  'practice',
  'title',
  'gender',
  'name',
  'streetAndNumber',
  'postalCode',
  'city',
] as const;

const asOptionalText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const withFallback = (
  value: string | null | undefined,
  fallback: string,
): string => {
  const normalized = asOptionalText(value);
  return normalized ?? fallback;
};

const buildRow = (label: string, value: string | null | undefined) => {
  const text = asOptionalText(value);
  return text ? ([label, text] as [string, string]) : null;
};

const buildSectionLabels = <Field extends string>(
  t: (key: string, options?: { defaultValue?: string }) => string,
  baseKey: string,
  fields: readonly Field[],
): Record<Field, string> =>
  Object.fromEntries(
    fields.map((field) => [
      field,
      t(`${baseKey}.${field}.label`, {
        defaultValue: `${baseKey}.${field}.label`,
      }),
    ]),
  ) as Record<Field, string>;

const buildRows = <Field extends string>(
  labels: Record<Field, string>,
  values: Record<Field, string | null | undefined>,
  fields: readonly Field[],
): Array<[string, string]> =>
  fields
    .map((field) => buildRow(labels[field], values[field]))
    .filter((row): row is [string, string] => Boolean(row));

export const buildDoctorLetterDocumentModel = ({
  formData,
  locale,
  exportedAt = new Date(),
}: BuildDoctorLetterDocumentModelOptions): DocumentModel => {
  const docModel = buildDocumentModel('doctor-letter', locale, formData);
  const defaults = getDoctorLetterExportDefaults(locale);
  const t = i18n.getFixedT(locale, 'formpack:doctor-letter');
  const tApp = i18n.getFixedT(locale, 'app');

  const labels = {
    patient: buildSectionLabels(t, 'doctor-letter.patient', PATIENT_FIELDS),
    doctor: buildSectionLabels(t, 'doctor-letter.doctor', DOCTOR_FIELDS),
  };

  const patient = {
    firstName: withFallback(
      docModel.patient?.firstName,
      defaults.patient.firstName,
    ),
    lastName: withFallback(
      docModel.patient?.lastName,
      defaults.patient.lastName,
    ),
    streetAndNumber: withFallback(
      docModel.patient?.streetAndNumber,
      defaults.patient.streetAndNumber,
    ),
    postalCode: withFallback(
      docModel.patient?.postalCode,
      defaults.patient.postalCode,
    ),
    city: withFallback(docModel.patient?.city, defaults.patient.city),
  };

  const doctorSource = docModel.doctor;
  const doctor = {
    practice: asOptionalText(doctorSource.practice ?? null),
    title: asOptionalText(doctorSource.title ?? null),
    gender: asOptionalText(doctorSource.gender ?? null),
    name: withFallback(doctorSource.name, defaults.doctor.name),
    streetAndNumber: withFallback(
      doctorSource.streetAndNumber,
      defaults.doctor.streetAndNumber,
    ),
    postalCode: withFallback(
      doctorSource.postalCode,
      defaults.doctor.postalCode,
    ),
    city: withFallback(doctorSource.city, defaults.doctor.city),
  };

  const formattedDate = formatPdfDate(exportedAt, locale);
  const dateLabel = tApp('formpackPdfExportDateLabel', {
    defaultValue: 'Date',
  });

  const patientRows = buildRows(labels.patient, patient, PATIENT_FIELDS);

  const doctorRows = [
    ...buildRows(labels.doctor, doctor, DOCTOR_FIELDS),
    buildRow(dateLabel, formattedDate),
  ].filter((row): row is [string, string] => Boolean(row));

  const shouldApplyDecisionFallback = !hasDoctorLetterDecisionAnswers(formData);

  const caseText = shouldApplyDecisionFallback
    ? defaults.decision.fallbackCaseText
    : (docModel.decision?.caseText ?? '');

  const caseBlocks = buildParagraphBlocks(caseText);
  const caseHeading = t('doctor-letter.export.case.heading', {
    defaultValue: 'Case result',
  });

  const templateData = {
    patient,
    doctor,
    decision: {
      caseText,
    },
    dateLabel,
    formattedDate,
    exportedAtIso: exportedAt.toISOString(),
    labels,
  };

  return {
    meta: { createdAtIso: exportedAt.toISOString(), locale, templateData },
    sections: [
      {
        id: 'patient',
        heading: t('doctor-letter.section.patient.title', {
          defaultValue: 'doctor-letter.section.patient.title',
        }),
        blocks: patientRows.length
          ? [{ type: 'kvTable', rows: patientRows }]
          : [],
      },
      {
        id: 'doctor',
        heading: t('doctor-letter.section.doctor.title', {
          defaultValue: 'doctor-letter.section.doctor.title',
        }),
        blocks: doctorRows.length
          ? [{ type: 'kvTable', rows: doctorRows }]
          : [],
      },
      {
        id: 'case',
        heading: caseHeading,
        blocks: caseBlocks,
      },
    ],
  };
};
