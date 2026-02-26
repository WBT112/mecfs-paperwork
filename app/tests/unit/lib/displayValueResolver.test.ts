import { describe, expect, it, vi } from 'vitest';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { resolveDisplayValue } from '../../../src/lib/displayValueResolver';

describe('resolveDisplayValue', () => {
  const PACK_NS = 'formpack:notfallpass';
  const PARAGRAPH_KEY = 'notfallpass.export.diagnoses.meCfs.paragraph';
  const POTS_PARAGRAPH_KEY = 'notfallpass.export.diagnoses.pots.paragraph';

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
        formpackId: 'notfallpass',
        fieldPath: 'diagnoses.meCfs',
      }),
    ).toBe('Paragraph');
    expect(
      resolveDisplayValue(false, {
        t,
        namespace: PACK_NS,
        formpackId: 'notfallpass',
        fieldPath: 'diagnoses.meCfs',
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
        namespace: 'formpack:notfallpass',
        formpackId: 'notfallpass',
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
