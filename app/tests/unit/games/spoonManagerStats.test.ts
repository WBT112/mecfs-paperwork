import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultSpoonGameStats,
  readSpoonGameStats,
  recordSpoonGameResult,
  saveSpoonGameStats,
} from '../../../src/features/games/spoon-manager/storage/stats';

const STORAGE_KEY = 'mecfs-paperwork.games.spoon-manager.stats.v1';

describe('Spoon Manager stats storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults for empty or malformed storage data', () => {
    expect(readSpoonGameStats()).toEqual(createDefaultSpoonGameStats());

    window.localStorage.setItem(STORAGE_KEY, 'not-json');
    expect(readSpoonGameStats()).toEqual(createDefaultSpoonGameStats());

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(7));
    expect(readSpoonGameStats()).toEqual(createDefaultSpoonGameStats());

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ totalRuns: 1, stableRuns: 'wrong' }),
    );
    expect(readSpoonGameStats()).toEqual(createDefaultSpoonGameStats());

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        totalRuns: 1,
        stableRuns: 0,
        narrowRuns: 0,
        crashRuns: 0,
        bestRemainingSpoons: 1.5,
        lastStatus: 'unknown',
      }),
    );
    expect(readSpoonGameStats()).toEqual(createDefaultSpoonGameStats());
  });

  it('persists and updates aggregate results', () => {
    const updated = recordSpoonGameResult(createDefaultSpoonGameStats(), {
      status: 'stable',
      remainingSpoons: 4,
    });
    const narrowed = recordSpoonGameResult(updated, {
      status: 'narrow',
      remainingSpoons: 1,
    });
    const crashed = recordSpoonGameResult(narrowed, {
      status: 'crash',
      remainingSpoons: -1,
    });

    expect(updated).toEqual({
      totalRuns: 1,
      stableRuns: 1,
      narrowRuns: 0,
      crashRuns: 0,
      bestRemainingSpoons: 4,
      lastStatus: 'stable',
    });
    expect(narrowed).toEqual({
      totalRuns: 2,
      stableRuns: 1,
      narrowRuns: 1,
      crashRuns: 0,
      bestRemainingSpoons: 4,
      lastStatus: 'narrow',
    });
    expect(crashed).toEqual({
      totalRuns: 3,
      stableRuns: 1,
      narrowRuns: 1,
      crashRuns: 1,
      bestRemainingSpoons: 4,
      lastStatus: 'crash',
    });

    expect(saveSpoonGameStats(crashed)).toBe(true);
    expect(readSpoonGameStats()).toEqual(crashed);
  });
});
