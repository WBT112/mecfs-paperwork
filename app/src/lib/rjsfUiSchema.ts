import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const ensureUiOptions = (uiSchema: UiSchema): UiSchema => {
  const uiOptions = isObject(uiSchema['ui:options'])
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
  if (!isObject(itemsSchema)) {
    return itemsUiSchema;
  }

  return applyArrayUiSchemaDefaults(
    itemsSchema,
    ensureItemLabelHidden(itemsUiSchema ?? {}),
  );
};

/**
 * Applies default UI options for array fields to improve usability.
 *
 * RATIONALE: The default rendering for array fields in react-jsonschema-form
 * is often suboptimal for our use case. This function recursively traverses a
 * schema and applies sensible defaults to array fields and their items:
 * - Disables reordering of array items (`orderable: false`).
 * - Hides the label for individual array items (`label: false`), as it's
 *   often redundant.
 */
export const applyArrayUiSchemaDefaults = (
  schema: RJSFSchema,
  uiSchema: UiSchema = {},
): UiSchema => {
  if (!isObject(schema)) {
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

  if (schema.type === 'object' && isObject(schema.properties)) {
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
