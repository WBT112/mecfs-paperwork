import { describe, expect, it } from 'vitest';

describe('formpack validation helpers', () => {
  it('collects i18n keys referenced by t: values', async () => {
    // @ts-ignore -- importing CLI script without type declarations.
    // prettier-ignore
    const { collectTranslationKeys } = await import('../../scripts/validate-formpacks.mjs');
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

  it('detects missing keys between translation sets', async () => {
    // @ts-ignore -- importing CLI script without type declarations.
    // prettier-ignore
    const { getMissingKeys, getTranslationKeySet } = await import('../../scripts/validate-formpacks.mjs');
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
