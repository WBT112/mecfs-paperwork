import { translateUiSchema } from '../../../src/i18n/rjsf';
import { describe, expect, it, vi } from 'vitest';

describe('translateUiSchema', () => {
  it('translates ui:title, ui:description, and ui:help values', () => {
    const uiSchema = {
      'ui:title': 't:title',
      'ui:description': 't:description',
      'ui:help': 't:help',
      nested: {
        'ui:title': 't:nested.title',
      },
    };
    const t = vi.fn((key) => `translated:${key}`);
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      'ui:title': 'translated:title',
      'ui:description': 'translated:description',
      'ui:help': 'translated:help',
      nested: {
        'ui:title': 'translated:nested.title',
      },
    });
    expect(t).toHaveBeenCalledWith('title', {
      ns: 'test',
      defaultValue: 'title',
    });
    expect(t).toHaveBeenCalledWith('description', {
      ns: 'test',
      defaultValue: 'description',
    });
    expect(t).toHaveBeenCalledWith('help', { ns: 'test', defaultValue: 'help' });
    expect(t).toHaveBeenCalledWith('nested.title', {
      ns: 'test',
      defaultValue: 'nested.title',
    });
  });

  it('does not translate non-string values', () => {
    const uiSchema = {
      'ui:title': 123,
      'ui:description': null,
      'ui:help': undefined,
      'ui:widget': 'custom',
    };
    const t = vi.fn();
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual(uiSchema);
    expect(t).not.toHaveBeenCalled();
  });

  it('does not translate values that do not look like translation keys', () => {
    const uiSchema = {
      'ui:title': 'Not a key',
      'ui:description': ' also not a key ',
      'ui:help': '',
    };
    const t = vi.fn();
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual(uiSchema);
    expect(t).not.toHaveBeenCalled();
  });

  it('handles arrays in the uiSchema', () => {
    const uiSchema = {
      items: [
        {
          'ui:title': 't:item1',
        },
        {
          'ui:title': 't:item2',
        },
      ],
    };
    const t = vi.fn((key) => `translated:${key}`);
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      items: [
        {
          'ui:title': 'translated:item1',
        },
        {
          'ui:title': 'translated:item2',
        },
      ],
    });
  });
});
