import type { TFunction } from 'i18next';
import type { UiSchema } from '@rjsf/utils';

const TRANSLATION_PREFIX = 't:';
const TRANSLATABLE_KEYS = new Set(['ui:title', 'ui:description']);

const translateUiSchemaString = (
  value: string,
  t: TFunction,
  namespace?: string,
): string => {
  if (!value.startsWith(TRANSLATION_PREFIX)) {
    return value;
  }

  const key = value.slice(TRANSLATION_PREFIX.length).trim();

  if (!key) {
    return value;
  }

  return t(key, { ns: namespace, defaultValue: key });
};

const translateUiSchemaNode = (
  value: unknown,
  t: TFunction,
  namespace?: string,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => translateUiSchemaNode(entry, t, namespace));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const translated: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, entry]) => {
    if (TRANSLATABLE_KEYS.has(key) && typeof entry === 'string') {
      translated[key] = translateUiSchemaString(entry, t, namespace);
    } else {
      translated[key] = translateUiSchemaNode(entry, t, namespace);
    }
  });

  return translated;
};

/**
 * Translates ui:title and ui:description values with the t:<key> convention.
 */
export const translateUiSchema = (
  uiSchema: UiSchema,
  t: TFunction,
  namespace?: string,
): UiSchema => translateUiSchemaNode(uiSchema, t, namespace) as UiSchema;
