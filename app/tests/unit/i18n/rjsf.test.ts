import type { TFunction } from 'i18next';
import type { UiSchema } from '@rjsf/utils';
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
    const t = vi.fn((key) => `translated:${key}`) as unknown as TFunction;
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
    expect(t).toHaveBeenCalledWith('help', {
      ns: 'test',
      defaultValue: 'help',
    });
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
    } as unknown as UiSchema;
    const t = vi.fn() as unknown as TFunction;
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual(uiSchema);
    expect(t).not.toHaveBeenCalled();
  });

  it('does not translate values that do not look like translation keys', () => {
    const uiSchema = {
      'ui:title': 'Not a key',
      'ui:description': ' also not a key ',
      'ui:help': '',
    } as UiSchema;
    const t = vi.fn() as unknown as TFunction;
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
    } as unknown as UiSchema;
    const t = vi.fn((key) => `translated:${key}`) as unknown as TFunction;
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

  it('translates ui:enumNames arrays of translation keys', () => {
    const uiSchema = {
      'ui:enumNames': ['t:option1', 't:option2', 't:option3'],
    } as UiSchema;
    const t = vi.fn((key) => `translated:${key}`) as unknown as TFunction;
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      'ui:enumNames': [
        'translated:option1',
        'translated:option2',
        'translated:option3',
      ],
    });
    expect(t).toHaveBeenCalledWith('option1', {
      ns: 'test',
      defaultValue: 'option1',
    });
    expect(t).toHaveBeenCalledWith('option2', {
      ns: 'test',
      defaultValue: 'option2',
    });
    expect(t).toHaveBeenCalledWith('option3', {
      ns: 'test',
      defaultValue: 'option3',
    });
  });

  it('does not translate ui:enumNames items that are not translation keys', () => {
    const uiSchema = {
      'ui:enumNames': ['Regular Value', 't:translationKey', 'Another Value'],
    } as UiSchema;
    const t = vi.fn((key) => `translated:${key}`) as unknown as TFunction;
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      'ui:enumNames': [
        'Regular Value',
        'translated:translationKey',
        'Another Value',
      ],
    });
    expect(t).toHaveBeenCalledTimes(1);
    expect(t).toHaveBeenCalledWith('translationKey', {
      ns: 'test',
      defaultValue: 'translationKey',
    });
  });

  it('handles nested ui:enumNames in complex ui schemas', () => {
    const uiSchema = {
      'ui:title': 't:form.title',
      field1: {
        'ui:enumNames': ['t:field1.opt1', 't:field1.opt2'],
      },
      nested: {
        field2: {
          'ui:enumNames': ['t:field2.opt1', 't:field2.opt2', 't:field2.opt3'],
        },
      },
    } as UiSchema;
    const t = vi.fn((key) => `translated:${key}`) as unknown as TFunction;
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      'ui:title': 'translated:form.title',
      field1: {
        'ui:enumNames': ['translated:field1.opt1', 'translated:field1.opt2'],
      },
      nested: {
        field2: {
          'ui:enumNames': [
            'translated:field2.opt1',
            'translated:field2.opt2',
            'translated:field2.opt3',
          ],
        },
      },
    });
  });

  it('handles ui:enumNames with non-string values gracefully', () => {
    const uiSchema = {
      'ui:enumNames': ['t:option1', 123, null, 't:option2'],
    } as unknown as UiSchema;
    const t = vi.fn((key) => `translated:${key}`) as unknown as TFunction;
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      'ui:enumNames': ['translated:option1', 123, null, 'translated:option2'],
    });
    expect(t).toHaveBeenCalledTimes(2);
  });

  it('handles empty ui:enumNames arrays', () => {
    const uiSchema = {
      'ui:enumNames': [],
    } as UiSchema;
    const t = vi.fn() as unknown as TFunction;
    const translated = translateUiSchema(uiSchema, t, 'test');
    expect(translated).toEqual({
      'ui:enumNames': [],
    });
    expect(t).not.toHaveBeenCalled();
  });
});
