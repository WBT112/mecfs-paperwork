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

export const buildDoctorLetterDocumentModel = ({
  formData,
  locale,
  exportedAt = new Date(),
}: BuildDoctorLetterDocumentModelOptions): DocumentModel => {
  const docModel = buildDocumentModel('doctor-letter', locale, formData);
  const defaults = getDoctorLetterExportDefaults(locale);
  const t = i18n.getFixedT(locale, 'formpack:doctor-letter');
  const tApp = i18n.getFixedT(locale, 'app');
  const label = (key: string) => t(key, { defaultValue: key });

  const labelKeys = {
    patient: {
      firstName: 'doctor-letter.patient.firstName.label',
      lastName: 'doctor-letter.patient.lastName.label',
      streetAndNumber: 'doctor-letter.patient.streetAndNumber.label',
      postalCode: 'doctor-letter.patient.postalCode.label',
      city: 'doctor-letter.patient.city.label',
    },
    doctor: {
      practice: 'doctor-letter.doctor.practice.label',
      title: 'doctor-letter.doctor.title.label',
      gender: 'doctor-letter.doctor.gender.label',
      name: 'doctor-letter.doctor.name.label',
      streetAndNumber: 'doctor-letter.doctor.streetAndNumber.label',
      postalCode: 'doctor-letter.doctor.postalCode.label',
      city: 'doctor-letter.doctor.city.label',
    },
  } as const;

  const labels = {
    patient: {
      firstName: label(labelKeys.patient.firstName),
      lastName: label(labelKeys.patient.lastName),
      streetAndNumber: label(labelKeys.patient.streetAndNumber),
      postalCode: label(labelKeys.patient.postalCode),
      city: label(labelKeys.patient.city),
    },
    doctor: {
      practice: label(labelKeys.doctor.practice),
      title: label(labelKeys.doctor.title),
      gender: label(labelKeys.doctor.gender),
      name: label(labelKeys.doctor.name),
      streetAndNumber: label(labelKeys.doctor.streetAndNumber),
      postalCode: label(labelKeys.doctor.postalCode),
      city: label(labelKeys.doctor.city),
    },
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

  const patientRows = [
    buildRow(labels.patient.firstName, patient.firstName),
    buildRow(labels.patient.lastName, patient.lastName),
    buildRow(labels.patient.streetAndNumber, patient.streetAndNumber),
    buildRow(labels.patient.postalCode, patient.postalCode),
    buildRow(labels.patient.city, patient.city),
  ].filter((row): row is [string, string] => Boolean(row));

  const doctorRows = [
    buildRow(labels.doctor.practice, doctor.practice),
    buildRow(labels.doctor.title, doctor.title),
    buildRow(labels.doctor.gender, doctor.gender),
    buildRow(labels.doctor.name, doctor.name),
    buildRow(labels.doctor.streetAndNumber, doctor.streetAndNumber),
    buildRow(labels.doctor.postalCode, doctor.postalCode),
    buildRow(labels.doctor.city, doctor.city),
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
