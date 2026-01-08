import { isSupportedLocale } from '../i18n/locale';
import { FORMPACK_IDS } from './registry';
import type {
  FormpackDocxManifest,
  FormpackExportType,
  FormpackManifest,
  FormpackManifestPayload,
} from './types';

export type FormpackLoaderErrorCode =
  | 'not_found'
  | 'invalid'
  | 'network'
  | 'unsupported';

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

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isFormpackExportType = (value: string): value is FormpackExportType =>
  value === 'docx' || value === 'json';

const parseDocxManifest = (
  value: unknown,
): FormpackDocxManifest | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const docx = value as { templates?: unknown; mapping?: unknown };

  if (!docx.templates || typeof docx.templates !== 'object') {
    return undefined;
  }

  const templates = docx.templates as { a4?: unknown; wallet?: unknown };

  if (
    typeof templates.a4 !== 'string' ||
    typeof templates.wallet !== 'string'
  ) {
    return undefined;
  }

  if (typeof docx.mapping !== 'string') {
    return undefined;
  }

  return {
    templates: {
      a4: templates.a4,
      wallet: templates.wallet,
    },
    mapping: docx.mapping,
  };
};

const parseManifest = (
  payload: FormpackManifestPayload,
  formpackId: string,
): FormpackManifest => {
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

  if (!isStringArray(payload.locales) || !payload.locales.length) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest must declare supported locales.',
    );
  }

  if (!payload.locales.every((locale) => isSupportedLocale(locale))) {
    throw new FormpackLoaderError(
      'unsupported',
      'The formpack manifest declares an unsupported locale.',
    );
  }

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

  if (!isStringArray(payload.exports)) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest must declare export formats.',
    );
  }

  if (!payload.exports.every(isFormpackExportType)) {
    throw new FormpackLoaderError(
      'unsupported',
      'The formpack manifest declares an unsupported export type.',
    );
  }

  const exports = payload.exports.filter(isFormpackExportType);
  const docx = parseDocxManifest(payload.docx);
  const requiresDocx = exports.includes('docx');

  if (requiresDocx && !docx) {
    throw new FormpackLoaderError(
      'invalid',
      'The formpack manifest declares DOCX exports without valid DOCX assets.',
    );
  }

  return {
    id: payload.id,
    version: payload.version,
    defaultLocale: payload.defaultLocale,
    locales: payload.locales,
    titleKey: payload.titleKey,
    descriptionKey: payload.descriptionKey,
    exports,
    docx,
  };
};

/**
 * Fetches a single formpack manifest by id.
 */
export const loadFormpackManifest = async (
  formpackId: string,
): Promise<FormpackManifest> => {
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

  return parseManifest(payload, formpackId);
};

/**
 * Loads all formpacks declared in the static registry.
 */
export const listFormpacks = async (): Promise<FormpackManifest[]> =>
  Promise.all(
    FORMPACK_IDS.map((formpackId) => loadFormpackManifest(formpackId)),
  );
