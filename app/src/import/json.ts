import Ajv, { type Options as AjvOptions } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { RJSFSchema } from '@rjsf/utils';
import { isSupportedLocale, type SupportedLocale } from '../i18n/locale';
import { FORMPACK_IDS } from '../formpacks/registry';

type ImportFormpackMetadata = {
  id: string;
  version?: string;
};

type ImportAppMetadata = {
  id: string;
  version?: string;
};

export type ImportRecordPayload = {
  title?: string;
  locale: SupportedLocale;
  data: Record<string, unknown>;
};

export type ImportRevisionPayload = {
  label?: string;
  data: Record<string, unknown>;
  createdAt?: string;
};

export type JsonImportPayload = {
  version: number;
  formpack: ImportFormpackMetadata;
  record: ImportRecordPayload;
  revisions?: ImportRevisionPayload[];
};

type ExportRecordMetadata = {
  id?: string;
  name?: string;
  updatedAt?: string;
  locale?: SupportedLocale;
  data?: Record<string, unknown>;
};

type ExportRevisionPayload = {
  id?: string;
  label?: string;
  createdAt?: string;
  data: Record<string, unknown>;
};

type JsonExportContainer = {
  app?: ImportAppMetadata;
  formpack?: ImportFormpackMetadata;
  record?: ExportRecordMetadata;
  locale?: SupportedLocale;
  createdAt?: string;
  exportedAt?: string;
  data?: unknown;
  revisions?: ExportRevisionPayload[];
};

export type ImportErrorCode =
  | 'invalid_json'
  | 'invalid_payload'
  | 'unknown_formpack'
  | 'formpack_mismatch'
  | 'schema_mismatch'
  | 'invalid_revisions'
  | 'unsupported_locale';

export type ImportValidationResult =
  | { payload: JsonImportPayload; error: null }
  | { payload: null; error: ImportErrorCode };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (
  value: string,
): { payload: unknown } | { error: 'invalid_json' } => {
  const normalized = value.replace(/^\uFEFF/, '').trimStart();
  if (!normalized) {
    return { error: 'invalid_json' };
  }
  try {
    return { payload: JSON.parse(normalized) as unknown };
  } catch {
    return { error: 'invalid_json' };
  }
};

const normalizeExportRevisions = (
  revisions: unknown,
): ImportRevisionPayload[] | 'invalid_revisions' => {
  if (revisions === undefined) {
    return [];
  }

  if (!Array.isArray(revisions)) {
    return 'invalid_revisions';
  }

  const normalized: ImportRevisionPayload[] = [];
  for (const entry of revisions) {
    if (!isRecord(entry) || !isRecord(entry.data)) {
      return 'invalid_revisions';
    }

    if (entry.label !== undefined && typeof entry.label !== 'string') {
      return 'invalid_revisions';
    }

    if (entry.createdAt !== undefined && typeof entry.createdAt !== 'string') {
      return 'invalid_revisions';
    }

    normalized.push({
      label: entry.label as string | undefined,
      data: entry.data,
      createdAt: entry.createdAt as string | undefined,
    });
  }

  return normalized;
};

const validateSchema = (schema: RJSFSchema, data: unknown): boolean => {
  // Use Ajv 2020 for formpack schemas that declare draft 2020-12.
  const ajvOptions: AjvOptions & { strict?: boolean } = {
    allErrors: true,
    strict: false,
  };
  const ajv = new Ajv(ajvOptions);
  // Enable standard JSON Schema formats like "date".
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return validate(data);
};

const resolveSchemaDefaultValue = (
  schema: RJSFSchema | boolean | undefined,
): unknown => {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return '';
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return undefined;
  }
};

// Ensure required top-level fields exist when older exports omit empty values.
const applySchemaDefaults = (
  schema: RJSFSchema,
  data: Record<string, unknown>,
): Record<string, unknown> => {
  if (!Array.isArray(schema.required) || !schema.properties) {
    return data;
  }

  const normalized = { ...data };
  for (const key of schema.required) {
    if (typeof key !== 'string') {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(normalized, key)) {
      continue;
    }

    const propertySchema = (schema.properties as Record<string, unknown>)[
      key
    ] as RJSFSchema | boolean | undefined;
    const defaultValue = resolveSchemaDefaultValue(propertySchema);
    if (defaultValue !== undefined) {
      normalized[key] = defaultValue;
    }
  }

  return normalized;
};

