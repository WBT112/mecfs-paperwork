import { describe, expect, it } from 'vitest';
import { applyDocxExportDefaults } from '../../../src/export/docx';

const DOCTOR_LETTER_FALLBACK_CASE_TEXT =
  'HINWEIS: BITTE BEANTWORTEN SIE ZUERST DIE FRAGEN UM EIN ERGEBNIS ZU ERHALTEN.';
const DEFAULT_POSTAL_CODE = '12345';
const DEFAULT_CITY_DE = 'Musterstadt';
const DEFAULT_PATIENT_STREET_DE = 'Musterstraße 1';
const DEFAULT_DOCTOR_STREET_DE = 'Praxisstraße 2';
const DEFAULT_DOCTOR_NAME_DE = 'Dr. med. Erika Beispiel';
const DEFAULT_PLACEHOLDER = '—';

describe('applyDocxExportDefaults', () => {
  it('applies doctor-letter placeholders for missing patient and doctor fields', () => {
    const context = {
      t: {},
      patient: {
        firstName: '',
        lastName: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      doctor: {
        practice: '',
        name: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      decision: {
        caseText: '',
        caseParagraphs: [],
      },
    };

    const normalized = applyDocxExportDefaults(context, 'doctor-letter', 'de', {
      decision: {},
    });

    expect(normalized).toMatchObject({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        streetAndNumber: DEFAULT_PATIENT_STREET_DE,
        postalCode: DEFAULT_POSTAL_CODE,
        city: DEFAULT_CITY_DE,
      },
      doctor: {
        practice: '',
        name: DEFAULT_DOCTOR_NAME_DE,
        streetAndNumber: DEFAULT_DOCTOR_STREET_DE,
        postalCode: DEFAULT_POSTAL_CODE,
        city: DEFAULT_CITY_DE,
      },
      decision: {
        caseText: DOCTOR_LETTER_FALLBACK_CASE_TEXT,
        caseParagraphs: [DOCTOR_LETTER_FALLBACK_CASE_TEXT],
      },
    });
  });

  it('preserves provided values and skips defaults for non-missing fields', () => {
    const context = {
      t: {},
      patient: {
        firstName: 'Jane',
        lastName: 'Doe',
        streetAndNumber: 'Main St 5',
        postalCode: '99999',
        city: 'Sampletown',
      },
      doctor: {
        practice: 'Central Clinic',
        name: 'Dr. Real',
        streetAndNumber: 'Health Ave 3',
        postalCode: '11111',
        city: 'Care City',
      },
      decision: {
        caseText: 'Resolved case text',
        caseParagraphs: ['Resolved case text'],
      },
    };

    const normalized = applyDocxExportDefaults(context, 'doctor-letter', 'en', {
      decision: { q1: 'yes' },
    });

    expect(normalized).toEqual(context);
  });

  it('applies offlabel-antrag placeholders for empty fields', () => {
    const context = {
      t: {},
      patient: {
        firstName: '',
        lastName: '',
        birthDate: '',
        insuranceNumber: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      doctor: {
        practice: '',
        name: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      insurer: {
        name: '',
        department: '',
        streetAndNumber: '',
        postalCode: '',
        city: '',
      },
      request: {
        drug: '',
        selectedIndicationKey: '',
        standardOfCareTriedFreeText: '',
      },
      attachmentsFreeText: '',
      attachments: { items: [] },
    };

    const normalized = applyDocxExportDefaults(
      context,
      'offlabel-antrag',
      'de',
      {},
    );

    expect(normalized).toMatchObject({
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        birthDate: '01.01.1970',
        insuranceNumber: 'X123456789',
        streetAndNumber: DEFAULT_PATIENT_STREET_DE,
        postalCode: DEFAULT_POSTAL_CODE,
        city: DEFAULT_CITY_DE,
      },
      doctor: {
        practice: 'Hausarztpraxis Beispiel',
        name: DEFAULT_DOCTOR_NAME_DE,
        streetAndNumber: DEFAULT_DOCTOR_STREET_DE,
        postalCode: DEFAULT_POSTAL_CODE,
        city: DEFAULT_CITY_DE,
      },
      insurer: {
        name: 'AOK Minus',
        department: 'Ablehnungen',
        streetAndNumber: 'Kassenweg 3',
        postalCode: DEFAULT_POSTAL_CODE,
        city: DEFAULT_CITY_DE,
      },
      request: {
        drug: 'BITTE AUSWÄHLEN',
        selectedIndicationKey: '',
        standardOfCareTriedFreeText: DEFAULT_PLACEHOLDER,
      },
      attachmentsFreeText: DEFAULT_PLACEHOLDER,
      attachments: { items: [] },
    });
  });

  it('preserves provided offlabel-antrag values', () => {
    const context = {
      t: {},
      patient: {
        firstName: 'Mara',
        lastName: 'Example',
        birthDate: '12.04.1990',
        insuranceNumber: 'A-123',
        streetAndNumber: 'Road 1',
        postalCode: '11111',
        city: 'Town',
      },
      doctor: {
        practice: 'Clinic',
        name: 'Dr. Real',
        streetAndNumber: 'Doc St 2',
        postalCode: '22222',
        city: 'Med City',
      },
      insurer: {
        name: 'Real Insurance',
        department: 'Claims',
        streetAndNumber: 'Insurer St 3',
        postalCode: '33333',
        city: 'Ins City',
      },
      request: {
        drug: 'ivabradine',
        selectedIndicationKey: '',
        standardOfCareTriedFreeText: 'Existing prior care',
      },
      attachmentsFreeText: 'Existing attachment',
      attachments: { items: ['A'] },
    };

    const normalized = applyDocxExportDefaults(
      context,
      'offlabel-antrag',
      'en',
      {},
    );

    expect(normalized).toEqual(context);
  });

  it('applies notfallpass placeholders for empty fields', () => {
    const context = {
      t: {},
      person: {
        name: '',
        birthDate: '',
      },
      diagnoses: {
        formatted: '',
      },
      symptoms: '',
      allergies: '',
      doctor: {
        name: '',
        phone: '',
      },
      contacts: [],
      medications: [],
      diagnosisParagraphs: [],
    };

    const normalized = applyDocxExportDefaults(context, 'notfallpass', 'de', {
      diagnoses: {},
    });

    expect(normalized).toMatchObject({
      person: {
        name: 'Max Mustermann',
        birthDate: '01-01-1970',
      },
      diagnoses: {
        formatted: DEFAULT_PLACEHOLDER,
      },
      symptoms: DEFAULT_PLACEHOLDER,
      allergies: DEFAULT_PLACEHOLDER,
      doctor: {
        name: DEFAULT_DOCTOR_NAME_DE,
        phone: '+49 30 123456',
      },
      contacts: [],
      medications: [],
      diagnosisParagraphs: [],
    });
  });

  it('preserves provided notfallpass values', () => {
    const context = {
      t: {},
      person: {
        name: 'Jane Real',
        birthDate: '12-04-1990',
      },
      diagnoses: {
        formatted: 'ME/CFS',
      },
      symptoms: 'Fatigue',
      allergies: 'None',
      doctor: {
        name: 'Dr. Real',
        phone: '+49 40 123456',
      },
      contacts: [{ name: 'Alex', phone: '+49 1', relation: 'Family' }],
      medications: [{ name: 'Med', dosage: '10 mg', schedule: 'Daily' }],
      diagnosisParagraphs: ['Paragraph'],
    };

    const normalized = applyDocxExportDefaults(context, 'notfallpass', 'en', {
      diagnoses: { meCfs: true },
    });

    expect(normalized).toEqual(context);
  });

  it('does not apply defaults for other formpacks', () => {
    const context = {
      t: {},
      patient: { firstName: '' },
      doctor: { name: '' },
      decision: { caseText: '' },
    };

    const normalized = applyDocxExportDefaults(context, 'unknown-pack', 'en', {
      decision: {},
    });

    expect(normalized).toEqual(context);
  });
});
