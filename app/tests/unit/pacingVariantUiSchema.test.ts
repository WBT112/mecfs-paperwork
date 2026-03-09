import { describe, expect, it } from 'vitest';
import type { UiSchema } from '@rjsf/utils';
import { buildPacingVariantUiSchema } from '../../src/formpacks/pacing-ampelkarten/variantUiSchema';

const baseUiSchema: UiSchema = {
  adult: {
    'ui:title': 'adult',
  },
  child: {
    'ui:title': 'child',
    'ui:widget': 'hidden',
  },
  notes: {
    'ui:title': 'notes',
  },
};

describe('buildPacingVariantUiSchema', () => {
  it('shows the adult section and hides the child section by default', () => {
    const result = buildPacingVariantUiSchema(baseUiSchema, {});

    expect(result.adult).toEqual({
      'ui:title': 'adult',
    });
    expect(result.child).toEqual({
      'ui:title': 'child',
      'ui:widget': 'hidden',
    });
    expect(result.notes).toEqual({
      'ui:title': 'notes',
    });
  });

  it('shows the child section and hides the adult section for child mode', () => {
    const result = buildPacingVariantUiSchema(baseUiSchema, {
      meta: {
        variant: 'child',
      },
    });

    expect(result.adult).toEqual({
      'ui:title': 'adult',
      'ui:widget': 'hidden',
    });
    expect(result.child).toEqual({
      'ui:title': 'child',
    });
  });
});
