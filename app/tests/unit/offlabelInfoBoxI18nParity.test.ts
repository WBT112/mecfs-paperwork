// @vitest-environment node
import { describe, expect, it } from 'vitest';
import deJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';

const INFOBOX_PREFIX = 'offlabel-antrag.ui.infobox.';

const getInfoBoxKeys = (bundle: Record<string, string>) =>
  Object.keys(bundle)
    .filter((key) => key.startsWith(INFOBOX_PREFIX))
    .sort();

describe('offlabel info box i18n parity', () => {
  it('keeps DE/EN info box key sets aligned', () => {
    const deKeys = getInfoBoxKeys(deJson as Record<string, string>);
    const enKeys = getInfoBoxKeys(enJson as Record<string, string>);

    expect(deKeys.length).toBeGreaterThan(0);
    expect(deKeys).toEqual(enKeys);
  });

  it('contains the indication-selection info box key in both locales', () => {
    expect(deJson).toHaveProperty(
      'offlabel-antrag.ui.infobox.selectedIndicationKey',
    );
    expect(enJson).toHaveProperty(
      'offlabel-antrag.ui.infobox.selectedIndicationKey',
    );
  });

  it('keeps flow-status keys aligned in DE and EN', () => {
    const flowStatusKeys = [
      'offlabel-antrag.ui.flowStatus.regular',
      'offlabel-antrag.ui.flowStatus.regularWithAux',
      'offlabel-antrag.ui.flowStatus.directSection2',
    ];

    for (const key of flowStatusKeys) {
      expect(deJson).toHaveProperty(key);
      expect(enJson).toHaveProperty(key);
    }
  });
});
