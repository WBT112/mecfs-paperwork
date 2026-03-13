import { describe, expect, it } from 'vitest';
import pacingUiSchema from '../../public/formpacks/pacing-ampelkarten/ui.schema.json';
import {
  buildPacingEditorUiSchema,
  type PacingEditorCardColor,
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
  needHelp?: UiFieldView;
  hint?: UiFieldView;
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
} as Record<string, unknown>;

const asUiSchema = pacingUiSchema as UiSchema;
const hiddenWidget = 'hidden';

const asPacingSchemaView = (value: UiSchema): PacingEditorUiSchemaView =>
  value as unknown as PacingEditorUiSchemaView;

const getCardView = (
  step: PacingEditorCardColor,
  formData = baseFormData,
): PacingEditorUiSchemaView =>
  asPacingSchemaView(buildPacingEditorUiSchema(asUiSchema, formData, step));

describe('buildPacingEditorUiSchema', () => {
  it('shows only the variant controls on the first step', () => {
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'variant'),
    );

    expect(view.meta?.['ui:widget']).toBeUndefined();
    expect(view.meta?.variant?.['ui:widget']).toBe('radio');
    expect(view.meta?.introAccepted?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.['ui:widget']).toBe(hiddenWidget);
  });

  it('shows only the active card and hides the other cards', () => {
    const view = getCardView('green');

    expect(view.meta?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.yellow?.['ui:widget']).toBe(hiddenWidget);
    expect(view.child?.cards?.red?.['ui:widget']).toBe(hiddenWidget);
  });

  it('keeps list-item labels suppressed for every card step', () => {
    for (const step of ['green', 'yellow', 'red'] as const) {
      const view = getCardView(step);
      const card = view.child?.cards?.[step];

      expect(card?.canDo?.items?.['ui:title']).toBe('');
      expect(card?.canDo?.items?.['ui:options']?.label).toBe(false);
      expect(card?.needHelp?.items?.['ui:title']).toBe('');
      expect(card?.needHelp?.items?.['ui:options']?.label).toBe(false);
    }
  });

  it('keeps only the simplified card fields visible on card steps', () => {
    const view = getCardView('yellow');
    const yellowCard = view.child?.cards?.yellow;

    expect(yellowCard?.canDo?.['ui:widget']).toBeUndefined();
    expect(yellowCard?.needHelp?.['ui:widget']).toBeUndefined();
    expect(yellowCard?.hint?.['ui:widget']).toBe('textarea');
    expect((yellowCard as Record<string, unknown>).visitRules).toBeUndefined();
    expect((yellowCard as Record<string, unknown>).stimuli).toBeUndefined();
    expect((yellowCard as Record<string, unknown>).thanks).toBeUndefined();
  });

  it('defaults missing variants to the adult branch on card steps', () => {
    const view = getCardView('yellow', {});

    expect(view.adult?.['ui:widget']).toBeUndefined();
    expect(view.child?.['ui:widget']).toBe(hiddenWidget);
    expect(view.adult?.cards?.yellow?.['ui:widget']).toBeUndefined();
  });

  it('returns the original schema unchanged on the preview step', () => {
    const result = buildPacingEditorUiSchema(
      asUiSchema,
      baseFormData,
      'preview',
    );

    expect(result).toBe(asUiSchema);
  });

  it('recreates hidden list item defaults when an array field has no item ui schema', () => {
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
      buildPacingEditorUiSchema(schemaWithoutItemUi, baseFormData, 'green'),
    );

    expect(view.child?.cards?.green?.canDo?.items?.['ui:title']).toBe('');
    expect(view.child?.cards?.green?.canDo?.items?.['ui:options']?.label).toBe(
      false,
    );
  });

  it('falls back to an empty meta section when the ui schema shape is incomplete', () => {
    const incompleteSchema = {
      ...asUiSchema,
      meta: undefined,
    } as unknown as UiSchema;

    const variantView = asPacingSchemaView(
      buildPacingEditorUiSchema(incompleteSchema, baseFormData, 'variant'),
    );

    expect(variantView.meta?.variant?.['ui:widget']).toBeUndefined();
    expect(variantView.meta?.introAccepted?.['ui:widget']).toBe(hiddenWidget);
  });

  it('unhides hidden active sections and tolerates malformed card field nodes', () => {
    const childSection = asUiSchema.child as Record<string, unknown>;
    const childCards = childSection.cards as Record<string, unknown>;
    const greenCard = childCards.green as Record<string, unknown>;
    const hiddenSchema = {
      ...asUiSchema,
      child: {
        ...childSection,
        'ui:widget': hiddenWidget,
        cards: {
          ...childCards,
          'ui:widget': hiddenWidget,
          green: {
            ...greenCard,
            'ui:widget': hiddenWidget,
            canDo: null,
          },
        },
      },
    } as UiSchema;

    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(hiddenSchema, baseFormData, 'green'),
    );

    expect(view.child?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.canDo?.items?.['ui:title']).toBe('');
    expect(view.child?.cards?.green?.canDo?.items?.['ui:options']?.label).toBe(
      false,
    );
  });
});
