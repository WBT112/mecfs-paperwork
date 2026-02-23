import { isSupportedLocale, type SupportedLocale } from '../i18n/locale';

export const RECORD_ENTRY_KEYS = [
  'id',
  'formpackId',
  'title',
  'locale',
  'data',
  'createdAt',
  'updatedAt',
] as const;

export const SNAPSHOT_ENTRY_KEYS = [
  'id',
  'recordId',
  'label',
  'data',
  'createdAt',
] as const;

export const FORMPACK_META_ENTRY_KEYS = [
  'id',
  'versionOrHash',
  'version',
  'hash',
  'updatedAt',
] as const;

export const PROFILE_ENTRY_KEYS = [
  'id',
  'data',
  'createdAt',
  'updatedAt',
] as const;

/**
 * Persistent record entries stored per formpack.
 */
export type RecordEntry = {
  id: string;
  formpackId: string;
  title?: string;
  locale: SupportedLocale;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Immutable snapshots captured from a record.
 */
export type SnapshotEntry = {
  id: string;
  recordId: string;
  label?: string;
  data: Record<string, unknown>;
  createdAt: string;
};

/**
 * Cached metadata for identifying the currently stored formpack revision.
 */
export type FormpackMetaEntry = {
  id: string;
  versionOrHash: string;
  version?: string;
  hash: string;
  updatedAt: string;
};

/**
 * Reusable patient/doctor/insurer details extracted from form data.
 */
export type ProfileData = {
  patient?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    birthDate?: string;
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
    insuranceNumber?: string;
  };
  doctor?: {
    name?: string;
    title?: string;
    gender?: string;
    practice?: string;
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
    phone?: string;
  };
  insurer?: {
    name?: string;
    department?: string;
    streetAndNumber?: string;
    postalCode?: string;
    city?: string;
  };
};

/**
 * Persistent profile entry for saved details.
 */
export type ProfileEntry = {
  id: string;
  data: ProfileData;
  createdAt: string;
  updatedAt: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isRecordEntry = (value: unknown): value is RecordEntry => {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.formpackId === 'string' &&
    (value.title === undefined || typeof value.title === 'string') &&
    typeof value.locale === 'string' &&
    isSupportedLocale(value.locale) &&
    isPlainObject(value.data) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const isSnapshotEntry = (value: unknown): value is SnapshotEntry => {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.recordId === 'string' &&
    (value.label === undefined || typeof value.label === 'string') &&
    isPlainObject(value.data) &&
    typeof value.createdAt === 'string'
  );
};

export const isFormpackMetaEntry = (
  value: unknown,
): value is FormpackMetaEntry => {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.versionOrHash === 'string' &&
    (value.version === undefined || typeof value.version === 'string') &&
    typeof value.hash === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const isProfileEntry = (value: unknown): value is ProfileEntry => {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    isPlainObject(value.data) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};
