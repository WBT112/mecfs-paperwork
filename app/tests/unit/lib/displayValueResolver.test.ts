import { describe, expect, it, vi } from 'vitest';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { resolveDisplayValue } from '../../../src/lib/displayValueResolver';

describe('resolveDisplayValue', () => {
  const FORMPACK_ID = 'notfallpass';
  const PACK_NS = `formpack:${FORMPACK_ID}`;
  const MECFS_FIELD_PATH = 'diagnoses.meCfs';
  const PARAGRAPH_KEY = `${FORMPACK_ID}.export.${MECFS_FIELD_PATH}.paragraph`;
  const POTS_PARAGRAPH_KEY = `${FORMPACK_ID}.export.diagnoses.pots.paragraph`;
  const MECFS_FALSE_PARAGRAPH_KEY = `${FORMPACK_ID}.export.${MECFS_FIELD_PATH}.false.paragraph`;

  it('returns empty string for nullish values', () => {
    expect(resolveDisplayValue(null)).toBe('');
    expect(resolveDisplayValue(undefined)).toBe('');
  });

  it('formats booleans with translation fallback', () => {
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (!options) {
          return key;
        }
        if (options.ns !== PACK_NS) {
          return options.defaultValue ?? key;
        }
        if (key === PARAGRAPH_KEY) {
          return 'Paragraph';
        }
        return options.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue(true, {
        t,
        namespace: PACK_NS,
        formpackId: FORMPACK_ID,
        fieldPath: MECFS_FIELD_PATH,
      }),
    ).toBe('Paragraph');
    expect(
      resolveDisplayValue(false, {
        t,
        namespace: PACK_NS,
        formpackId: FORMPACK_ID,
        fieldPath: MECFS_FIELD_PATH,
      }),
    ).toBe('');
  });

  it('formats booleans without translations', () => {
    expect(resolveDisplayValue(true)).toBe('');
    expect(resolveDisplayValue(false)).toBe('');
  });

  it('resolves enum labels with ui:enumNames', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['alpha', 'beta'],
    };
    const uiSchema: UiSchema = {
      'ui:enumNames': ['Alpha', 'Beta'],
    };

    expect(resolveDisplayValue('beta', { schema, uiSchema })).toBe('Beta');
  });

  it('translates enum labels with t: prefix', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['yes'],
    };
    const uiSchema: UiSchema = {
      'ui:enumNames': ['t:option.yes'],
    };
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (!options) {
          return key;
        }
        if (options.ns !== 'formpack') {
          return options.defaultValue ?? key;
        }
        if (key === 'option.yes') {
          return 'Oui';
        }
        return options.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue('yes', {
        schema,
        uiSchema,
        t,
        namespace: 'formpack',
      }),
    ).toBe('Oui');
  });

  it('resolves an additional diagnosis paragraph key', () => {
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (!options) {
          return key;
        }
        if (options.ns !== PACK_NS) {
          return options.defaultValue ?? key;
        }
        if (key === POTS_PARAGRAPH_KEY) {
          return 'POTS paragraph';
        }
        return options.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue(true, {
        t,
        namespace: PACK_NS,
        formpackId: 'notfallpass',
        fieldPath: 'diagnoses.pots',
      }),
    ).toBe('POTS paragraph');
  });

  it('does not translate enum labels that contain surrounding whitespace', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['value'],
    };
    const uiSchema: UiSchema = {
      'ui:enumNames': [' key.with.whitespace '],
    };
    const t = vi.fn((key: string) => `translated:${key}`);

    expect(resolveDisplayValue('value', { schema, uiSchema, t })).toBe(
      ' key.with.whitespace ',
    );
    expect(t).not.toHaveBeenCalled();
  });

  it('does not translate enum labels containing spaces', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['value'],
    };
    const uiSchema: UiSchema = {
      'ui:enumNames': ['key with space'],
    };
    const t = vi.fn((key: string) => `translated:${key}`);

    expect(resolveDisplayValue('value', { schema, uiSchema, t })).toBe(
      'key with space',
    );
    expect(t).not.toHaveBeenCalled();
  });

  it('does not translate empty translation-prefixed enum labels', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['value'],
    };
    const uiSchema: UiSchema = {
      'ui:enumNames': ['t:   '],
    };
    const t = vi.fn((key: string) => `translated:${key}`);

    expect(resolveDisplayValue('value', { schema, uiSchema, t })).toBe('t:   ');
    expect(t).not.toHaveBeenCalled();
  });

  it('translates dotted enum labels without t: prefix', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['value'],
    };
    const uiSchema: UiSchema = {
      'ui:enumNames': ['option.value'],
    };
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (!options) {
          return key;
        }
        if (options.ns !== 'formpack') {
          return options.defaultValue ?? key;
        }
        if (key === 'option.value') {
          return 'Translated dotted label';
        }
        return options.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue('value', {
        schema,
        uiSchema,
        t,
        namespace: 'formpack',
      }),
    ).toBe('Translated dotted label');
  });

  it('returns the original enum value when no enum option matches', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['known'],
    };

    expect(resolveDisplayValue('unknown', { schema })).toBe('unknown');
  });

  it('returns the original value when enum options are empty', () => {
    const schema: RJSFSchema = {
      type: 'string',
    };

    expect(resolveDisplayValue('plain', { schema })).toBe('plain');
  });

  it('stringifies non-string enum labels', () => {
    const schema: RJSFSchema = {
      type: 'string',
      enum: ['value'],
    };
    const uiSchema = {
      'ui:enumNames': [123],
    } as unknown as UiSchema;

    expect(resolveDisplayValue('value', { schema, uiSchema })).toBe('123');
  });

  it('uses the default formpack namespace for boolean paragraphs', () => {
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (!options) {
          return key;
        }
        if (key === PARAGRAPH_KEY && options.ns === PACK_NS) {
          return 'Default namespace paragraph';
        }
        return options.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue(true, {
        t,
        formpackId: FORMPACK_ID,
        fieldPath: MECFS_FIELD_PATH,
      }),
    ).toBe('Default namespace paragraph');
  });

  it('returns empty string when true paragraph translation is missing', () => {
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) =>
        options?.defaultValue ?? key,
    );

    expect(
      resolveDisplayValue(true, {
        t,
        formpackId: FORMPACK_ID,
        fieldPath: MECFS_FIELD_PATH,
      }),
    ).toBe('');
  });

  it('uses the first translated false paragraph variant', () => {
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (!options) {
          return key;
        }
        if (key === MECFS_FALSE_PARAGRAPH_KEY) {
          return 'Negative paragraph';
        }
        return options.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue(false, {
        t,
        formpackId: FORMPACK_ID,
        fieldPath: MECFS_FIELD_PATH,
      }),
    ).toBe('Negative paragraph');
  });

  it('falls back to stringifying objects', () => {
    expect(resolveDisplayValue({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });

  it('returns an empty string for non-serializable objects', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(resolveDisplayValue(value)).toBe('');
  });

  it('returns serialized output for empty objects', () => {
    expect(resolveDisplayValue({})).toBe('{}');
  });

  describe('array formatting', () => {
    it('formats string arrays with join mode (default)', () => {
      const values = ['item1', 'item2', 'item3'];
      expect(resolveDisplayValue(values)).toBe('item1, item2, item3');
    });

    it('formats string arrays with bullets mode', () => {
      const values = ['item1', 'item2', 'item3'];
      expect(resolveDisplayValue(values, { formatMode: 'bullets' })).toBe(
        '• item1\n• item2\n• item3',
      );
    });

    it('returns empty string for empty arrays', () => {
      expect(resolveDisplayValue([])).toBe('');
      expect(resolveDisplayValue([], { formatMode: 'bullets' })).toBe('');
    });

    it('filters out empty strings and null values', () => {
      const values = ['item1', '', null, 'item2', undefined];
      expect(resolveDisplayValue(values)).toBe('item1, item2');
    });

    it('formats arrays with enum values', () => {
      const schema: RJSFSchema = {
        type: 'array',
        items: {
          type: 'string',
          enum: ['alpha', 'beta', 'gamma'],
        },
      };
      const uiSchema: UiSchema = {
        items: {
          'ui:enumNames': ['Alpha', 'Beta', 'Gamma'],
        },
      };

      expect(
        resolveDisplayValue(['alpha', 'gamma'], { schema, uiSchema }),
      ).toBe('Alpha, Gamma');
    });

    it('formats arrays with enum values in bullets mode', () => {
      const schema: RJSFSchema = {
        type: 'array',
        items: {
          type: 'string',
          enum: ['option1', 'option2'],
        },
      };
      const uiSchema: UiSchema = {
        items: {
          'ui:enumNames': ['Option One', 'Option Two'],
        },
      };

      expect(
        resolveDisplayValue(['option1', 'option2'], {
          schema,
          uiSchema,
          formatMode: 'bullets',
        }),
      ).toBe('• Option One\n• Option Two');
    });

    it('formats numeric arrays', () => {
      const values = [1, 2, 3];
      expect(resolveDisplayValue(values)).toBe('1, 2, 3');
    });

    it('handles mixed valid types in arrays', () => {
      const values = ['text', 42, 'more text'];
      expect(resolveDisplayValue(values)).toBe('text, 42, more text');
    });

    it('ignores objects in arrays', () => {
      const values = ['item1', { nested: 'object' }, 'item2'];
      expect(resolveDisplayValue(values)).toBe('item1, item2');
    });

    it('returns empty string when all array items are filtered out', () => {
      expect(resolveDisplayValue([{}])).toBe('');
    });
  });

  it('formats top-level primitive numbers and strings', () => {
    expect(resolveDisplayValue(42)).toBe('42');
    expect(resolveDisplayValue('plain text')).toBe('plain text');
  });

  it('returns empty string when JSON.stringify returns undefined', () => {
    expect(resolveDisplayValue(() => undefined)).toBe('');
  });

  it('returns empty string when JSON.stringify throws', () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(resolveDisplayValue(circular)).toBe('');
  });

  describe('raw-value guard (regression prevention)', () => {
    it('never returns raw boolean true in export model', () => {
      // Without translation context, boolean should resolve to empty string
      const result = resolveDisplayValue(true);
      expect(result).toBe('');
      expect(typeof result).toBe('string');
    });

    it('never returns raw boolean false in export model', () => {
      const result = resolveDisplayValue(false);
      expect(result).toBe('');
      expect(typeof result).toBe('string');
    });

    it('boolean with translation returns string, not raw boolean', () => {
      const t = vi.fn(
        (key: string, options?: { ns?: string; defaultValue?: string }) => {
          if (!options) return key;
          if (key === 'notfallpass.export.field.paragraph')
            return 'Translated text';
          return options.defaultValue ?? key;
        },
      );

      const result = resolveDisplayValue(true, {
        t,
        namespace: PACK_NS,
        formpackId: FORMPACK_ID,
        fieldPath: 'field',
      });

      expect(result).toBe('Translated text');
      expect(typeof result).toBe('string');
    });

    it('enum values return string labels, not raw enum values', () => {
      const schema: RJSFSchema = {
        type: 'string',
        enum: ['TECHNICAL_VALUE_A', 'TECHNICAL_VALUE_B'],
      };
      const uiSchema: UiSchema = {
        'ui:enumNames': ['User Friendly A', 'User Friendly B'],
      };

      const result = resolveDisplayValue('TECHNICAL_VALUE_A', {
        schema,
        uiSchema,
      });

      expect(result).toBe('User Friendly A');
      expect(result).not.toBe('TECHNICAL_VALUE_A');
    });
  });
});
