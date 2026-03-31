import { describe, expect, it } from 'vitest';
import i18n from '../../../src/i18n';
import {
  getSpoonManagerActionById,
  getSpoonManagerActions,
  getSpoonManagerEventById,
  getSpoonManagerEvents,
  getSpoonManagerPhaseFlavorById,
  getSpoonManagerPhaseFlavors,
  getSpoonManagerPhaseFlavorsForPhase,
  getSpoonManagerResultFlavorById,
  getSpoonManagerResultFlavors,
  getSpoonManagerStartFlavorById,
  getSpoonManagerStartFlavors,
} from '../../../src/features/games/spoon-manager/data/content';

describe('Spoon Manager content i18n', () => {
  it('keeps the content model complete for both locales', () => {
    const actions = getSpoonManagerActions();
    const events = getSpoonManagerEvents();
    const phaseFlavors = getSpoonManagerPhaseFlavors();
    const resultFlavors = getSpoonManagerResultFlavors();
    const startFlavors = getSpoonManagerStartFlavors();

    expect(startFlavors).toHaveLength(20);
    expect(
      phaseFlavors.filter((entry) => entry.phase === 'morning'),
    ).toHaveLength(10);
    expect(
      phaseFlavors.filter((entry) => entry.phase === 'midday'),
    ).toHaveLength(10);
    expect(
      phaseFlavors.filter((entry) => entry.phase === 'evening'),
    ).toHaveLength(10);
    expect(actions).toHaveLength(36);
    expect(events).toHaveLength(20);
    expect(resultFlavors).toHaveLength(24);

    for (const locale of ['de', 'en'] as const) {
      for (const key of [
        ...startFlavors.map((entry) => entry.textKey),
        ...phaseFlavors.map((entry) => entry.textKey),
        ...actions.flatMap((entry) => [entry.titleKey, entry.feedbackKey]),
        ...events.map((entry) => entry.textKey),
        ...resultFlavors.map((entry) => entry.textKey),
      ]) {
        expect(i18n.exists(key, { lng: locale })).toBe(true);
        expect(i18n.t(key, { lng: locale })).not.toBe(key);
      }
    }
  });

  it('returns undefined for unknown ids and an empty list for invalid phases', () => {
    expect(getSpoonManagerActionById('missing-action')).toBeUndefined();
    expect(getSpoonManagerEventById('missing-event')).toBeUndefined();
    expect(getSpoonManagerStartFlavorById('missing-start')).toBeUndefined();
    expect(getSpoonManagerPhaseFlavorById('missing-phase')).toBeUndefined();
    expect(getSpoonManagerResultFlavorById('missing-result')).toBeUndefined();
    expect(getSpoonManagerPhaseFlavorsForPhase('late-night' as never)).toEqual(
      [],
    );
  });
});
