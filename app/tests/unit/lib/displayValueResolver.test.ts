import { describe, expect, it, vi } from 'vitest';
import type { UiSchema } from '@rjsf/utils';
import type { RJSFSchema } from '@rjsf/utils';
import { resolveDisplayValue } from '../../../src/lib/displayValueResolver';

describe('resolveDisplayValue', () => {
  it('returns empty string for nullish values', () => {
    expect(resolveDisplayValue(null)).toBe('');
    expect(resolveDisplayValue(undefined)).toBe('');
  });

  it('formats booleans with translation fallback', () => {
    const t = vi.fn(
      (key: string, options?: { ns?: string; defaultValue?: string }) => {
        if (options?.ns !== 'app') {
          return options?.defaultValue ?? key;
        }
        if (key === 'common.true') {
          return 'Ja';
        }
        if (key === 'common.false') {
          return 'Nein';
        }
        return options?.defaultValue ?? key;
      },
    );

    expect(resolveDisplayValue(true, { t, namespace: 'app' })).toBe('Ja');
    expect(resolveDisplayValue(false, { t, namespace: 'app' })).toBe('Nein');
  });

  it('formats booleans without translations', () => {
    expect(resolveDisplayValue(true)).toBe('true');
    expect(resolveDisplayValue(false)).toBe('false');
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
        if (options?.ns !== 'formpack') {
          return options?.defaultValue ?? key;
        }
        if (key === 'option.yes') {
          return 'Oui';
        }
        return options?.defaultValue ?? key;
      },
    );

    expect(
      resolveDisplayValue('yes', { schema, uiSchema, t, namespace: 'formpack' }),
    ).toBe('Oui');
  });

  it('falls back to stringifying objects', () => {
    expect(resolveDisplayValue({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });
});
