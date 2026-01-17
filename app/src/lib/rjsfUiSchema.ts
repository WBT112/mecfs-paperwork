/**
 * Provides a function to recursively apply sensible UI schema defaults.
 * This is used to improve the base presentation of form fields, especially for arrays.
 */
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { isRecord } from './utils';

const ensureUiOptions = (uiSchema: UiSchema): UiSchema => {
  const uiOptions = isRecord(uiSchema['ui:options'])
    ? { ...uiSchema['ui:options'] }
    : {};

  return {
    ...uiSchema,
    'ui:options': uiOptions,
  };
};

const ensureItemLabelHidden = (uiSchema: UiSchema): UiSchema => {
  const nextSchema = ensureUiOptions(uiSchema);
  const uiOptions = nextSchema['ui:options'] as Record<string, unknown>;

  if (uiOptions.label === undefined) {
    uiOptions.label = false;
  }

  return nextSchema;
};

const applyArrayItemDefaults = (
  itemsSchema: RJSFSchema | boolean,
  itemsUiSchema: UiSchema | undefined,
): UiSchema | undefined => {
  if (!isRecord(itemsSchema)) {
    return itemsUiSchema;
  }

  return applyArrayUiSchemaDefaults(
    itemsSchema,
    ensureItemLabelHidden(itemsUiSchema ?? {}),
  );
};

/**
 * Applies default UI options for array fields to improve usability.
 */
export const applyArrayUiSchemaDefaults = (
  schema: RJSFSchema,
  uiSchema: UiSchema = {},
): UiSchema => {
  if (!isRecord(schema)) {
    return uiSchema;
  }

  let nextSchema = { ...uiSchema } as UiSchema;

  if (schema.type === 'array' && schema.items) {
    const withOptions = ensureUiOptions(nextSchema);
    const uiOptions = withOptions['ui:options'] as Record<string, unknown>;

    if (uiOptions.orderable === undefined) {
      uiOptions.orderable = false;
    }

    const nextItems = applyArrayItemDefaults(
      schema.items as RJSFSchema | boolean,
      (nextSchema.items as UiSchema | undefined) ?? undefined,
    );

    nextSchema = nextItems
      ? {
          ...withOptions,
          items: nextItems,
        }
      : withOptions;
  }

  if (schema.type === 'object' && isRecord(schema.properties)) {
    const properties = schema.properties as Record<string, RJSFSchema>;
    const updatedProperties: Record<string, UiSchema> = {};

    Object.entries(properties).forEach(([key, propertySchema]) => {
      updatedProperties[key] = applyArrayUiSchemaDefaults(
        propertySchema,
        (nextSchema as Record<string, UiSchema>)[key] ?? {},
      );
    });

    nextSchema = {
      ...nextSchema,
      ...updatedProperties,
    };
  }

  return nextSchema;
};
