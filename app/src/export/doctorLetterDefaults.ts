import type { SupportedLocale } from '../i18n/locale';
import { isRecord } from '../lib/utils';

export type DoctorLetterExportDefaults = {
  patient: {
    firstName: string;
    lastName: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  doctor: {
    name: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  decision: { fallbackCaseText: string };
};

type DefaultsLocale = 'de' | 'en';

const DOCTOR_LETTER_EXPORT_DEFAULTS: Record<
  DefaultsLocale,
  DoctorLetterExportDefaults
> = {
  de: {
    patient: {
      firstName: 'Max',
      lastName: 'Mustermann',
      streetAndNumber: 'Musterstraße 1',
      postalCode: '12345',
      city: 'Musterstadt',
    },
    doctor: {
      name: 'Dr. med. Erika Beispiel',
      streetAndNumber: 'Praxisstraße 2',
      postalCode: '12345',
      city: 'Musterstadt',
    },
    decision: {
      fallbackCaseText:
        'HINWEIS: BITTE BEANTWORTEN SIE ZUERST DIE FRAGEN UM EIN ERGEBNIS ZU ERHALTEN.',
    },
  },
  en: {
    patient: {
      firstName: 'Max',
      lastName: 'Example',
      streetAndNumber: 'Example Street 1',
      postalCode: '12345',
      city: 'Example City',
    },
    doctor: {
      name: 'Dr. Erica Example',
      streetAndNumber: 'Practice Street 2',
      postalCode: '12345',
      city: 'Example City',
    },
    decision: {
      fallbackCaseText:
        'NOTICE: PLEASE ANSWER THE QUESTIONS FIRST TO RECEIVE A RESULT.',
    },
  },
};

const resolveDefaultsLocale = (locale: SupportedLocale): DefaultsLocale =>
  locale === 'de' ? 'de' : 'en';

export const getDoctorLetterExportDefaults = (
  locale: SupportedLocale,
): DoctorLetterExportDefaults =>
  DOCTOR_LETTER_EXPORT_DEFAULTS[resolveDefaultsLocale(locale)];

export const hasDoctorLetterDecisionAnswers = (
  sourceData: Record<string, unknown> | undefined,
): boolean => {
  if (!isRecord(sourceData)) {
    return false;
  }

  const decision = isRecord(sourceData.decision) ? sourceData.decision : null;
  if (!decision) {
    return false;
  }

  const keys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];
  return keys.some((key) => {
    const value = decision[key];
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return typeof value === 'boolean';
  });
};
