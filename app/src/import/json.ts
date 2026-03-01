import Ajv, { type Options as AjvOptions } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { RJSFSchema } from '@rjsf/utils';
import { isSupportedLocale, type SupportedLocale } from '../i18n/locale';
import { FORMPACK_IDS } from '../formpacks/registry';
import { isRecord } from '../lib/utils';

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

type OptionalRjsfSchema = RJSFSchema | boolean | undefined;

/** Maximum accepted import size (10 MB). */
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const IMPORT_SIZE_ENCODER = new TextEncoder();

/** Maximum nesting depth for recursive schema operations. */
const MAX_SCHEMA_DEPTH = 50;

const parseJson = (
  value: string,
): { payload: unknown } | { error: 'invalid_json'; message: string } => {
  if (IMPORT_SIZE_ENCODER.encode(value).byteLength > MAX_IMPORT_BYTES) {
    return {
      error: 'invalid_json',
      message: 'The file exceeds the 10 MB size limit.',
    };
  }
  const normalized = value.replace(/^\uFEFF/, '').trimStart();
  if (!normalized) {
    return { error: 'invalid_json', message: 'The file is empty.' };
  }
  try {
    return { payload: JSON.parse(normalized) as unknown };
  } catch {
    // PRIVACY: Do not log the error object 'e' as JSON.parse error messages
    // often contain snippets of the input data, which could be sensitive.
    console.error('JSON parsing failed.');
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

const makeLenientSubschema = (
  schema: OptionalRjsfSchema,
  depth: number,
): OptionalRjsfSchema => {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  return makeLenientSchema(schema, depth + 1);
};

const makeLenientSubschemaArray = (
  schemas: unknown,
  depth: number,
): unknown => {
  if (!Array.isArray(schemas)) {
    return schemas;
  }
  return schemas.map((entry) =>
    makeLenientSubschema(entry as OptionalRjsfSchema, depth),
  );
};

// Create a lenient version of schema for import validation.
// Removes strict presence/length constraints recursively so older or partial
// exports stay importable after schema evolution.
const makeLenientSchema = (schema: RJSFSchema, depth = 0): RJSFSchema => {
  if (depth > MAX_SCHEMA_DEPTH) {
    return schema;
  }

  const lenient: RJSFSchema = { ...schema };

  delete lenient.required;
  delete lenient.enum;
  delete lenient.const;
  delete lenient.format;
  delete lenient.pattern;
  delete lenient.minLength;
  delete lenient.maxLength;
  delete lenient.minItems;
  delete lenient.maxItems;
  delete lenient.minProperties;
  delete lenient.maxProperties;

  if (lenient.properties && typeof lenient.properties === 'object') {
    const properties = { ...lenient.properties } as Record<string, unknown>;
    for (const key of Object.keys(properties)) {
      properties[key] = makeLenientSubschema(
        properties[key] as OptionalRjsfSchema,
        depth,
      );
    }
    lenient.properties = properties as NonNullable<RJSFSchema['properties']>;
  }

  if (Array.isArray(lenient.items)) {
    lenient.items = lenient.items.map((entry) =>
      makeLenientSubschema(entry as OptionalRjsfSchema, depth),
    ) as unknown as RJSFSchema['items'];
  } else {
    lenient.items = makeLenientSubschema(
      lenient.items as OptionalRjsfSchema,
      depth,
    ) as RJSFSchema['items'];
  }

  lenient.additionalProperties = makeLenientSubschema(
    lenient.additionalProperties as OptionalRjsfSchema,
    depth,
  ) as RJSFSchema['additionalProperties'];
  lenient.not = makeLenientSubschema(
    lenient.not as OptionalRjsfSchema,
    depth,
  ) as RJSFSchema['not'];
  lenient.if = makeLenientSubschema(
    lenient.if as OptionalRjsfSchema,
    depth,
  ) as RJSFSchema['if'];
  const lenientRecord = lenient as Record<string, unknown>;
  const thenSubschema = makeLenientSubschema(
    lenientRecord['then'] as OptionalRjsfSchema,
    depth,
  ) as RJSFSchema['then'];
  if (thenSubschema === undefined) {
    delete lenientRecord['then'];
  } else {
    Reflect.set(lenientRecord, 'then', thenSubschema as unknown);
  }
  lenient.else = makeLenientSubschema(
    lenient.else as OptionalRjsfSchema,
    depth,
  ) as RJSFSchema['else'];
  lenient.allOf = makeLenientSubschemaArray(lenient.allOf, depth) as
    | RJSFSchema['allOf']
    | undefined;
  lenient.anyOf = makeLenientSubschemaArray(lenient.anyOf, depth) as
    | RJSFSchema['anyOf']
    | undefined;
  lenient.oneOf = makeLenientSubschemaArray(lenient.oneOf, depth) as
    | RJSFSchema['oneOf']
    | undefined;
  if (lenient.$defs && typeof lenient.$defs === 'object') {
    const defs = { ...lenient.$defs } as Record<string, unknown>;
    for (const key of Object.keys(defs)) {
      defs[key] = makeLenientSubschema(defs[key] as OptionalRjsfSchema, depth);
    }
    lenient.$defs = defs as NonNullable<RJSFSchema['$defs']>;
  }

  return lenient;
};

const resolveSchemaDefaultValue = (schema: OptionalRjsfSchema): unknown => {
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  // Don't auto-default enum fields - they need explicit user selection
  if (schema.enum !== undefined) {
    return undefined;
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

// Remove readOnly fields that shouldn't be imported (they are auto-generated)
const removeReadOnlyFields = (
  schema: RJSFSchema,
  data: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> => {
  if (depth > MAX_SCHEMA_DEPTH || !schema.properties) {
    return data;
  }

  const normalized = { ...data };
  const properties = schema.properties as Record<string, unknown>;

  for (const key of Object.keys(normalized)) {
    const propertySchema = properties[key] as OptionalRjsfSchema;
    if (!propertySchema || typeof propertySchema !== 'object') {
      continue;
    }

    // Remove readOnly fields from import data
    if (propertySchema.readOnly === true) {
      delete normalized[key];
      continue;
    }

    // Recursively handle nested objects
    if (propertySchema.type === 'object' && isRecord(normalized[key])) {
      normalized[key] = removeReadOnlyFields(
        propertySchema,
        normalized[key],
        depth + 1,
      );
    }
  }

  return normalized;
};

const getFirstItemSchema = (
  schema: RJSFSchema,
): OptionalRjsfSchema | undefined => {
  if (Array.isArray(schema.items)) {
    return schema.items[0] as OptionalRjsfSchema;
  }
  return schema.items as OptionalRjsfSchema;
};

// Remove unknown fields when schema disallows additional properties.
// This keeps imports compatible with older exports after schema evolution.
const removeUnknownSchemaFields = (
  schema: RJSFSchema,
  data: unknown,
  depth = 0,
): unknown => {
  if (depth > MAX_SCHEMA_DEPTH) {
    return data;
  }

  if (Array.isArray(data)) {
    const itemSchema = getFirstItemSchema(schema);
    if (!itemSchema || typeof itemSchema !== 'object') {
      return data;
    }
    return data.map((item) =>
      removeUnknownSchemaFields(itemSchema, item, depth + 1),
    );
  }

  if (!isRecord(data)) {
    return data;
  }

  if (!schema.properties) {
    return data;
  }

  const properties = schema.properties as Record<string, unknown>;
  const allowsAdditionalProperties = schema.additionalProperties === true;
  const normalized: Record<string, unknown> = allowsAdditionalProperties
    ? { ...data }
    : {};

  for (const [key, value] of Object.entries(data)) {
    const propertySchema = properties[key] as OptionalRjsfSchema;
    if (!propertySchema || typeof propertySchema !== 'object') {
      if (allowsAdditionalProperties) {
        normalized[key] = value;
      }
      continue;
    }

    normalized[key] = removeUnknownSchemaFields(
      propertySchema,
      value,
      depth + 1,
    );
  }

  return normalized;
};

// Ensure required fields exist when older exports omit empty values.
// Recursively applies defaults to nested objects.
// Helper: Add defaults for missing required fields
const addRequiredDefaults = (
  schema: RJSFSchema,
  normalized: Record<string, unknown>,
): void => {
  if (!Array.isArray(schema.required) || !schema.properties) {
    return;
  }

  for (const key of schema.required) {
    if (typeof key !== 'string') {
      continue;
    }

    if (Object.hasOwn(normalized, key)) {
      continue;
    }

    const propertySchema = (schema.properties as Record<string, unknown>)[
      key
    ] as OptionalRjsfSchema;
    const defaultValue = resolveSchemaDefaultValue(propertySchema);
    if (defaultValue !== undefined) {
      normalized[key] = defaultValue;
    }
  }
};

// Helper: Recursively apply defaults to nested objects
const applyNestedDefaults = (
  schema: RJSFSchema,
  normalized: Record<string, unknown>,
  depth: number,
): void => {
  const properties = schema.properties as Record<string, unknown>;

  for (const key of Object.keys(normalized)) {
    const propertySchema = properties[key] as OptionalRjsfSchema;

    if (
      propertySchema &&
      typeof propertySchema === 'object' &&
      propertySchema.type === 'object' &&
      isRecord(normalized[key])
    ) {
      normalized[key] = applySchemaDefaults(
        propertySchema,
        normalized[key],
        depth + 1,
      );
    }
  }
};

const applySchemaDefaults = (
  schema: RJSFSchema,
  data: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> => {
  if (depth > MAX_SCHEMA_DEPTH || !schema.properties) {
    return data;
  }

  const normalized = { ...data };

  // Add defaults for missing required fields
  addRequiredDefaults(schema, normalized);

  // Recursively apply defaults to nested objects
  applyNestedDefaults(schema, normalized, depth);

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

  // Remove readOnly fields before validation (they're auto-generated, not user input)
  const withoutReadOnly = removeReadOnlyFields(schema, recordDataResult.value);
  const withoutUnknownFields = removeUnknownSchemaFields(
    schema,
    withoutReadOnly,
  );
  const normalizedData = applySchemaDefaults(
    schema,
    withoutUnknownFields as Record<string, unknown>,
  );

  // Use lenient schema for import validation (allows partial/incomplete data)
  const lenientSchema = makeLenientSchema(schema);
  const isValid = validateSchema(lenientSchema, normalizedData);
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
 * Migration hook for JSON export format evolution.
 * Keep this pure so imports remain deterministic and testable.
 */
export const migrateExport = (payload: JsonImportPayload): JsonImportPayload =>
  payload;

/**
 * Parses and validates JSON import payloads for a formpack.
 * SECURITY: returns structured error codes and avoids exposing raw payload data.
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
