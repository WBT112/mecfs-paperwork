import {
  optionsList,
  deepEquals,
  type RJSFSchema,
  type UiSchema,
} from '@rjsf/utils';

export type ArrayFormatMode = 'join' | 'bullets';

export type DisplayValueResolverOptions = {
  schema?: RJSFSchema;
  uiSchema?: UiSchema;
  namespace?: string;
  formpackId?: string;
  fieldPath?: string;
  formatMode?: ArrayFormatMode;
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

  const label =
    typeof match.label === 'string' ? match.label : String(match.label);
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

const getItemSchemaFromArray = (
  schema: RJSFSchema | undefined,
): RJSFSchema | undefined => {
  if (!schema?.items) {
    return undefined;
  }
  return Array.isArray(schema.items)
    ? (schema.items[0] as RJSFSchema)
    : (schema.items as RJSFSchema);
};

const getItemUiSchemaFromArray = (
  uiSchema: UiSchema | undefined,
): UiSchema | undefined => {
  if (!uiSchema?.items) {
    return undefined;
  }
  return Array.isArray(uiSchema.items)
    ? (uiSchema.items[0] as UiSchema)
    : (uiSchema.items as UiSchema);
};

const resolveArrayItem = (
  item: unknown,
  itemOptions: DisplayValueResolverOptions,
): string | null => {
  const enumLabel = resolveEnumLabel(item, itemOptions);
  if (enumLabel !== null) {
    return enumLabel;
  }

  if (typeof item === 'string' && item.trim()) {
    return item;
  }

  if (typeof item === 'number') {
    return String(item);
  }

  return null;
};

const resolveArrayValue = (
  values: unknown[],
  options: DisplayValueResolverOptions,
): string | null => {
  if (!values.length) {
    return '';
  }

  const itemOptions = {
    ...options,
    schema: getItemSchemaFromArray(options.schema),
    uiSchema: getItemUiSchemaFromArray(options.uiSchema),
  };

  const resolvedItems = values
    .map((item) => resolveArrayItem(item, itemOptions))
    .filter((item): item is string => item !== null);

  if (!resolvedItems.length) {
    return '';
  }

  const formatMode = options.formatMode ?? 'join';
  if (formatMode === 'bullets') {
    return resolvedItems.map((item) => `• ${item}`).join('\n');
  }

  return resolvedItems.join(', ');
};

export const resolveDisplayValue = (
  value: unknown,
  options: DisplayValueResolverOptions = {},
): string => {
  if (value === null || value === undefined) {
    return '';
  }

  // RATIONALE: Handle arrays (e.g., multi-select, checkbox groups) before primitives
  if (Array.isArray(value)) {
    const arrayResult = resolveArrayValue(value, options);
    return arrayResult ?? '';
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
