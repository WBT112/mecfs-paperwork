import Ajv, { type Options as AjvOptions } from 'ajv';
import type { RJSFSchema } from '@rjsf/utils';
import { isSupportedLocale, type SupportedLocale } from '../i18n/locale';
import { FORMPACK_IDS } from '../formpacks/registry';

type ImportFormpackMetadata = {
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

export type ImportValidationResult =
  | { payload: JsonImportPayload; error: null }
  | { payload: null; error: ImportErrorCode };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJson = (
  value: string,
): { payload: unknown } | { error: 'invalid_json' } => {
  try {
    return { payload: JSON.parse(value) as unknown };
  } catch {
    return { error: 'invalid_json' };
  }
};

const validateRevisionPayloads = (
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

  const version =
    typeof parsed.payload.version === 'number' ? parsed.payload.version : 1;
  const formpack = parsed.payload.formpack;
  const record = parsed.payload.record;
  const revisions = validateRevisionPayloads(parsed.payload.revisions);

  if (!isRecord(formpack) || typeof formpack.id !== 'string') {
    return { payload: null, error: 'invalid_payload' };
  }

  if (!FORMPACK_IDS.includes(formpack.id as (typeof FORMPACK_IDS)[number])) {
    return { payload: null, error: 'unknown_formpack' };
  }

  if (formpack.id !== expectedFormpackId) {
    return { payload: null, error: 'formpack_mismatch' };
  }

  if (!isRecord(record) || !isRecord(record.data)) {
    return { payload: null, error: 'invalid_payload' };
  }

  const localeValue = record.locale;
  if (typeof localeValue !== 'string' || !isSupportedLocale(localeValue)) {
    return { payload: null, error: 'unsupported_locale' };
  }

  const recordTitleValue = record.title;
  if (recordTitleValue !== undefined && typeof recordTitleValue !== 'string') {
    return { payload: null, error: 'invalid_payload' };
  }
  const recordTitle = recordTitleValue as string | undefined;

  if (revisions === 'invalid_revisions') {
    return { payload: null, error: 'invalid_revisions' };
  }

  // Ajv v6 typings omit `strict`; keep it optional for v8 compatibility.
  const ajvOptions: AjvOptions & { strict?: boolean } = {
    allErrors: true,
    strict: false,
  };
  const ajv = new Ajv(ajvOptions);
  const validate = ajv.compile(schema);
  const isValid = validate(record.data);
  if (!isValid) {
    return { payload: null, error: 'schema_mismatch' };
  }

  const payload: JsonImportPayload = migrateExport({
    version,
    formpack: {
      id: formpack.id,
      version:
        typeof formpack.version === 'string' ? formpack.version : undefined,
    },
    record: {
      title: recordTitle,
      locale: localeValue,
      data: record.data,
    },
    revisions,
  });

  return { payload, error: null };
};
