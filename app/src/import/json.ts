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

export type ImportErrorCode =
  | 'invalid_json'
  | 'invalid_payload'
  | 'unknown_formpack'
  | 'formpack_mismatch'
  | 'schema_mismatch'
  | 'invalid_revisions'
  | 'unsupported_locale';

export type ImportError = {
  code: ImportErrorCode;
  message?: string;
};

export type ImportValidationResult =
  | { payload: JsonImportPayload; error: null }
  | { payload: null; error: ImportError };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (
  value: string,
): { payload: unknown } | { error: 'invalid_json'; message: string } => {
  const normalized = value.replace(/^\uFEFF/, '').trimStart();
  if (!normalized) {
    return { error: 'invalid_json', message: 'The file is empty.' };
  }
  try {
    return { payload: JSON.parse(normalized) as unknown };
  } catch (e) {
    console.error('JSON parsing failed:', e);
    const message = 'The file is not a valid JSON file.';
    return { error: 'invalid_json', message };
  }
};

const normalizeRevisionEntry = (
  entry: unknown,
): ImportRevisionPayload | 'invalid_revisions' => {
  if (!isRecord(entry) || !isRecord(entry.data)) {
    return 'invalid_revisions';
  }

  const label = entry.label;
  if (label !== undefined && typeof label !== 'string') {
    return 'invalid_revisions';
  }

  const createdAt = entry.createdAt;
  if (createdAt !== undefined && typeof createdAt !== 'string') {
    return 'invalid_revisions';
  }

  return {
    label: typeof label === 'string' ? label : undefined,
    data: entry.data,
    createdAt: typeof createdAt === 'string' ? createdAt : undefined,
  };
};

export const normalizeExportRevisions = (
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
    const normalizedEntry = normalizeRevisionEntry(entry);
    if (normalizedEntry === 'invalid_revisions') {
      return 'invalid_revisions';
    }
    normalized.push(normalizedEntry);
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

type ValidationOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; error: ImportErrorCode };

const getInvalidResult = (code: ImportErrorCode): ImportValidationResult => ({
  payload: null,
  error: { code },
});

const validateAppMetadata = (
  app: unknown,
): ValidationOutcome<ImportAppMetadata | undefined> => {
  if (app === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(app) || typeof app.id !== 'string') {
    return { ok: false, error: 'invalid_payload' };
  }

  const metadata: ImportAppMetadata = { id: app.id };
  if (typeof app.version === 'string') {
    metadata.version = app.version;
  }
  return { ok: true, value: metadata };
};

const validateFormpackMetadata = (
  formpack: unknown,
  expectedFormpackId: string,
): ValidationOutcome<ImportFormpackMetadata> => {
  if (!isRecord(formpack) || typeof formpack.id !== 'string') {
    return { ok: false, error: 'invalid_payload' };
  }

  if (!FORMPACK_IDS.includes(formpack.id as (typeof FORMPACK_IDS)[number])) {
    return { ok: false, error: 'unknown_formpack' };
  }

  if (formpack.id !== expectedFormpackId) {
    return { ok: false, error: 'formpack_mismatch' };
  }

  const metadata: ImportFormpackMetadata = { id: formpack.id };
  if (typeof formpack.version === 'string') {
    metadata.version = formpack.version;
  }
  return { ok: true, value: metadata };
};

const resolveRecordData = (
  payload: Record<string, unknown>,
  record: unknown,
): ValidationOutcome<Record<string, unknown>> => {
  let recordData: unknown = payload.data;
  if (recordData === undefined && isRecord(record) && 'data' in record) {
    recordData = record.data;
  }

  if (!isRecord(recordData)) {
    return { ok: false, error: 'invalid_payload' };
  }

  return { ok: true, value: recordData };
};

const resolveLocale = (
  payload: Record<string, unknown>,
  record: unknown,
): ValidationOutcome<SupportedLocale> => {
  let localeValue: unknown = payload.locale;
  if (localeValue === undefined && isRecord(record) && 'locale' in record) {
    localeValue = record.locale;
  }

  if (localeValue === undefined) {
    return { ok: false, error: 'invalid_payload' };
  }

  if (typeof localeValue !== 'string' || !isSupportedLocale(localeValue)) {
    return { ok: false, error: 'unsupported_locale' };
  }

  return { ok: true, value: localeValue };
};

const resolveRecordTitle = (
  record: unknown,
): ValidationOutcome<string | undefined> => {
  if (record === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(record)) {
    return { ok: false, error: 'invalid_payload' };
  }

  if (record.title !== undefined && typeof record.title !== 'string') {
    return { ok: false, error: 'invalid_payload' };
  }

  if (record.name !== undefined && typeof record.name !== 'string') {
    return { ok: false, error: 'invalid_payload' };
  }

  const title = record.title;
  if (typeof title === 'string') {
    return { ok: true, value: title };
  }
  const name = record.name;
  return { ok: true, value: typeof name === 'string' ? name : undefined };
};

const normalizeExportPayload = (
  payload: Record<string, unknown>,
  schema: RJSFSchema,
  expectedFormpackId: string,
): ImportValidationResult => {
  const appResult = validateAppMetadata(payload.app);
  if (!appResult.ok) {
    return getInvalidResult(appResult.error);
  }

  const formpackResult = validateFormpackMetadata(
    payload.formpack,
    expectedFormpackId,
  );
  if (!formpackResult.ok) {
    return getInvalidResult(formpackResult.error);
  }

  const record = payload.record;
  const recordDataResult = resolveRecordData(payload, record);
  if (!recordDataResult.ok) {
    return getInvalidResult(recordDataResult.error);
  }

  const localeResult = resolveLocale(payload, record);
  if (!localeResult.ok) {
    return getInvalidResult(localeResult.error);
  }

  const recordTitleResult = resolveRecordTitle(record);
  if (!recordTitleResult.ok) {
    return getInvalidResult(recordTitleResult.error);
  }

  const revisions = normalizeExportRevisions(payload.revisions);
  if (revisions === 'invalid_revisions') {
    return getInvalidResult('invalid_revisions');
  }

  const normalizedData = applySchemaDefaults(schema, recordDataResult.value);
  const isValid = validateSchema(schema, normalizedData);
  if (!isValid) {
    return getInvalidResult('schema_mismatch');
  }

  const normalizedPayload: JsonImportPayload = migrateExport({
    version: 1,
    formpack: {
      id: formpackResult.value.id,
      version:
        typeof formpackResult.value.version === 'string'
          ? formpackResult.value.version
          : undefined,
    },
    record: {
      title: recordTitleResult.value,
      locale: localeResult.value,
      data: normalizedData,
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
    return {
      payload: null,
      error: { code: parsed.error, message: parsed.message },
    };
  }

  if (!isRecord(parsed.payload)) {
    return { payload: null, error: { code: 'invalid_payload' } };
  }

  return normalizeExportPayload(parsed.payload, schema, expectedFormpackId);
};
