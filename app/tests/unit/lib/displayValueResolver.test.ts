import { describe, expect, it, vi } from 'vitest';
import type { UiSchema } from '@rjsf/utils';
import type { RJSFSchema } from '@rjsf/utils';
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
});