const normalizeExportPayload = (
  payload: Record<string, unknown>,
  schema: RJSFSchema,
  expectedFormpackId: string,
): ImportValidationResult => {
  const app = payload.app;
  const formpack = payload.formpack;
  const record = payload.record;

  if (app !== undefined) {
    if (!isRecord(app) || typeof app.id !== 'string') {
      return { payload: null, error: 'invalid_payload' };
    }
  }

  if (!isRecord(formpack) || typeof formpack.id !== 'string') {
    return { payload: null, error: 'invalid_payload' };
  }

  if (!FORMPACK_IDS.includes(formpack.id as (typeof FORMPACK_IDS)[number])) {
    return { payload: null, error: 'unknown_formpack' };
  }

  if (formpack.id !== expectedFormpackId) {
    return { payload: null, error: 'formpack_mismatch' };
  }

  let recordData: unknown = payload.data;
  if (recordData === undefined && isRecord(record) && 'data' in record) {
    recordData = record.data;
  }

  if (recordData === undefined || recordData === null) {
    return { payload: null, error: 'invalid_payload' };
  }

  if (!isRecord(recordData)) {
    return { payload: null, error: 'invalid_payload' };
  }

  let localeValue: unknown = payload.locale;
  if (localeValue === undefined && isRecord(record) && 'locale' in record) {
    localeValue = record.locale;
  }

  if (localeValue === undefined) {
    return { payload: null, error: 'invalid_payload' };
  }

  if (typeof localeValue !== 'string' || !isSupportedLocale(localeValue)) {
    return { payload: null, error: 'unsupported_locale' };
  }

  void payload.createdAt;
  void payload.exportedAt;

  let recordTitle: string | undefined;
  if (record !== undefined) {
    if (!isRecord(record)) {
      return { payload: null, error: 'invalid_payload' };
    }

    if (record.title !== undefined && typeof record.title !== 'string') {
      return { payload: null, error: 'invalid_payload' };
    }

    if (record.name !== undefined && typeof record.name !== 'string') {
      return { payload: null, error: 'invalid_payload' };
    }

    recordTitle =
      (record.title as string | undefined) ??
      (record.name as string | undefined);
  }

  const revisions = normalizeExportRevisions(payload.revisions);
  if (revisions === 'invalid_revisions') {
    return { payload: null, error: 'invalid_revisions' };
  }

  const normalizedData = applySchemaDefaults(schema, recordData);
  const isValid = validateSchema(schema, normalizedData);
  if (!isValid) {
    return { payload: null, error: 'schema_mismatch' };
  }

  const normalizedPayload: JsonImportPayload = migrateExport({
    version: 1,
    formpack: {
      id: formpack.id,
      version:
        typeof formpack.version === 'string' ? formpack.version : undefined,
    },
    record: {
      title: recordTitle,
      locale: localeValue,
      data: normalizedData as Record<string, unknown>,
    },
    revisions,
  });

  return { payload: normalizedPayload, error: null };
};

/**
 * Migration stub for future JSON export format changes.
 */
export const migrateExport = (payload: JsonImportPayload): JsonImportPayload =>
  payload;

/**
 * Parses and validates JSON import payloads for a formpack.
 */
export const validateJsonImport = (
  rawJson: string,
  schema: RJSFSchema,
  expectedFormpackId: string,
): ImportValidationResult => {
  const parsed = parseJson(rawJson);
  if ('error' in parsed) {
    return { payload: null, error: parsed.error };
  }

  if (!isRecord(parsed.payload)) {
    return { payload: null, error: 'invalid_payload' };
  }

  return normalizeExportPayload(
    parsed.payload as JsonExportContainer,
    schema,
    expectedFormpackId,
  );
};
