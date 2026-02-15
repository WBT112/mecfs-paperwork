import { describe, expect, it } from 'vitest';
import {
  extractProfileData,
  applyProfileData,
  splitFullName,
} from '../../src/lib/profile/profileMapping';
import { hasUsableProfileData } from '../../src/storage/profiles';

type AnyRecord = Record<string, unknown>;

const DOCTOR_LETTER = 'doctor-letter' as const;
const NOTFALLPASS = 'notfallpass' as const;
const OFFLABEL = 'offlabel-antrag' as const;

const PATIENT_NAME = 'Max Mustermann';
const DOCTOR_NAME = 'Dr. Müller';
const PRACTICE_NAME = 'Praxis Müller';
const BIRTH_DATE = '1990-01-15';
const STREET_PATIENT = 'Hauptstr. 1';
const STREET_DOCTOR = 'Arztweg 5';

describe('splitFullName', () => {
  it('splits multi-word name into firstName and lastName', () => {
    expect(splitFullName(PATIENT_NAME)).toEqual({
      firstName: 'Max',
      lastName: 'Mustermann',
    });
  });

  it('handles three-part names', () => {
    expect(splitFullName('Anna Maria Schmidt')).toEqual({
      firstName: 'Anna Maria',
      lastName: 'Schmidt',
    });
  });

  it('single token goes to lastName only', () => {
    expect(splitFullName('Mustermann')).toEqual({
      lastName: 'Mustermann',
    });
  });

  it('trims whitespace', () => {
    expect(splitFullName('  Max  Mustermann  ')).toEqual({
      firstName: 'Max',
      lastName: 'Mustermann',
    });
  });
});

describe('extractProfileData', () => {
  it('extracts patient and doctor from doctor-letter', () => {
    const formData = {
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        birthDate: BIRTH_DATE,
        streetAndNumber: STREET_PATIENT,
        postalCode: '12345',
        city: 'Berlin',
      },
      doctor: {
        name: DOCTOR_NAME,
        title: 'Dr.',
        gender: 'Herr',
        practice: PRACTICE_NAME,
        streetAndNumber: STREET_DOCTOR,
        postalCode: '54321',
        city: 'München',
      },
      decision: { q1: 'yes' },
    };

    const result = extractProfileData(DOCTOR_LETTER, formData);

    expect(result.patient).toEqual({
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: BIRTH_DATE,
      streetAndNumber: STREET_PATIENT,
      postalCode: '12345',
      city: 'Berlin',
    });
    expect(result.doctor).toEqual({
      name: DOCTOR_NAME,
      title: 'Dr.',
      gender: 'Herr',
      practice: PRACTICE_NAME,
      streetAndNumber: STREET_DOCTOR,
      postalCode: '54321',
      city: 'München',
    });
    expect(result.insurer).toBeUndefined();
  });

  it('extracts person.firstName and person.lastName from notfallpass', () => {
    const formData = {
      person: {
        firstName: 'Max',
        lastName: 'Mustermann',
        birthDate: BIRTH_DATE,
      },
      doctor: { name: 'Dr. Schmidt', phone: '030-12345' },
    };

    const result = extractProfileData(NOTFALLPASS, formData);

    expect(result.patient).toEqual({
      firstName: 'Max',
      lastName: 'Mustermann',
      birthDate: BIRTH_DATE,
    });
    expect(result.doctor).toEqual({
      name: 'Dr. Schmidt',
      phone: '030-12345',
    });
  });

  it('extracts insurer from offlabel-antrag', () => {
    const formData = {
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        birthDate: BIRTH_DATE,
        streetAndNumber: STREET_PATIENT,
        postalCode: '12345',
        city: 'Berlin',
        insuranceNumber: 'A123456789',
      },
      doctor: {
        name: DOCTOR_NAME,
        title: 'Dr.',
        gender: 'Herr',
        practice: PRACTICE_NAME,
        streetAndNumber: STREET_DOCTOR,
        postalCode: '54321',
        city: 'München',
      },
      insurer: {
        name: 'AOK',
        department: 'Leistungsabteilung',
        streetAndNumber: 'Kassenstr. 10',
        postalCode: '11111',
        city: 'Hamburg',
      },
    };

    const result = extractProfileData(OFFLABEL, formData);

    expect(result.insurer).toEqual({
      name: 'AOK',
      department: 'Leistungsabteilung',
      streetAndNumber: 'Kassenstr. 10',
      postalCode: '11111',
      city: 'Hamburg',
    });
    expect(result.patient?.insuranceNumber).toBe('A123456789');
    expect(result.patient?.birthDate).toBe(BIRTH_DATE);
    expect(result.doctor).toMatchObject({
      name: DOCTOR_NAME,
      title: 'Dr.',
      gender: 'Herr',
    });
  });

  it('ignores empty and whitespace-only values', () => {
    const formData = {
      patient: { firstName: '', lastName: '  ', city: 'Berlin' },
      doctor: { name: '' },
    };

    const result = extractProfileData(DOCTOR_LETTER, formData);

    expect(result.patient).toEqual({ city: 'Berlin' });
    expect(result.doctor).toBeUndefined();
  });

  it('returns undefined categories when sections are missing', () => {
    const result = extractProfileData(DOCTOR_LETTER, {});

    expect(result.patient).toBeUndefined();
    expect(result.doctor).toBeUndefined();
  });
});

