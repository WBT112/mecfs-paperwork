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
    buildRow(
      t('doctor-letter.patient.firstName.label', {
        defaultValue: 'doctor-letter.patient.firstName.label',
      }),
      patient.firstName,
    ),
    buildRow(
      t('doctor-letter.patient.lastName.label', {
        defaultValue: 'doctor-letter.patient.lastName.label',
      }),
      patient.lastName,
    ),
    buildRow(
      t('doctor-letter.patient.streetAndNumber.label', {
        defaultValue: 'doctor-letter.patient.streetAndNumber.label',
      }),
      patient.streetAndNumber,
    ),
    buildRow(
      t('doctor-letter.patient.postalCode.label', {
        defaultValue: 'doctor-letter.patient.postalCode.label',
      }),
      patient.postalCode,
    ),
    buildRow(
      t('doctor-letter.patient.city.label', {
        defaultValue: 'doctor-letter.patient.city.label',
      }),
      patient.city,
    ),
  ].filter((row): row is [string, string] => Boolean(row));

  const doctorRows = [
    buildRow(
      t('doctor-letter.doctor.practice.label', {
        defaultValue: 'doctor-letter.doctor.practice.label',
      }),
      doctor.practice,
    ),
    buildRow(
      t('doctor-letter.doctor.title.label', {
        defaultValue: 'doctor-letter.doctor.title.label',
      }),
      doctor.title,
    ),
    buildRow(
      t('doctor-letter.doctor.gender.label', {
        defaultValue: 'doctor-letter.doctor.gender.label',
      }),
      doctor.gender,
    ),
    buildRow(
      t('doctor-letter.doctor.name.label', {
        defaultValue: 'doctor-letter.doctor.name.label',
      }),
      doctor.name,
    ),
    buildRow(
      t('doctor-letter.doctor.streetAndNumber.label', {
        defaultValue: 'doctor-letter.doctor.streetAndNumber.label',
      }),
      doctor.streetAndNumber,
    ),
    buildRow(
      t('doctor-letter.doctor.postalCode.label', {
        defaultValue: 'doctor-letter.doctor.postalCode.label',
      }),
      doctor.postalCode,
    ),
    buildRow(
      t('doctor-letter.doctor.city.label', {
        defaultValue: 'doctor-letter.doctor.city.label',
      }),
      doctor.city,
    ),
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

  return {
    meta: { createdAtIso: exportedAt.toISOString(), locale },
    sections: [
      {
        heading: t('doctor-letter.section.patient.title', {
          defaultValue: 'doctor-letter.section.patient.title',
        }),
        blocks: patientRows.length
          ? [{ type: 'kvTable', rows: patientRows }]
          : [],
      },
      {
        heading: t('doctor-letter.section.doctor.title', {
          defaultValue: 'doctor-letter.section.doctor.title',
        }),
        blocks: doctorRows.length
          ? [{ type: 'kvTable', rows: doctorRows }]
          : [],
      },
      {
        heading: caseHeading,
        blocks: caseBlocks,
      },
    ],
  };
};
