import { optionsList, deepEquals, type RJSFSchema, type UiSchema } from '@rjsf/utils';

export type DisplayValueResolverOptions = {
  schema?: RJSFSchema;
  uiSchema?: UiSchema;
  namespace?: string;
  formpackId?: string;
  fieldPath?: string;
  t?: (
    key: string,
    options?: {
      ns?: string;
      defaultValue?: string;
    },
  ) => string;
};

const TRANSLATION_PREFIX = 't:';

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

const translateLabel = (
  label: string,
  t: DisplayValueResolverOptions['t'],
  namespace?: string,
): string => {
  if (!t || !looksLikeTranslationKey(label)) {
    return label;
  }

  const key = label.startsWith(TRANSLATION_PREFIX)
    ? label.slice(TRANSLATION_PREFIX.length).trim()
    : label;

  if (!key) {
    return label;
  }

  return t(key, { ns: namespace, defaultValue: key });
};

const resolveEnumLabel = (
  value: unknown,
  options: DisplayValueResolverOptions,
): string | null => {
  if (!options.schema) {
    return null;
  }

  const enumOptions = optionsList(options.schema, options.uiSchema);
  if (!enumOptions?.length) {
    return null;
  }

  const match = enumOptions.find((option) => deepEquals(option.value, value));
  if (!match) {
    return null;
  }

  const label = typeof match.label === 'string' ? match.label : String(match.label);
  return translateLabel(label, options.t, options.namespace);
};

const resolveParagraphValue = (
  value: boolean,
  options: DisplayValueResolverOptions,
): string | null => {
  if (!options.t || !options.formpackId || !options.fieldPath) {
    return null;
  }

  const namespace = options.namespace ?? `formpack:${options.formpackId}`;
  const baseKey = `${options.formpackId}.export.${options.fieldPath}`;

  if (value) {
    const paragraphKey = `${baseKey}.paragraph`;
    const paragraph = options.t(paragraphKey, {
      ns: namespace,
      defaultValue: paragraphKey,
    });
    return paragraph === paragraphKey ? '' : paragraph;
  }

  const falseKeys = [
    `${baseKey}.false.paragraph`,
    `${baseKey}.paragraph.false`,
  ];
  for (const key of falseKeys) {
    const paragraph = options.t(key, {
      ns: namespace,
      defaultValue: key,
    });
    if (paragraph !== key) {
      return paragraph;
    }
  }

  return '';
};

export const resolveDisplayValue = (
  value: unknown,
  options: DisplayValueResolverOptions = {},
): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const enumLabel = resolveEnumLabel(value, options);
  if (enumLabel !== null) {
    return enumLabel;
  }

  if (typeof value === 'boolean') {
    const paragraph = resolveParagraphValue(value, options);
    if (paragraph !== null) {
      return paragraph;
    }
    return '';
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
