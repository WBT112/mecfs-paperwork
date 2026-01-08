import type { SupportedLocale } from '../i18n/locale';

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
