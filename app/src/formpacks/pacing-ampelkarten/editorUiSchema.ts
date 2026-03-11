import type { UiSchema } from '@rjsf/utils';
import { isRecord } from '../../lib/utils';
import { getPathValue } from '../../lib/pathAccess';

type PacingVariant = 'adult' | 'child';

/**
 * Ordered step identifiers for the pacing editor flow.
 */
export type PacingEditorStepId =
  | 'variant'
  | 'green'
  | 'yellow'
  | 'red'
  | 'preview';

export const PACING_EDITOR_STEP_IDS: readonly PacingEditorStepId[] = [
  'variant',
  'green',
  'yellow',
  'red',
  'preview',
] as const;

const CARD_STEP_IDS = ['green', 'yellow', 'red'] as const;

export type PacingEditorCardColor = (typeof CARD_STEP_IDS)[number];

const PRIMARY_CARD_FIELDS = ['canDo', 'needHelp', 'hint'] as const;

const resolveVariant = (value: unknown): PacingVariant =>
  value === 'child' ? 'child' : 'adult';

const hideNode = (value: unknown): UiSchema => {
  const section = isRecord(value) ? value : {};
  return {
    ...section,
    'ui:widget': 'hidden',
  };
};

const showNode = (value: unknown): UiSchema => {
  const section = isRecord(value) ? { ...value } : {};
  if (section['ui:widget'] !== 'hidden') {
    return section as UiSchema;
  }

  delete section['ui:widget'];
  return section as UiSchema;
};

const getRecordValue = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : {};

const normalizeArrayItemUiSchema = (value: unknown): UiSchema => {
  const field = showNode(value);
  const itemSchema = isRecord(field.items) ? { ...field.items } : {};
  const itemOptions = isRecord(itemSchema['ui:options'])
    ? { ...itemSchema['ui:options'] }
    : {};

  return {
    ...field,
    items: {
      ...itemSchema,
      'ui:options': {
        ...itemOptions,
        label: false,
      },
      'ui:title': '',
    },
  };
};

const stripFieldHelp = (value: unknown): UiSchema => {
  const field = showNode(value);
  delete field['ui:help'];
  return field;
};

const stripListFieldHelp = (value: unknown): UiSchema => {
  const field = normalizeArrayItemUiSchema(value);
  delete field['ui:help'];
  return field;
};

const isCardStep = (step: PacingEditorStepId): step is PacingEditorCardColor =>
  CARD_STEP_IDS.includes(step as PacingEditorCardColor);

const buildVariantStepUiSchema = (uiSchema: UiSchema): UiSchema => ({
  ...uiSchema,
  'ui:order': ['meta', 'adult', 'child', 'sender'],
  meta: {
    ...showNode(uiSchema.meta),
    'ui:title': '',
    'ui:description': '',
    variant: stripFieldHelp(
      isRecord(uiSchema.meta) ? uiSchema.meta.variant : {},
    ),
    introAccepted: hideNode(
      isRecord(uiSchema.meta) ? uiSchema.meta.introAccepted : {},
    ),
  },
  adult: hideNode(uiSchema.adult),
  child: hideNode(uiSchema.child),
  sender: hideNode(uiSchema.sender),
});

const buildCardStepUiSchema = (
  activeCards: UiSchema,
  step: PacingEditorCardColor,
  color: PacingEditorCardColor,
): UiSchema => {
  const card: unknown = activeCards[color];

  if (step !== color) {
    return hideNode(card);
  }

  return {
    ...showNode(card),
    'ui:title': '',
    'ui:description': '',
    'ui:order': [...PRIMARY_CARD_FIELDS],
    canDo: stripListFieldHelp(getRecordValue(card, 'canDo')),
    needHelp: stripListFieldHelp(getRecordValue(card, 'needHelp')),
    hint: stripFieldHelp(getRecordValue(card, 'hint')),
  };
};

const buildCardVariantUiSchema = (
  uiSchema: UiSchema,
  formData: Record<string, unknown>,
  step: PacingEditorCardColor,
): UiSchema => {
  const variant = resolveVariant(getPathValue(formData, 'meta.variant'));
  const inactiveVariant = variant === 'adult' ? 'child' : 'adult';
  const activeSection = showNode(uiSchema[variant]);
  const activeCards = showNode(activeSection.cards);

  return {
    ...uiSchema,
    'ui:order': ['meta', 'adult', 'child', 'sender'],
    meta: hideNode(uiSchema.meta),
    [inactiveVariant]: hideNode(uiSchema[inactiveVariant]),
    sender: hideNode(uiSchema.sender),
    [variant]: {
      ...activeSection,
      'ui:title': '',
      'ui:description': '',
      cards: {
        ...activeCards,
        'ui:title': '',
        'ui:order': [...CARD_STEP_IDS],
        green: buildCardStepUiSchema(activeCards, step, 'green'),
        yellow: buildCardStepUiSchema(activeCards, step, 'yellow'),
        red: buildCardStepUiSchema(activeCards, step, 'red'),
      },
    },
  };
};

/**
 * Filters the translated pacing UI schema down to the currently active editor step.
 *
 * @param uiSchema - The translated and array-normalized pacing UI schema.
 * @param formData - Current pacing form data.
 * @param step - Active editor step identifier.
 * @returns A UI schema that only exposes the fields needed for the current step.
 * @remarks
 * RATIONALE: The editor keeps the persisted data model unchanged and reduces
 * cognitive load by showing only the fields relevant to the current editing
 * step. Hidden fields stay in `formData`; they are not removed from storage.
 */
export const buildPacingEditorUiSchema = (
  uiSchema: UiSchema,
  formData: Record<string, unknown>,
  step: PacingEditorStepId,
  _unusedTranslator?: unknown,
): UiSchema => {
  if (step === 'variant') {
    return buildVariantStepUiSchema(uiSchema);
  }

  if (isCardStep(step)) {
    return buildCardVariantUiSchema(uiSchema, formData, step);
  }

  return uiSchema;
};
