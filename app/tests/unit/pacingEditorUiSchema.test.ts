import { describe, expect, it } from 'vitest';
import pacingUiSchema from '../../public/formpacks/pacing-ampelkarten/ui.schema.json';
import {
  buildPacingEditorUiSchema,
  type PacingEditorSecondarySectionState,
} from '../../src/formpacks/pacing-ampelkarten/editorUiSchema';
import type { UiSchema } from '@rjsf/utils';

type UiFieldView = {
  'ui:widget'?: string;
  'ui:title'?: string;
  'ui:options'?: {
    label?: boolean;
  };
  items?: UiFieldView;
};

type CardView = UiFieldView & {
  canDo?: UiFieldView;
  visitRules?: UiFieldView;
  stimuli?: UiFieldView;
  thanks?: UiFieldView;
};

type VariantView = UiFieldView & {
  cards?: {
    green?: CardView;
    yellow?: CardView;
    red?: CardView;
  };
};

type PacingEditorUiSchemaView = {
  meta?: UiFieldView & {
    variant?: UiFieldView;
    introAccepted?: UiFieldView;
  };
  adult?: VariantView;
  child?: VariantView;
  notes?: UiFieldView;
  sender?: UiFieldView;
};

const baseFormData = {
  meta: {
    variant: 'child',
  },
  adult: {
    cards: {
      green: {
        canDo: ['Adult'],
      },
    },
  },
  child: {
    cards: {
      green: {
        canDo: ['Child'],
      },
    },
  },
  notes: {
    title: 'Notes',
  },
  sender: {
    signature: 'Signature',
  },
} as Record<string, unknown>;

const asUiSchema = pacingUiSchema as UiSchema;
const hiddenWidget = 'hidden';

const asPacingSchemaView = (value: UiSchema): PacingEditorUiSchemaView =>
  value as unknown as PacingEditorUiSchemaView;

describe('buildPacingEditorUiSchema', () => {
  it('shows only the variant controls on the first step', () => {
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'variant', {}),
    );

    expect(view.meta?.['ui:widget']).toBeUndefined();
    expect(view.meta?.variant?.['ui:widget']).toBe('radio');
    expect(view.meta?.introAccepted?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.['ui:widget']).toBe(hiddenWidget);
    expect(view.notes?.['ui:widget']).toBe(hiddenWidget);
    expect(view.sender?.['ui:widget']).toBe(hiddenWidget);
  });

  it('shows only the active card and collapses secondary fields by default', () => {
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'green', {}),
    );

    expect(view.meta?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.canDo?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.visitRules?.['ui:widget']).toBe(
      hiddenWidget,
    );
    expect(view.child?.cards?.green?.stimuli?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.cards?.green?.thanks?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.cards?.yellow?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.cards?.red?.['ui:widget']).toBe(hiddenWidget);
  });

  it('clears technical item titles for list inputs in the editor flow', () => {
    const cardStep = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'green', {}),
    );
    const yellowStep = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'yellow', {}),
    );
    const redStep = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'red', {}),
    );
    const notesStep = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'notes', {}),
    );

    expect(cardStep.child?.cards?.green?.canDo?.items?.['ui:title']).toBe('');
    expect(cardStep.child?.cards?.green?.canDo?.items?.['ui:options']?.label).toBe(
      false,
    );
    expect(
      yellowStep.child?.cards?.yellow?.canDo?.items?.['ui:options']?.label,
    ).toBe(false);
    expect(redStep.child?.cards?.red?.canDo?.items?.['ui:options']?.label).toBe(
      false,
    );
    expect(notesStep.notes?.items?.items?.['ui:title']).toBe('');
    expect(notesStep.notes?.items?.items?.['ui:options']?.label).toBe(false);
  });

  it('reveals secondary card sections when expanded for the current color', () => {
    const expanded: PacingEditorSecondarySectionState = { green: true };
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'green', expanded),
    );

    expect(view.child?.cards?.green?.visitRules?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.stimuli?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.thanks?.['ui:widget']).toBe('textarea');
    expect(view.child?.cards?.green?.visitRules?.items?.['ui:title']).toBe('');
    expect(view.child?.cards?.green?.stimuli?.items?.['ui:title']).toBe('');
  });

  it('defaults missing variants to the adult branch on card steps', () => {
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, {}, 'yellow', {}),
    );

    expect(view.adult?.['ui:widget']).toBeUndefined();
    expect(view.child?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.cards?.yellow?.['ui:widget']).toBeUndefined();
  });

  it('shows notes and sender on the notes step', () => {
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'notes', {}),
    );

    expect(view.notes?.['ui:widget']).toBeUndefined();
    expect(view.sender?.['ui:widget']).toBeUndefined();
    expect(view.meta?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.['ui:widget']).toBe(hiddenWidget);
  });

  it('removes stale hidden widgets when a step becomes visible again', () => {
    const baseMeta = asUiSchema.meta as Record<string, unknown>;
    const schemaWithHiddenVariant = {
      ...asUiSchema,
      meta: {
        ...baseMeta,
        variant: {
          ...(baseMeta.variant as Record<string, unknown>),
          'ui:widget': 'hidden',
        },
      },
    } as UiSchema;

    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(
        schemaWithHiddenVariant,
        baseFormData,
        'variant',
        {},
      ),
    );

    expect(view.meta?.variant?.['ui:widget']).toBeUndefined();
  });

  it('returns the original schema unchanged on the preview step', () => {
    const result = buildPacingEditorUiSchema(
      asUiSchema,
      baseFormData,
      'preview',
      {},
    );

    expect(result).toBe(asUiSchema);
  });

  it('recreates hidden list item schema defaults when an array field has no item ui schema', () => {
    const childSection = asUiSchema.child as Record<string, unknown>;
    const childCards = childSection.cards as Record<string, unknown>;
    const greenCard = childCards.green as Record<string, unknown>;
    const canDoField = greenCard.canDo as Record<string, unknown>;
    const schemaWithoutItemUi = {
      ...asUiSchema,
      child: {
        ...childSection,
        cards: {
          ...childCards,
          green: {
            ...greenCard,
            canDo: Object.fromEntries(
              Object.entries(canDoField).filter(([key]) => key !== 'items'),
            ),
          },
        },
      },
    } as UiSchema;

    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(schemaWithoutItemUi, baseFormData, 'green', {}),
    );

    expect(view.child?.cards?.green?.canDo?.items?.['ui:title']).toBe('');
  });

  it('falls back to empty meta and notes sections when the ui schema shape is incomplete', () => {
    const incompleteSchema = {
      ...asUiSchema,
      meta: undefined,
      notes: undefined,
    } as unknown as UiSchema;

    const variantView = asPacingSchemaView(
      buildPacingEditorUiSchema(incompleteSchema, baseFormData, 'variant', {}),
    );
    const notesView = asPacingSchemaView(
      buildPacingEditorUiSchema(incompleteSchema, baseFormData, 'notes', {}),
    );

    expect(variantView.meta?.variant?.['ui:widget']).toBeUndefined();
    expect(variantView.meta?.introAccepted?.['ui:widget']).toBe(hiddenWidget);
    expect(notesView.notes?.['ui:widget']).toBeUndefined();
    expect(notesView.notes?.items?.items?.['ui:title']).toBe('');
  });
});
