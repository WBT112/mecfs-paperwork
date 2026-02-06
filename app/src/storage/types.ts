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
