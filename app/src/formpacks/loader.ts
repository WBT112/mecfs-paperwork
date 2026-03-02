import { isSupportedLocale } from '../i18n/locale';
import { isRecord } from '../lib/utils';
import { FORMPACK_IDS } from './registry';
import type {
  FormpackDocxManifest,
  FormpackExportType,
  FormpackManifest,
  FormpackManifestPayload,
  FormpackMeta,
  FormpackUiConfig,
  FormpackVisibility,
} from './types';
import { isFormpackCategory } from './types';

export type FormpackLoaderErrorCode =
  | 'not_found'
  | 'invalid'
  | 'network'
  | 'unsupported'
  | 'schema_not_found'
  | 'schema_invalid'
  | 'schema_unavailable'
  | 'ui_schema_not_found'
  | 'ui_schema_invalid'
  | 'ui_schema_unavailable';

/**
 * Error type for formpack loading failures.
 */
export class FormpackLoaderError extends Error {
  readonly code: FormpackLoaderErrorCode;

  constructor(code: FormpackLoaderErrorCode, message: string) {
    super(message);
    this.name = 'FormpackLoaderError';
    this.code = code;
  }
}

const buildManifestPath = (formpackId: string) =>
  `/formpacks/${formpackId}/manifest.json`;
const buildSchemaPath = (formpackId: string) =>
  `/formpacks/${formpackId}/schema.json`;
const buildUiSchemaPath = (formpackId: string) =>
  `/formpacks/${formpackId}/ui.schema.json`;
const FORMPACK_ID_SET = new Set<string>(FORMPACK_IDS);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isFormpackExportType = (value: string): value is FormpackExportType =>
  value === 'docx' || value === 'json' || value === 'pdf';
const isFormpackVisibility = (value: string): value is FormpackVisibility =>
  value === 'public' || value === 'dev';

const assertManifestRequiredFields = (
  payload: FormpackManifestPayload,
  formpackId: string,
): void => {
  if (
    typeof payload.id !== 'string' ||
    typeof payload.version !== 'string' ||
    typeof payload.titleKey !== 'string' ||
    typeof payload.descriptionKey !== 'string'
  ) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest is missing required fields.',
    );
  }

  if (payload.id !== formpackId) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest id does not match the requested pack.',
    );
  }
};

const getValidatedLocales = (
  payload: FormpackManifestPayload,
): FormpackManifest['locales'] => {
  if (!isStringArray(payload.locales) || !payload.locales.length) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest must declare supported locales.',
    );
  }

  const locales = payload.locales.filter((locale) => isSupportedLocale(locale));
  if (locales.length !== payload.locales.length) {
    throw new FormpackLoaderError(
      'unsupported',
      'The formpack manifest declares an unsupported locale.',
    );
  }

  return locales;
};

const getValidatedDefaultLocale = (
  payload: FormpackManifestPayload,
): FormpackManifest['defaultLocale'] => {
  if (typeof payload.defaultLocale !== 'string') {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest must declare a default locale.',
    );
  }

  if (!isSupportedLocale(payload.defaultLocale)) {
    throw new FormpackLoaderError(
      'unsupported',
      'The formpack manifest declares an unsupported default locale.',
    );
  }

  return payload.defaultLocale;
};

const getValidatedExports = (
  payload: FormpackManifestPayload,
): FormpackExportType[] => {
  if (!isStringArray(payload.exports)) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest must declare export formats.',
    );
  }

  if (
    !payload.exports.every((exportType) => isFormpackExportType(exportType))
  ) {
    throw new FormpackLoaderError(
      'unsupported',
      'The formpack manifest declares an unsupported export type.',
    );
  }

  return payload.exports.filter((exportType) =>
    isFormpackExportType(exportType),
  );
};

const getValidatedVisibility = (
  payload: FormpackManifestPayload,
): FormpackVisibility => {
  const visibility =
    payload.visibility === undefined ? 'public' : payload.visibility;

  if (typeof visibility !== 'string' || !isFormpackVisibility(visibility)) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest declares an unsupported visibility.',
    );
  }

  return visibility;
};

const parseDocxManifest = (
  value: unknown,
  formpackId: string,
): FormpackDocxManifest | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const templates = value.templates;
  if (!isRecord(templates)) {
    return undefined;
  }

  const a4 = templates.a4;
  const wallet = templates.wallet;

  if (typeof a4 !== 'string') {
    return undefined;
  }

  if (wallet !== undefined && typeof wallet !== 'string') {
    return undefined;
  }

  // Only the notfallpass formpack supports the wallet DOCX template.
  if (typeof wallet === 'string' && formpackId !== 'notfallpass') {
    throw new FormpackLoaderError(
      'invalid',
      'Wallet templates are only supported for the notfallpass formpack.',
    );
  }

  const mapping = value.mapping;
  if (typeof mapping !== 'string') {
    return undefined;
  }

  return {
    templates: {
      a4,
      ...(typeof wallet === 'string' ? { wallet } : {}),
    },
    mapping,
  };
};

const parseManifestMeta = (value: unknown): FormpackMeta | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const category = isFormpackCategory(value.category)
    ? value.category
    : undefined;
  const keywords = isStringArray(value.keywords) ? value.keywords : undefined;

  if (!category && !keywords) {
    return undefined;
  }

  return {
    ...(category ? { category } : {}),
    ...(keywords ? { keywords } : {}),
  };
};

