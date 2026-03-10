import { describe, expect, it } from 'vitest';
import pacingUiSchema from '../../public/formpacks/pacing-ampelkarten/ui.schema.json';
import {
  buildPacingEditorUiSchema,
  type PacingEditorSecondarySectionState,
} from '../../src/formpacks/pacing-ampelkarten/editorUiSchema';
import type { UiSchema } from '@rjsf/utils';

type UiFieldView = {
  'ui:widget'?: string;
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

  it('reveals secondary card sections when expanded for the current color', () => {
    const expanded: PacingEditorSecondarySectionState = { green: true };
    const view = asPacingSchemaView(
      buildPacingEditorUiSchema(asUiSchema, baseFormData, 'green', expanded),
    );

    expect(view.child?.cards?.green?.visitRules?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.stimuli?.['ui:widget']).toBeUndefined();
    expect(view.child?.cards?.green?.thanks?.['ui:widget']).toBe('textarea');
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
});
