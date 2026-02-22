import type { SupportedLocale } from '../i18n/locale';

export type OfflabelAntragExportDefaults = {
  patient: {
    firstName: string;
    lastName: string;
    birthDate: string;
    insuranceNumber: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  doctor: {
    practice: string;
    name: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  insurer: {
    name: string;
    department: string;
    streetAndNumber: string;
    postalCode: string;
    city: string;
  };
  request: {
    drug: string;
    selectedIndicationKey: string;
    standardOfCareTriedFreeText: string;
    otherDrugName: string;
    otherIndication: string;
    otherTreatmentGoal: string;
    otherDose: string;
    otherDuration: string;
    otherMonitoring: string;
  };
  attachmentsFreeText: string;
};

type DefaultsLocale = 'de' | 'en';
const DEFAULT_PLACEHOLDER_TEXT = '—';
const DEFAULT_SAMPLE_POSTAL_CODE = '12345';
const EN_EXAMPLE_CITY = 'Example City';

const OFFLABEL_ANTRAG_EXPORT_DEFAULTS: Record<
  DefaultsLocale,
  OfflabelAntragExportDefaults
> = {
  de: {
    patient: {
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: '01.01.1970',
      insuranceNumber: 'X123456789',
      streetAndNumber: 'Musterstraße 1',
      postalCode: DEFAULT_SAMPLE_POSTAL_CODE,
      city: 'Musterstadt',
    },
    doctor: {
      practice: 'Hausarztpraxis Beispiel',
      name: 'Dr. med. Erika Beispiel',
      streetAndNumber: 'Praxisstraße 2',
      postalCode: DEFAULT_SAMPLE_POSTAL_CODE,
      city: 'Musterstadt',
    },
    insurer: {
      name: 'AOK Minus',
      department: 'Ablehnungen',
      streetAndNumber: 'Kassenweg 3',
      postalCode: DEFAULT_SAMPLE_POSTAL_CODE,
      city: 'Musterstadt',
    },
    request: {
      drug: 'BITTE AUSWÄHLEN',
      selectedIndicationKey: '',
      standardOfCareTriedFreeText: DEFAULT_PLACEHOLDER_TEXT,
      otherDrugName: DEFAULT_PLACEHOLDER_TEXT,
      otherIndication: DEFAULT_PLACEHOLDER_TEXT,
      otherTreatmentGoal: DEFAULT_PLACEHOLDER_TEXT,
      otherDose: DEFAULT_PLACEHOLDER_TEXT,
      otherDuration: DEFAULT_PLACEHOLDER_TEXT,
      otherMonitoring: DEFAULT_PLACEHOLDER_TEXT,
    },
    attachmentsFreeText: DEFAULT_PLACEHOLDER_TEXT,
  },
  en: {
    patient: {
      firstName: 'Max',
      lastName: 'Example',
      birthDate: '01/01/1970',
      insuranceNumber: 'X123456789',
      streetAndNumber: 'Example Street 1',
      postalCode: DEFAULT_SAMPLE_POSTAL_CODE,
      city: EN_EXAMPLE_CITY,
    },
    doctor: {
      practice: 'Example General Practice',
      name: 'Dr. Erica Example',
      streetAndNumber: 'Practice Street 2',
      postalCode: DEFAULT_SAMPLE_POSTAL_CODE,
      city: EN_EXAMPLE_CITY,
    },
    insurer: {
      name: 'AOK Minus',
      department: 'Ablehnungen',
      streetAndNumber: 'Insurance Road 3',
      postalCode: DEFAULT_SAMPLE_POSTAL_CODE,
      city: EN_EXAMPLE_CITY,
    },
    request: {
      drug: 'PLEASE SELECT',
      selectedIndicationKey: '',
      standardOfCareTriedFreeText: DEFAULT_PLACEHOLDER_TEXT,
      otherDrugName: DEFAULT_PLACEHOLDER_TEXT,
      otherIndication: DEFAULT_PLACEHOLDER_TEXT,
      otherTreatmentGoal: DEFAULT_PLACEHOLDER_TEXT,
      otherDose: DEFAULT_PLACEHOLDER_TEXT,
      otherDuration: DEFAULT_PLACEHOLDER_TEXT,
      otherMonitoring: DEFAULT_PLACEHOLDER_TEXT,
    },
    attachmentsFreeText: DEFAULT_PLACEHOLDER_TEXT,
  },
};

const resolveDefaultsLocale = (locale: SupportedLocale): DefaultsLocale =>
  locale === 'de' ? 'de' : 'en';

export const getOfflabelAntragExportDefaults = (
  locale: SupportedLocale,
): OfflabelAntragExportDefaults =>
  OFFLABEL_ANTRAG_EXPORT_DEFAULTS[resolveDefaultsLocale(locale)];
