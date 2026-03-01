import type { SupportedLocale } from '../i18n/locale';

export type NotfallpassExportDefaults = {
  person: {
    name: string;
    birthDate: string;
  };
  diagnoses: {
    formatted: string;
  };
  symptoms: string;
  allergies: string;
  doctor: {
    name: string;
    phone: string;
  };
};

type DefaultsLocale = 'de' | 'en';
const DEFAULT_PLACEHOLDER_TEXT = '—';

const NOTFALLPASS_EXPORT_DEFAULTS: Record<
  DefaultsLocale,
  NotfallpassExportDefaults
> = {
  de: {
    person: {
      name: 'Max Mustermann',
      birthDate: '01-01-1970',
    },
    diagnoses: {
      formatted: DEFAULT_PLACEHOLDER_TEXT,
    },
    symptoms: DEFAULT_PLACEHOLDER_TEXT,
    allergies: DEFAULT_PLACEHOLDER_TEXT,
    doctor: {
      name: 'Dr. med. Erika Beispiel',
      phone: '+49 30 123456',
    },
  },
  en: {
    person: {
      name: 'Max Example',
      birthDate: '01-01-1970',
    },
    diagnoses: {
      formatted: DEFAULT_PLACEHOLDER_TEXT,
    },
    symptoms: DEFAULT_PLACEHOLDER_TEXT,
    allergies: DEFAULT_PLACEHOLDER_TEXT,
    doctor: {
      name: 'Dr. Erica Example',
      phone: '+1 555 0100',
    },
  },
};

const resolveDefaultsLocale = (locale: SupportedLocale): DefaultsLocale =>
  locale === 'de' ? 'de' : 'en';

export const getNotfallpassExportDefaults = (
  locale: SupportedLocale,
): NotfallpassExportDefaults =>
  NOTFALLPASS_EXPORT_DEFAULTS[resolveDefaultsLocale(locale)];
