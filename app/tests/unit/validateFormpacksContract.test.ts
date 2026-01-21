import { describe, expect, it } from 'vitest';
import {
  collectTranslationKeys,
  getMissingKeys,
  getTranslationKeySet,
} from '../../scripts/validate-formpacks.mjs';

describe('formpack validation helpers', () => {
  it('collects i18n keys referenced by t: values', () => {
    const keys = new Set<string>();
    collectTranslationKeys(
      {
        title: 't:pack.title',
        nested: {
          description: 't:pack.description',
        },
        list: ['t:pack.list', 'plain'],
      },
      keys,
    );

    expect([...keys].sort()).toEqual(
      ['pack.description', 'pack.list', 'pack.title'].sort(),
    );
  });

  it('detects missing keys between translation sets', () => {
    const expected = getTranslationKeySet({
      'pack.title': 'Title',
      'pack.description': 'Description',
    });
    const actual = getTranslationKeySet({
      'pack.title': 'Title',
    });

    expect(getMissingKeys(expected, actual)).toEqual(['pack.description']);
  });
});
