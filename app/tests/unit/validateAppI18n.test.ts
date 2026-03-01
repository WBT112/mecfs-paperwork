// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  collectStringLeafKeys,
  getMissingKeys,
  getTranslationKeySet,
  validateResourceParity,
} from '../../scripts/validate-app-i18n.mjs';

describe('validate-app-i18n', () => {
  it('collects dotted keys for nested string leaves', () => {
    const keys = new Set<string>();
    collectStringLeafKeys(
      {
        top: 'value',
        nested: {
          child: 'x',
          deep: { leaf: 'y' },
          ignoredArray: ['x'],
        },
      },
      keys,
    );

    expect([...keys].sort()).toEqual([
      'nested.child',
      'nested.deep.leaf',
      'top',
    ]);
  });

  it('builds key set and computes missing keys', () => {
    const de = getTranslationKeySet({ a: 'A', nested: { b: 'B' } });
    const en = getTranslationKeySet({ a: 'A' });

    expect([...de].sort()).toEqual(['a', 'nested.b']);
    expect(getMissingKeys(de, en)).toEqual(['nested.b']);
  });

  it('reports parity gaps across de/en resources', () => {
    const parity = validateResourceParity({
      de: {
        same: 'x',
        deOnly: 'y',
      },
      en: {
        same: 'x',
        enOnly: 'z',
      },
    });

    expect(parity.missingInDe).toEqual(['enOnly']);
    expect(parity.missingInEn).toEqual(['deOnly']);
  });
});
