import { isRecord } from './utils';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const DEFAULT_TEXT_VALUES = [
  'Max',
  'Muster',
  'Berlin',
  'Hamburg',
  'Musterstrasse 12',
  '12345',
  'Praxis am Park',
  '01234 567890',
  'Testwert',
  'Beispiel',
];

const DEFAULT_DATE_VALUES = [
  '1965-01-15',
  '1970-03-22',
  '1978-07-09',
  '1984-11-30',
  '1990-05-14',
  '1995-09-01',
  '2000-12-19',
  '2003-04-27',
  '2007-08-05',
  '2011-10-13',
];

const DEFAULT_NUMBER_VALUES = [1, 2, 3, 4, 5, 10, 20, 30, 40, 50];

type DummyFillRuntimeOptions = {
  rng: () => number;
  arrayMin: number;
  arrayMax: number;
};

export type DummyFillOptions = {
  rng?: () => number;
  arrayMin?: number;
  arrayMax?: number;
};

const toRuntimeOptions = (
  options: DummyFillOptions,
): DummyFillRuntimeOptions => {
  const arrayMin =
    Number.isInteger(options.arrayMin) && (options.arrayMin ?? 0) >= 1
      ? (options.arrayMin as number)
      : 1;
  const arrayMaxCandidate =
    Number.isInteger(options.arrayMax) && (options.arrayMax ?? 0) >= arrayMin
      ? (options.arrayMax as number)
      : 3;

  return {
    rng: options.rng ?? Math.random,
    arrayMin,
    arrayMax: Math.max(arrayMin, arrayMaxCandidate),
  };
};

const getRandomIndex = (length: number, rng: () => number): number => {
  if (length <= 1) {
    return 0;
  }
  const value = rng();
  const normalized =
    Number.isFinite(value) && value >= 0 ? Math.min(value, 0.999999999999) : 0;
  return Math.floor(normalized * length);
};

const pickRandom = <T>(values: readonly T[], rng: () => number): T =>
  values[getRandomIndex(values.length, rng)];

const getSchemaType = (schema: RJSFSchema): string | null => {
  if (typeof schema.type === 'string') {
    return schema.type;
  }
  if (Array.isArray(schema.type)) {
    return schema.type.find((entry) => entry !== 'null') ?? null;
  }
  return null;
};

const isUiHidden = (uiSchema: unknown): boolean =>
  isRecord(uiSchema) && uiSchema['ui:widget'] === 'hidden';

const isUiReadonly = (uiSchema: unknown): boolean =>
  isRecord(uiSchema) && uiSchema['ui:readonly'] === true;

const hasReadonlySchema = (schema: RJSFSchema): boolean =>
  schema.readOnly === true;

const resolveArrayItemSchema = (schema: RJSFSchema): RJSFSchema | null => {
  if (Array.isArray(schema.items)) {
    const first = schema.items[0];
    return isRecord(first) ? (first as RJSFSchema) : null;
  }
  return isRecord(schema.items) ? (schema.items as RJSFSchema) : null;
};

const resolveArrayItemUiSchema = (uiSchema: unknown): unknown => {
  if (!isRecord(uiSchema)) {
    return undefined;
  }
  const items = uiSchema.items;
  if (Array.isArray(items)) {
    return items[0];
  }
  return items;
};

const buildObjectValue = (
  schema: RJSFSchema,
  uiSchema: unknown,
  options: DummyFillRuntimeOptions,
): Record<string, unknown> | undefined => {
  if (!isRecord(schema.properties)) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const [key, childSchemaNode] of Object.entries(schema.properties)) {
    if (!isRecord(childSchemaNode)) {
      continue;
    }
    const childUiSchema = isRecord(uiSchema) ? uiSchema[key] : undefined;
    const childValue = buildValue(
      childSchemaNode as RJSFSchema,
      childUiSchema,
      options,
    );
    if (childValue !== undefined) {
      result[key] = childValue;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const buildArrayValue = (
  schema: RJSFSchema,
  uiSchema: unknown,
  options: DummyFillRuntimeOptions,
): unknown[] => {
  const itemSchema = resolveArrayItemSchema(schema);
  if (!itemSchema) {
    return [];
  }

  const itemUiSchema = resolveArrayItemUiSchema(uiSchema);
  const span = options.arrayMax - options.arrayMin + 1;
  const itemCount = options.arrayMin + getRandomIndex(span, options.rng);
  const values: unknown[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    const item = buildValue(itemSchema, itemUiSchema, options);
    if (item !== undefined) {
      values.push(item);
    }
  }

  return values;
};

const buildStringValue = (
  schema: RJSFSchema,
  options: DummyFillRuntimeOptions,
): string => {
  if (schema.format === 'date') {
    return pickRandom(DEFAULT_DATE_VALUES, options.rng);
  }
  return pickRandom(DEFAULT_TEXT_VALUES, options.rng);
};

const withOptionalEmptyEnum = (
  enumValues: readonly unknown[],
): readonly unknown[] => {
  if (enumValues.includes('')) {
    return enumValues;
  }
  return [...enumValues, ''];
};

const buildValue = (
  schema: RJSFSchema,
  uiSchema: unknown,
  options: DummyFillRuntimeOptions,
): unknown => {
  if (
    isUiHidden(uiSchema) ||
    isUiReadonly(uiSchema) ||
    hasReadonlySchema(schema)
  ) {
    return undefined;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return pickRandom(withOptionalEmptyEnum(schema.enum), options.rng);
  }

  const type = getSchemaType(schema);
  switch (type) {
    case 'object':
      return buildObjectValue(schema, uiSchema, options);
    case 'array':
      return buildArrayValue(schema, uiSchema, options);
    case 'boolean':
      return options.rng() < 0.5;
    case 'integer':
      return Math.trunc(pickRandom(DEFAULT_NUMBER_VALUES, options.rng));
    case 'number':
      return pickRandom(DEFAULT_NUMBER_VALUES, options.rng);
    case 'string':
      return buildStringValue(schema, options);
    default:
      return undefined;
  }
};

export const buildRandomDummyPatch = (
  schema: RJSFSchema | null,
  uiSchema: UiSchema | null,
  options: DummyFillOptions = {},
): Record<string, unknown> => {
  if (!schema) {
    return {};
  }

  const value = buildValue(schema, uiSchema, toRuntimeOptions(options));
  return isRecord(value) ? value : {};
};
