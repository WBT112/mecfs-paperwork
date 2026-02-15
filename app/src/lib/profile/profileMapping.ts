import type { FormpackId } from '../../formpacks/registry';
import type { ProfileData } from '../../storage/types';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

const getString = (
  obj: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = obj[key];
  return isNonEmptyString(value) ? value : undefined;
};

/**
 * Splits a full name into firstName and lastName.
 * Last whitespace-separated token → lastName, rest → firstName.
 * Single token → lastName only.
 */
export const splitFullName = (
  fullName: string,
): { firstName?: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { lastName: parts[0] ?? '' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1)!,
  };
};

const extractCategory = (
  formData: Record<string, unknown>,
  section: string,
  fields: readonly string[],
): Record<string, string> | undefined => {
  const raw = formData[section];
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const result: Record<string, string> = {};
  let hasValue = false;

  for (const field of fields) {
    const value = getString(obj, field);
    if (value !== undefined) {
      result[field] = value;
      hasValue = true;
    }
  }

  return hasValue ? result : undefined;
};

const PATIENT_FIELDS_WITH_ADDRESS = [
  'firstName',
  'lastName',
  'birthDate',
  'streetAndNumber',
  'postalCode',
  'city',
  'insuranceNumber',
] as const;

const PATIENT_FIELDS_BASIC = [
  'firstName',
  'lastName',
  'streetAndNumber',
  'postalCode',
  'city',
] as const;

const DOCTOR_FIELDS_FULL = [
  'name',
  'title',
  'gender',
  'practice',
  'streetAndNumber',
  'postalCode',
  'city',
] as const;

const DOCTOR_FIELDS_ADDRESS = [
  'name',
  'practice',
  'streetAndNumber',
  'postalCode',
  'city',
] as const;

const INSURER_FIELDS = [
  'name',
  'department',
  'streetAndNumber',
  'postalCode',
  'city',
] as const;

const extractNotfallpass = (formData: Record<string, unknown>): ProfileData => {
  const person = formData.person as Record<string, unknown> | undefined;
  const doctor = formData.doctor as Record<string, unknown> | undefined;

  const patientData: ProfileData['patient'] = {};
  let hasPatient = false;

  if (person && isNonEmptyString(person.name)) {
    patientData.fullName = person.name;
    hasPatient = true;
  }
  if (person && isNonEmptyString(person.birthDate)) {
    patientData.birthDate = person.birthDate;
    hasPatient = true;
  }

  const doctorData: ProfileData['doctor'] = {};
  let hasDoctor = false;

  if (doctor && isNonEmptyString(doctor.name)) {
    doctorData.name = doctor.name;
    hasDoctor = true;
  }
  if (doctor && isNonEmptyString(doctor.phone)) {
    doctorData.phone = doctor.phone;
    hasDoctor = true;
  }

  return {
    patient: hasPatient ? patientData : undefined,
    doctor: hasDoctor ? doctorData : undefined,
  };
};

export const extractProfileData = (
  formpackId: FormpackId,
  formData: Record<string, unknown>,
): ProfileData => {
  switch (formpackId) {
    case 'doctor-letter': {
      return {
        patient: extractCategory(
          formData,
          'patient',
          PATIENT_FIELDS_BASIC,
        ) as ProfileData['patient'],
        doctor: extractCategory(
          formData,
          'doctor',
          DOCTOR_FIELDS_FULL,
        ) as ProfileData['doctor'],
      };
    }
    case 'offlabel-antrag': {
      return {
        patient: extractCategory(
          formData,
          'patient',
          PATIENT_FIELDS_WITH_ADDRESS,
        ) as ProfileData['patient'],
        doctor: extractCategory(
          formData,
          'doctor',
          DOCTOR_FIELDS_ADDRESS,
        ) as ProfileData['doctor'],
        insurer: extractCategory(
          formData,
          'insurer',
          INSURER_FIELDS,
        ) as ProfileData['insurer'],
      };
    }
    case 'notfallpass': {
      return extractNotfallpass(formData);
    }
  }
};

/**
 * Sets a field on `target[section][field]` only if the current value is empty.
 */
const fillEmpty = (
  target: Record<string, unknown>,
  section: string,
  field: string,
  value: string | undefined,
): void => {
  if (!isNonEmptyString(value)) {
    return;
  }
  if (typeof target[section] !== 'object' || target[section] === null) {
    target[section] = {};
  }
  const obj = target[section] as Record<string, unknown>;
  if (!isNonEmptyString(obj[field])) {
    obj[field] = value;
  }
};

const applyCategory = (
  target: Record<string, unknown>,
  section: string,
  fields: readonly string[],
  profileCategory: Record<string, string | undefined> | undefined,
): void => {
  if (!profileCategory) {
    return;
  }
  for (const field of fields) {
    fillEmpty(target, section, field, profileCategory[field]);
  }
};

export const applyProfileData = (
  formpackId: FormpackId,
  formData: Record<string, unknown>,
  profile: ProfileData,
): Record<string, unknown> => {
  const result = structuredClone(formData);

  switch (formpackId) {
    case 'doctor-letter': {
      const patient = profile.patient;
      applyCategory(result, 'patient', PATIENT_FIELDS_BASIC, patient);

      // fullName → firstName/lastName split
      if (patient?.fullName && !patient.firstName && !patient.lastName) {
        const { firstName, lastName } = splitFullName(patient.fullName);
        fillEmpty(result, 'patient', 'lastName', lastName);
        fillEmpty(result, 'patient', 'firstName', firstName);
      }

      applyCategory(result, 'doctor', DOCTOR_FIELDS_FULL, profile.doctor);
      break;
    }
    case 'offlabel-antrag': {
      const patient = profile.patient;
      applyCategory(result, 'patient', PATIENT_FIELDS_WITH_ADDRESS, patient);

      if (patient?.fullName && !patient.firstName && !patient.lastName) {
        const { firstName, lastName } = splitFullName(patient.fullName);
        fillEmpty(result, 'patient', 'lastName', lastName);
        fillEmpty(result, 'patient', 'firstName', firstName);
      }

      applyCategory(result, 'doctor', DOCTOR_FIELDS_ADDRESS, profile.doctor);
      applyCategory(result, 'insurer', INSURER_FIELDS, profile.insurer);
      break;
    }
    case 'notfallpass': {
      const patient = profile.patient;

      // firstName + lastName → fullName concatenation
      if (patient) {
        let fullName = patient.fullName;
        if (!fullName && (patient.firstName ?? patient.lastName)) {
          fullName = [patient.firstName, patient.lastName]
            .filter(Boolean)
            .join(' ');
        }
        fillEmpty(result, 'person', 'name', fullName);
        fillEmpty(result, 'person', 'birthDate', patient.birthDate);
      }

      if (profile.doctor) {
        fillEmpty(result, 'doctor', 'name', profile.doctor.name);
        fillEmpty(result, 'doctor', 'phone', profile.doctor.phone);
      }
      break;
    }
  }

  return result;
};
