import appPackage from '../../package.json';
import type { SupportedLocale } from '../i18n/locale';
import type { FormpackManifest } from '../formpacks/types';
import type { RecordEntry, SnapshotEntry } from '../storage/types';

const APP_ID = 'mecfs-paperwork';
const APP_VERSION = appPackage.version ?? '0.0.0';

export type JsonExportRevision = {
  id: string;
  label?: string;
  createdAt: string;
  data: Record<string, unknown>;
};

export type JsonExportPayload = {
  app: { id: string; version: string };
  formpack: { id: string; version: string };
  record: {
    id: string;
    name?: string;
    updatedAt: string;
    locale: SupportedLocale;
    data: Record<string, unknown>;
  };
  locale: SupportedLocale;
  exportedAt: string;
  data: Record<string, unknown>;
  revisions?: JsonExportRevision[];
};

export type JsonExportOptions = {
  formpack: Pick<FormpackManifest, 'id' | 'version'>;
  record: RecordEntry;
  data: Record<string, unknown>;
  locale: SupportedLocale;
  revisions?: SnapshotEntry[];
  exportedAt?: string;
};

/**
 * Build the JSON export payload for a record backup.
 */
export const buildJsonExportPayload = (
  options: JsonExportOptions,
): JsonExportPayload => {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const revisions = options.revisions?.length
    ? options.revisions.map((revision) => ({
        id: revision.id,
        label: revision.label,
        createdAt: revision.createdAt,
        data: revision.data,
      }))
    : undefined;

  return {
    app: { id: APP_ID, version: APP_VERSION },
    formpack: { id: options.formpack.id, version: options.formpack.version },
    record: {
      id: options.record.id,
      name: options.record.title,
      updatedAt: options.record.updatedAt,
      locale: options.locale,
      data: options.data,
    },
    locale: options.locale,
    exportedAt,
    data: options.data,
    ...(revisions ? { revisions } : {}),
  };
};

const sanitizeFilenameSegment = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]+/g, '');
  return sanitized || 'record';
};

const formatExportDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

/**
 * Build the JSON export filename.
 */
export const buildJsonExportFilename = (payload: JsonExportPayload): string => {
  const recordName = payload.record.name
    ? sanitizeFilenameSegment(payload.record.name)
    : payload.record.id;
  const date = formatExportDate(payload.exportedAt);
  return `${payload.formpack.id}_${recordName}_${date}_${payload.locale}.json`;
};

/**
 * Trigger a download for the JSON export payload.
 */
export const downloadJsonExport = (
  payload: JsonExportPayload,
  filename: string,
): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