const assertKnownFormpackId = (
  formpackId: string,
  errorCode: FormpackLoaderErrorCode,
): void => {
  if (FORMPACK_ID_SET.has(formpackId)) {
    return;
  }

  throw new FormpackLoaderError(
    errorCode,
    'The requested formpack id is not registered.',
  );
};

/**
 * Parses and validates a manifest payload into a strongly-typed runtime manifest.
 * Throws `FormpackLoaderError` for all contract violations.
 */
export const parseManifest = (
  payload: FormpackManifestPayload,
  formpackId: string,
): FormpackManifest => {
  assertManifestRequiredFields(payload, formpackId);

  const locales = getValidatedLocales(payload);
  const defaultLocale = getValidatedDefaultLocale(payload);
  const exports = getValidatedExports(payload);
  const docx = parseDocxManifest(payload.docx, formpackId);
  const requiresDocx = exports.includes('docx');
  const visibility = getValidatedVisibility(payload);
  const meta = parseManifestMeta(payload.meta);

  if (requiresDocx && !docx) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest declares DOCX exports without valid DOCX assets.',
    );
  }

  return {
    id: payload.id,
    version: payload.version,
    defaultLocale,
    locales,
    titleKey: payload.titleKey,
    descriptionKey: payload.descriptionKey,
    exports,
    visibility,
    docx,
    ui: isRecord(payload.ui)
      ? (payload.ui as unknown as FormpackUiConfig)
      : undefined,
    meta,
  };
};

// In-memory cache for formpack manifests to avoid redundant network requests.
// This improves performance when navigating between pages or switching locales.
const manifestCache = new Map<string, FormpackManifest>();

// In-memory cache for JSON resources (schemas) to avoid redundant network requests.
const jsonResourceCache = new Map<string, Record<string, unknown>>();

/**
 * Clears all formpack caches (manifests and schemas).
 * Intended for testing purposes only.
 */
export const clearFormpackCaches = (): void => {
  manifestCache.clear();
  jsonResourceCache.clear();
};

/**
 * Fetches a single formpack manifest by id.
 * Results are cached in memory to avoid redundant network requests.
 */
export const loadFormpackManifest = async (
  formpackId: string,
): Promise<FormpackManifest> => {
  assertKnownFormpackId(formpackId, 'not_found');

  const cached = manifestCache.get(formpackId);
  if (cached) {
    return cached;
  }

  let response: Response;

  try {
    response = await fetch(buildManifestPath(formpackId), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new FormpackLoaderError(
      'network',
      'Unable to reach the formpack manifest.',
    );
  }

  if (response.status === 404) {
    throw new FormpackLoaderError('not_found', 'Formpack not found.');
  }

  if (!response.ok) {
    throw new FormpackLoaderError(
      'network',
      'Unable to load the formpack manifest.',
    );
  }

  let payload: FormpackManifestPayload;

  try {
    payload = (await response.json()) as FormpackManifestPayload;
  } catch {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest could not be parsed.',
    );
  }

  const manifest = parseManifest(payload, formpackId);
  manifestCache.set(formpackId, manifest);
  return manifest;
};

const loadFormpackJsonResource = async (
  path: string,
  {
    notFoundCode,
    invalidCode,
    unavailableCode,
  }: {
    notFoundCode: FormpackLoaderErrorCode;
    invalidCode: FormpackLoaderErrorCode;
    unavailableCode: FormpackLoaderErrorCode;
  },
): Promise<Record<string, unknown>> => {
  const cached = jsonResourceCache.get(path);
  if (cached) {
    return cached;
  }

  let response: Response;

  try {
    response = await fetch(path, { headers: { Accept: 'application/json' } });
  } catch {
    throw new FormpackLoaderError(
      unavailableCode,
      'Unable to reach the formpack resource.',
    );
  }

  if (response.status === 404) {
    throw new FormpackLoaderError(
      notFoundCode,
      'The formpack resource could not be found.',
    );
  }

  if (!response.ok) {
    throw new FormpackLoaderError(
      unavailableCode,
      'Unable to load the formpack resource.',
    );
  }

  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new FormpackLoaderError(
      invalidCode,
      'The formpack resource could not be parsed.',
    );
  }

  if (!isRecord(payload)) {
    throw new FormpackLoaderError(
      invalidCode,
      'The formpack resource is not a valid JSON object.',
    );
  }

  jsonResourceCache.set(path, payload);
  return payload;
};

/**
 * Fetches the JSON schema for a formpack.
 */
export const loadFormpackSchema = async (
  formpackId: string,
): Promise<Record<string, unknown>> => {
  assertKnownFormpackId(formpackId, 'schema_not_found');
  return loadFormpackJsonResource(buildSchemaPath(formpackId), {
    notFoundCode: 'schema_not_found',
    invalidCode: 'schema_invalid',
    unavailableCode: 'schema_unavailable',
  });
};

/**
 * Fetches the UI schema for a formpack.
 */
export const loadFormpackUiSchema = async (
  formpackId: string,
): Promise<Record<string, unknown>> => {
  assertKnownFormpackId(formpackId, 'ui_schema_not_found');
  return loadFormpackJsonResource(buildUiSchemaPath(formpackId), {
    notFoundCode: 'ui_schema_not_found',
    invalidCode: 'ui_schema_invalid',
    unavailableCode: 'ui_schema_unavailable',
  });
};

/**
 * Loads all formpacks declared in the static registry.
 */
export const listFormpacks = async (): Promise<FormpackManifest[]> =>
  Promise.all(
    FORMPACK_IDS.map((formpackId) => loadFormpackManifest(formpackId)),
  );
