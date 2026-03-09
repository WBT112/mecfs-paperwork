import type { UiSchema } from '@rjsf/utils';
import { getPathValue } from '../../lib/pathAccess';
import { isRecord } from '../../lib/utils';

type PacingVariant = 'adult' | 'child';

const resolvePacingVariant = (value: unknown): PacingVariant =>
  value === 'child' ? 'child' : 'adult';

const hideSection = (value: unknown): UiSchema => {
  const section = isRecord(value) ? value : {};
  return {
    ...section,
    'ui:widget': 'hidden',
  };
};

const showSection = (value: unknown): UiSchema => {
  const section = isRecord(value) ? value : {};
  if (section['ui:widget'] !== 'hidden') {
    return section as UiSchema;
  }

  const { ['ui:widget']: _hidden, ...rest } = section;
  return rest as UiSchema;
};

/**
 * Applies pacing-card variant visibility to the translated UI schema.
 *
 * @param uiSchema - The translated and normalized form UI schema.
 * @param formData - Current form data used to resolve the selected variant.
 * @returns A UI schema that only shows the active adult/child card section.
 * @remarks
 * RATIONALE: Both variants stay in the underlying form data so switching does
 * not destroy edits. Only the visible section changes with `meta.variant`.
 */
export const buildPacingVariantUiSchema = (
  uiSchema: UiSchema,
  formData: Record<string, unknown>,
): UiSchema => {
  const variant = resolvePacingVariant(getPathValue(formData, 'meta.variant'));

  return {
    ...uiSchema,
    adult:
      variant === 'adult'
        ? showSection(uiSchema.adult)
        : hideSection(uiSchema.adult),
    child:
      variant === 'child'
        ? showSection(uiSchema.child)
        : hideSection(uiSchema.child),
  };
};
