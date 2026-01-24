import type { TFunction } from 'i18next';
import type { UiSchema } from '@rjsf/utils';

const TRANSLATION_PREFIX = 't:';
const TRANSLATABLE_KEYS = new Set([
  'ui:title',
  'ui:description',
  'ui:help',
  'ui:enumNames',
]);

const looksLikeTranslationKey = (value: string): boolean => {
  if (value.startsWith(TRANSLATION_PREFIX)) {
    return true;
  }

  if (value.trim() !== value || value.length === 0) {
    return false;
  }

  if (/\s/.test(value)) {
    return false;
  }

  return value.includes('.');
};

const translateUiSchemaString = (
  value: string,
  t: TFunction,
  namespace?: string,
): string => {
  const key = value.startsWith(TRANSLATION_PREFIX)
    ? value.slice(TRANSLATION_PREFIX.length).trim()
    : value;

  if (!key || !looksLikeTranslationKey(value)) {
    return value;
  }

  return t(key, { ns: namespace, defaultValue: key });
};

const translateTranslatableValue = (
  entry: unknown,
  t: TFunction,
  namespace?: string,
): unknown => {
  if (typeof entry === 'string') {
    return translateUiSchemaString(entry, t, namespace);
  }
  if (Array.isArray(entry)) {
    return entry.map((item: unknown) =>
      typeof item === 'string'
        ? translateUiSchemaString(item, t, namespace)
        : item,
    );
  }
  return translateUiSchemaNode(entry, t, namespace);
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
    translated[key] = TRANSLATABLE_KEYS.has(key)
      ? translateTranslatableValue(entry, t, namespace)
      : translateUiSchemaNode(entry, t, namespace);
  });

  return translated;
};

/**
 * Translates ui:title, ui:description, ui:help, and ui:enumNames values in a uiSchema tree.
 */
export const translateUiSchema = (
  uiSchema: UiSchema,
  t: TFunction,
  namespace?: string,
): UiSchema => translateUiSchemaNode(uiSchema, t, namespace) as UiSchema;
