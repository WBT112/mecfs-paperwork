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
  | 'notes'
  | 'preview';

/**
 * Supported card colors in the pacing editor.
 */
export type PacingEditorCardColor = 'green' | 'yellow' | 'red';

/**
 * Secondary card sections that are collapsed by default in the pacing editor.
 */
export type PacingEditorSecondarySectionState = Partial<
  Record<PacingEditorCardColor, boolean>
>;

export const PACING_EDITOR_STEP_IDS: readonly PacingEditorStepId[] = [
  'variant',
  'green',
  'yellow',
  'red',
  'notes',
  'preview',
] as const;

const CARD_STEP_IDS: readonly PacingEditorCardColor[] = [
  'green',
  'yellow',
  'red',
] as const;

const PRIMARY_CARD_FIELDS = ['canDo', 'needHelp', 'hint'] as const;
const SECONDARY_CARD_FIELDS = ['visitRules', 'stimuli', 'thanks'] as const;

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

const stripFieldHelp = (value: unknown): UiSchema => {
  const field = showNode(value);
  delete field['ui:help'];
  return field;
};

const buildSecondaryCardField = (
  card: unknown,
  key: string,
  expanded: boolean,
) =>
  expanded
    ? stripFieldHelp(getRecordValue(card, key))
    : hideNode(getRecordValue(card, key));

const isCardStep = (step: PacingEditorStepId): step is PacingEditorCardColor =>
  CARD_STEP_IDS.includes(step as PacingEditorCardColor);

const buildVariantStepUiSchema = (uiSchema: UiSchema): UiSchema => ({
  ...uiSchema,
  'ui:order': ['meta', 'adult', 'child', 'notes', 'sender'],
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
  notes: hideNode(uiSchema.notes),
  sender: hideNode(uiSchema.sender),
});

const buildCardStepUiSchema = (
  activeCards: UiSchema,
  step: PacingEditorCardColor,
  color: PacingEditorCardColor,
  expanded: boolean,
): UiSchema => {
  const card: unknown = activeCards[color];

  if (step !== color) {
    return hideNode(card);
  }

  return {
    ...showNode(card),
    'ui:title': '',
    'ui:description': '',
    'ui:order': [...PRIMARY_CARD_FIELDS, ...SECONDARY_CARD_FIELDS],
    canDo: stripFieldHelp(getRecordValue(card, 'canDo')),
    needHelp: stripFieldHelp(getRecordValue(card, 'needHelp')),
    hint: stripFieldHelp(getRecordValue(card, 'hint')),
    visitRules: buildSecondaryCardField(card, 'visitRules', expanded),
    stimuli: buildSecondaryCardField(card, 'stimuli', expanded),
    thanks: buildSecondaryCardField(card, 'thanks', expanded),
  };
};

const buildCardVariantUiSchema = (
  uiSchema: UiSchema,
  formData: Record<string, unknown>,
  step: PacingEditorCardColor,
  expandedSecondarySections: PacingEditorSecondarySectionState,
): UiSchema => {
  const variant = resolveVariant(getPathValue(formData, 'meta.variant'));
  const inactiveVariant = variant === 'adult' ? 'child' : 'adult';
  const activeSection = showNode(uiSchema[variant]);
  const activeCards = showNode(activeSection.cards);
  const expanded = expandedSecondarySections[step] === true;

  return {
    ...uiSchema,
    'ui:order': ['meta', 'adult', 'child', 'notes', 'sender'],
    meta: hideNode(uiSchema.meta),
    [inactiveVariant]: hideNode(uiSchema[inactiveVariant]),
    notes: hideNode(uiSchema.notes),
    sender: hideNode(uiSchema.sender),
    [variant]: {
      ...activeSection,
      'ui:title': '',
      'ui:description': '',
      cards: {
        ...activeCards,
        'ui:title': '',
        'ui:order': [...CARD_STEP_IDS],
        green: buildCardStepUiSchema(activeCards, step, 'green', expanded),
        yellow: buildCardStepUiSchema(activeCards, step, 'yellow', expanded),
        red: buildCardStepUiSchema(activeCards, step, 'red', expanded),
      },
    },
  };
};

const buildNotesStepUiSchema = (uiSchema: UiSchema): UiSchema => ({
  ...uiSchema,
  'ui:order': ['notes', 'sender', 'meta', 'adult', 'child'],
  meta: hideNode(uiSchema.meta),
  adult: hideNode(uiSchema.adult),
  child: hideNode(uiSchema.child),
  notes: {
    ...showNode(uiSchema.notes),
    'ui:description': '',
  },
  sender: {
    ...showNode(uiSchema.sender),
    'ui:description': '',
  },
});

/**
 * Filters the translated pacing UI schema down to the currently active editor step.
 *
 * @param uiSchema - The translated and array-normalized pacing UI schema.
 * @param formData - Current pacing form data.
 * @param step - Active editor step identifier.
 * @param expandedSecondarySections - Local UI state for optional secondary card sections.
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
  expandedSecondarySections: PacingEditorSecondarySectionState,
): UiSchema => {
  if (step === 'variant') {
    return buildVariantStepUiSchema(uiSchema);
  }

  if (isCardStep(step)) {
    return buildCardVariantUiSchema(
      uiSchema,
      formData,
      step,
      expandedSecondarySections,
    );
  }

  if (step === 'notes') {
    return buildNotesStepUiSchema(uiSchema);
  }

  return uiSchema;
};
