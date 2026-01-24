import { optionsList, deepEquals, type RJSFSchema, type UiSchema } from '@rjsf/utils';

export type DisplayValueResolverOptions = {
  schema?: RJSFSchema;
  uiSchema?: UiSchema;
  namespace?: string;
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
    if (options.t) {
      const key = value ? 'common.true' : 'common.false';
      const translated = options.t(key, {
        ns: options.namespace,
        defaultValue: key,
      });
      if (translated !== key) {
        return translated;
      }
      return options.t(key, {
        ns: options.namespace,
        defaultValue: value ? 'true' : 'false',
      });
    }
    return value ? 'true' : 'false';
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
