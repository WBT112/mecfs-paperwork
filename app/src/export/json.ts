import appPackage from '../../package.json';
import type { RJSFSchema } from '@rjsf/utils';
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
  schema?: RJSFSchema;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const buildIsoDate = (
  year: number,
  month: number,
  day: number,
): string | null => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const normalizeDateString = (value: string): string => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const ymdSlash = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymdSlash) {
    const iso = buildIsoDate(
      Number(ymdSlash[1]),
      Number(ymdSlash[2]),
      Number(ymdSlash[3]),
    );
    return iso ?? value;
  }

  const dmyDot = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmyDot) {
    const iso = buildIsoDate(
      Number(dmyDot[3]),
      Number(dmyDot[2]),
      Number(dmyDot[1]),
    );
    return iso ?? value;
  }

  return value;
};

// Normalize date-formatted fields to YYYY-MM-DD for export compatibility.
const normalizeSchemaDates = (
  schema: RJSFSchema | boolean | undefined,
  value: unknown,
): unknown => {
  if (!schema || typeof schema !== 'object') {
    return value;
  }

  let normalized = value;

  if (schema.format === 'date' && typeof normalized === 'string') {
    normalized = normalizeDateString(normalized);
  }

  if (schema.items && Array.isArray(normalized)) {
    const itemSchema = schema.items as RJSFSchema | boolean;
    normalized = normalized.map((entry) =>
      normalizeSchemaDates(itemSchema, entry),
    );
  }

  if (schema.properties && isRecord(normalized)) {
    const updated: Record<string, unknown> = { ...normalized };
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      if (!Object.prototype.hasOwnProperty.call(updated, key)) {
        continue;
      }
      updated[key] = normalizeSchemaDates(
        propertySchema as RJSFSchema | boolean,
        updated[key],
      );
    }
    normalized = updated;
  }

  if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf) {
      normalized = normalizeSchemaDates(
        entry as RJSFSchema | boolean,
        normalized,
      );
    }
  }

  return normalized;
};

const normalizeExportData = (
  schema: RJSFSchema | undefined,
  data: Record<string, unknown>,
): Record<string, unknown> => {
  if (!schema) {
    return data;
  }
  const normalized = normalizeSchemaDates(schema, data);
  return isRecord(normalized) ? normalized : data;
};

/**
 * Build the JSON export payload for a record backup.
 */
export const buildJsonExportPayload = (
  options: JsonExportOptions,
): JsonExportPayload => {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const normalizedData = normalizeExportData(options.schema, options.data);
  const revisions = options.revisions?.length
    ? options.revisions.map((revision) => ({
        id: revision.id,
        label: revision.label,
        createdAt: revision.createdAt,
        data: normalizeExportData(options.schema, revision.data),
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
      data: normalizedData,
    },
    locale: options.locale,
    exportedAt,
    data: normalizedData,
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
