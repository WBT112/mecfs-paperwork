import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultMeBingoStats,
  readMeBingoStats,
  recordMeBingoProgress,
  recordMeBingoRoundStarted,
  saveMeBingoStats,
} from '../../../src/features/games/me-bingo/logic/stats';

const STORAGE_KEY = 'mecfs-paperwork.games.me-bingo.stats.v1';

describe('meBingo stats', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records a newly started round', () => {
    const nextStats = recordMeBingoRoundStarted(createDefaultMeBingoStats());

    expect(nextStats.playedRounds).toBe(1);
    expect(nextStats.lastStatus).toBe('playing');
  });

  it('records bingo and full-card milestones while keeping the best line count', () => {
    const afterBingo = recordMeBingoProgress(createDefaultMeBingoStats(), {
      lineCount: 2,
      reachedBingo: true,
      reachedFullCard: false,
      status: 'bingo',
    });
    const afterFullCard = recordMeBingoProgress(afterBingo, {
      lineCount: 12,
      reachedBingo: false,
      reachedFullCard: true,
      status: 'full-card',
    });

    expect(afterFullCard.bingoCount).toBe(1);
    expect(afterFullCard.fullCardCount).toBe(1);
    expect(afterFullCard.bestLineCount).toBe(12);
    expect(afterFullCard.lastStatus).toBe('full-card');
  });

  it('persists and restores stored statistics', () => {
    const stats = recordMeBingoProgress(
      recordMeBingoRoundStarted(createDefaultMeBingoStats()),
      {
        lineCount: 3,
        reachedBingo: true,
        reachedFullCard: false,
        status: 'bingo',
      },
    );

    expect(saveMeBingoStats(stats)).toBe(true);
    expect(readMeBingoStats()).toEqual(stats);
  });

  it('restores valid stored statistics for idle and playing states', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        playedRounds: 0,
        bingoCount: 0,
        fullCardCount: 0,
        lastStatus: 'idle',
        bestLineCount: 0,
      }),
    );
    expect(readMeBingoStats()).toEqual({
      playedRounds: 0,
      bingoCount: 0,
      fullCardCount: 0,
      lastStatus: 'idle',
      bestLineCount: 0,
    });

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        playedRounds: 1,
        bingoCount: 0,
        fullCardCount: 0,
        lastStatus: 'playing',
        bestLineCount: 1,
      }),
    );
    expect(readMeBingoStats()).toEqual({
      playedRounds: 1,
      bingoCount: 0,
      fullCardCount: 0,
      lastStatus: 'playing',
      bestLineCount: 1,
    });

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        playedRounds: 2,
        bingoCount: 1,
        fullCardCount: 1,
        lastStatus: 'full-card',
        bestLineCount: 12,
      }),
    );
    expect(readMeBingoStats()).toEqual({
      playedRounds: 2,
      bingoCount: 1,
      fullCardCount: 1,
      lastStatus: 'full-card',
      bestLineCount: 12,
    });
  });

  it('falls back to defaults for empty or corrupt storage payloads', () => {
    expect(readMeBingoStats()).toEqual(createDefaultMeBingoStats());

    window.localStorage.setItem(STORAGE_KEY, '{"playedRounds":"bad"}');

    expect(readMeBingoStats()).toEqual(createDefaultMeBingoStats());
  });

  it('falls back to defaults for malformed JSON payloads', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not valid json}');

    expect(readMeBingoStats()).toEqual(createDefaultMeBingoStats());
  });

  it('falls back to defaults for non-object payloads', () => {
    window.localStorage.setItem(STORAGE_KEY, 'null');

    expect(readMeBingoStats()).toEqual(createDefaultMeBingoStats());
  });

  it('returns false when local stats cannot be persisted', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });

    expect(saveMeBingoStats(createDefaultMeBingoStats())).toBe(false);

    setItemSpy.mockRestore();
  });
});
