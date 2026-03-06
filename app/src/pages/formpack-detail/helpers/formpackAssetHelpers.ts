import { loadFormpackI18n } from '../../../i18n/formpack';
import type { SupportedLocale } from '../../../i18n/locale';
import type { JsonEncryptionEnvelope } from '../../../lib/jsonEncryption';
import { isRecord } from '../../../lib/utils';
import {
  FormpackLoaderError,
  isFormpackVisible,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
  type FormpackManifest,
} from '../../../formpacks';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

/**
 * Result shape returned after attempting to load manifest and schema assets.
 */
export type ManifestLoadResult = {
  manifest: FormpackManifest | null;
  schema: RJSFSchema | null;
  uiSchema: UiSchema | null;
  errorMessage: string | null;
};

const FORMPACK_ERROR_KEYS: Partial<
  Record<FormpackLoaderError['code'], string>
> = {
  network: 'formpackLoadError',
  schema_not_found: 'formpackSchemaNotFound',
  schema_invalid: 'formpackSchemaInvalid',
  schema_unavailable: 'formpackSchemaUnavailable',
  ui_schema_not_found: 'formpackUiSchemaNotFound',
  ui_schema_invalid: 'formpackUiSchemaInvalid',
  ui_schema_unavailable: 'formpackUiSchemaUnavailable',
  not_found: 'formpackNotFound',
  unsupported: 'formpackUnsupported',
  invalid: 'formpackInvalid',
};

const JSON_ENCRYPTION_KIND = 'mecfs-paperwork-json-encrypted';

type JsonEncryptionRuntimeErrorCode =
  | 'crypto_unsupported'
  | 'invalid_envelope'
  | 'decrypt_failed';

const isJsonEncryptionRuntimeError = (
  error: unknown,
): error is { code: JsonEncryptionRuntimeErrorCode } => {
  if (!isRecord(error)) {
    return false;
  }

  const code = error.code;
  return (
    error.name === 'JsonEncryptionError' &&
    typeof code === 'string' &&
    (code === 'crypto_unsupported' ||
      code === 'invalid_envelope' ||
      code === 'decrypt_failed')
  );
};

const loadFormpackAssets = async (
  formpackId: string,
  locale: SupportedLocale,
  t: (key: string) => string,
): Promise<ManifestLoadResult> => {
  const manifest = await loadFormpackManifest(formpackId);
  if (!isFormpackVisible(manifest)) {
    return {
      manifest: null,
      schema: null,
      uiSchema: null,
      errorMessage: t('formpackNotFound'),
    };
  }

  await loadFormpackI18n(formpackId, locale);
  const [schemaData, uiSchemaData] = await Promise.all([
    loadFormpackSchema(formpackId),
    loadFormpackUiSchema(formpackId),
  ]);

  return {
    manifest,
    schema: schemaData as RJSFSchema,
    uiSchema: uiSchemaData as UiSchema,
    errorMessage: null,
  };
};

const buildErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): string => {
  if (error instanceof FormpackLoaderError) {
    const key = FORMPACK_ERROR_KEYS[error.code];
    if (key) {
      return t(key);
    }
  }

  return t('formpackLoadError');
};

const tryParseEncryptedEnvelope = (
  rawJson: string,
): JsonEncryptionEnvelope | null => {
  const normalized = rawJson.replace(/^\uFEFF/, '').trimStart();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    return parsed.kind === JSON_ENCRYPTION_KIND
      ? (parsed as JsonEncryptionEnvelope)
      : null;
  } catch {
    return null;
  }
};

const loadJsonEncryptionModule = async () =>
  import('../../../lib/jsonEncryption');

const resolveImportErrorMessage = (
  error: { code: string; message?: string },
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  switch (error.code) {
    case 'invalid_json':
      return error.message
        ? t('importInvalidJsonWithDetails', { message: error.message })
        : t('importInvalidJson');
    case 'unknown_formpack':
      return t('importUnknownFormpack');
    case 'schema_mismatch':
      return t('importSchemaMismatch');
    case 'formpack_mismatch':
      return t('importFormpackMismatch');
    case 'invalid_revisions':
      return t('importInvalidRevisions');
    case 'unsupported_locale':
      return t('importUnsupportedLocale');
    default:
      return t('importInvalidPayload');
  }
};

const resolveJsonEncryptionErrorMessage = (
  error: unknown,
  mode: 'export' | 'import',
  t: (key: string) => string,
): string => {
  if (isJsonEncryptionRuntimeError(error)) {
    if (error.code === 'crypto_unsupported') {
      return t('jsonEncryptionUnsupported');
    }
    if (error.code === 'decrypt_failed') {
      return t('importPasswordInvalid');
    }
    return t('importEncryptedPayloadInvalid');
  }

  return mode === 'export'
    ? t('formpackJsonExportError')
    : t('importInvalidJson');
};

const resolveActionSourceElement = (
  target: EventTarget | null,
): HTMLElement | null => {
  if (target instanceof HTMLElement) {
    return target;
  }
  if (target instanceof Node) {
    const parentElement = target.parentElement;
    return parentElement instanceof HTMLElement ? parentElement : null;
  }
  return null;
};

const getActionButtonDataAction = (
  target: EventTarget | null,
): string | null => {
  const element = resolveActionSourceElement(target);
  if (!element) {
    return null;
  }

  const actionButton = element.closest('button.app__button');
  if (!(actionButton instanceof HTMLButtonElement)) {
    return null;
  }

  return actionButton.dataset.action ?? '';
};

/**
 * Collects formpack asset, import, and encryption helpers for the detail page.
 *
 * @remarks
 * RATIONALE: These helpers all deal with loading static assets or handling
 * import/export transport concerns, not with form-specific business logic.
 */
export const formpackAssetHelpers = {
  buildErrorMessage,
  getActionButtonDataAction,
  isJsonEncryptionRuntimeError,
  loadFormpackAssets,
  loadJsonEncryptionModule,
  resolveImportErrorMessage,
  resolveJsonEncryptionErrorMessage,
  tryParseEncryptedEnvelope,
};