describe('applyProfileData', () => {
  it('fills empty fields without overwriting existing values', () => {
    const formData = {
      patient: { firstName: 'Existing', lastName: '' },
      doctor: {},
    };
    const profile = {
      patient: { firstName: 'Profile', lastName: 'Mustermann', city: 'Berlin' },
      doctor: { name: DOCTOR_NAME },
    };

    const result = applyProfileData(DOCTOR_LETTER, formData, profile);

    expect((result.patient as AnyRecord).firstName).toBe('Existing');
    expect((result.patient as AnyRecord).lastName).toBe('Mustermann');
    expect((result.patient as AnyRecord).city).toBe('Berlin');
    expect((result.doctor as AnyRecord).name).toBe(DOCTOR_NAME);
  });

  it('does not overwrite non-empty form fields', () => {
    const formData = {
      doctor: { name: 'My Doctor', phone: '12345' },
    };
    const profile = {
      doctor: { name: 'Profile Doctor', phone: '99999' },
    };

    const result = applyProfileData(NOTFALLPASS, formData, profile);

    expect((result.doctor as AnyRecord).name).toBe('My Doctor');
    expect((result.doctor as AnyRecord).phone).toBe('12345');
  });

  it('splits fullName into firstName/lastName for doctor-letter', () => {
    const formData = { patient: {} };
    const profile = {
      patient: { fullName: 'Anna Maria Schmidt' },
    };

    const result = applyProfileData(DOCTOR_LETTER, formData, profile);

    expect((result.patient as AnyRecord).firstName).toBe('Anna Maria');
    expect((result.patient as AnyRecord).lastName).toBe('Schmidt');
  });

  it('splits single-token fullName correctly', () => {
    const formData = { patient: {} };
    const profile = {
      patient: { fullName: 'Mustermann' },
    };

    const result = applyProfileData(DOCTOR_LETTER, formData, profile);

    expect((result.patient as AnyRecord).firstName).toBeUndefined();
    expect((result.patient as AnyRecord).lastName).toBe('Mustermann');
  });

  it('fills firstName and lastName for notfallpass', () => {
    const formData = { person: {} };
    const profile = {
      patient: { firstName: 'Max', lastName: 'Mustermann' },
    };

    const result = applyProfileData(NOTFALLPASS, formData, profile);

    expect((result.person as AnyRecord).firstName).toBe('Max');
    expect((result.person as AnyRecord).lastName).toBe('Mustermann');
  });

  it('does not split fullName when firstName/lastName already exist in profile', () => {
    const formData = { patient: {} };
    const profile = {
      patient: {
        fullName: 'Should Ignore',
        firstName: 'Max',
        lastName: 'Mustermann',
      },
    };

    const result = applyProfileData(DOCTOR_LETTER, formData, profile);

    expect((result.patient as AnyRecord).firstName).toBe('Max');
    expect((result.patient as AnyRecord).lastName).toBe('Mustermann');
  });

  it('creates missing sections in form data', () => {
    const formData = {};
    const profile = {
      doctor: { name: DOCTOR_NAME, phone: '030-12345' },
    };

    const result = applyProfileData(NOTFALLPASS, formData, profile);

    expect((result.doctor as AnyRecord).name).toBe(DOCTOR_NAME);
    expect((result.doctor as AnyRecord).phone).toBe('030-12345');
  });

  it('applies insurer fields for offlabel-antrag', () => {
    const formData = { insurer: { name: '' } };
    const profile = {
      insurer: { name: 'AOK', department: 'Abt. X', city: 'Hamburg' },
    };

    const result = applyProfileData(OFFLABEL, formData, profile);

    expect((result.insurer as AnyRecord).name).toBe('AOK');
    expect((result.insurer as AnyRecord).department).toBe('Abt. X');
    expect((result.insurer as AnyRecord).city).toBe('Hamburg');
  });

  it('does not modify the original formData object', () => {
    const formData = { patient: { firstName: 'Original' } };
    const profile = { patient: { lastName: 'Added' } };

    const result = applyProfileData(DOCTOR_LETTER, formData, profile);

    expect(result).not.toBe(formData);
    expect((formData.patient as AnyRecord).lastName).toBeUndefined();
    expect((result.patient as AnyRecord).lastName).toBe('Added');
  });
});

describe('hasUsableProfileData', () => {
  it('returns false for empty profile', () => {
    expect(hasUsableProfileData({})).toBe(false);
  });

  it('returns false for whitespace-only values', () => {
    expect(hasUsableProfileData({ patient: { firstName: '  ' } })).toBe(false);
  });

  it('returns true when at least one field has a value', () => {
    expect(hasUsableProfileData({ doctor: { name: 'Dr. Test' } })).toBe(true);
  });

  it('returns false for empty category objects', () => {
    expect(hasUsableProfileData({ patient: {}, doctor: {} })).toBe(false);
  });
});
