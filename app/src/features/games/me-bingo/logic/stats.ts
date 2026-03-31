import {
  readLocalStorage,
  writeLocalStorage,
} from '../../../../lib/safeLocalStorage';
import type { MeBingoStats, MeBingoStatus } from '../types';

const ME_BINGO_STATS_STORAGE_KEY = 'mecfs-paperwork.games.me-bingo.stats.v1';

/**
 * Creates an empty ME Bingo statistics object.
 *
 * @returns Zeroed aggregate counters for local-only game tracking.
 */
export const createDefaultMeBingoStats = (): MeBingoStats => ({
  playedRounds: 0,
  bingoCount: 0,
  fullCardCount: 0,
  lastStatus: 'idle',
  bestLineCount: 0,
});

/**
 * Loads local ME Bingo statistics with resilient fallback parsing.
 *
 * @remarks
 * Corrupt or partial payloads are treated like missing data so the game stays
 * usable even when localStorage contents are stale or manually edited.
 *
 * @returns Parsed statistics or a default aggregate snapshot.
 */
export const readMeBingoStats = (): MeBingoStats => {
  const rawValue = readLocalStorage(ME_BINGO_STATS_STORAGE_KEY);
  if (!rawValue) {
    return createDefaultMeBingoStats();
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isMeBingoStats(parsedValue)) {
      return createDefaultMeBingoStats();
    }

    return parsedValue;
  } catch {
    return createDefaultMeBingoStats();
  }
};

/**
 * Persists ME Bingo statistics locally.
 *
 * @param stats - Aggregated counters to store.
 * @returns `true` when the write succeeded, otherwise `false`.
 */
export const saveMeBingoStats = (stats: MeBingoStats): boolean =>
  writeLocalStorage(ME_BINGO_STATS_STORAGE_KEY, JSON.stringify(stats));

/**
 * Records the start of a fresh randomized round.
 *
 * @param stats - Current aggregate statistics.
 * @returns Updated counters with the round count incremented.
 */
export const recordMeBingoRoundStarted = (
  stats: MeBingoStats,
): MeBingoStats => ({
  ...stats,
  playedRounds: stats.playedRounds + 1,
  lastStatus: 'playing',
});

/**
 * Records newly reached ME Bingo milestones and improved line totals.
 *
 * @param stats - Current aggregate statistics.
 * @param options - Newly reached milestones for the active round.
 * @returns Updated statistics snapshot.
 */
export const recordMeBingoProgress = (
  stats: MeBingoStats,
  options: {
    lineCount: number;
    reachedBingo: boolean;
    reachedFullCard: boolean;
    status: MeBingoStatus;
  },
): MeBingoStats => ({
  ...stats,
  bingoCount: stats.bingoCount + (options.reachedBingo ? 1 : 0),
  fullCardCount: stats.fullCardCount + (options.reachedFullCard ? 1 : 0),
  lastStatus: options.status,
  bestLineCount: Math.max(stats.bestLineCount, options.lineCount),
});

const isMeBingoStats = (value: unknown): value is MeBingoStats => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.playedRounds) &&
    isNonNegativeInteger(value.bingoCount) &&
    isNonNegativeInteger(value.fullCardCount) &&
    isNonNegativeInteger(value.bestLineCount) &&
    isMeBingoStatus(value.lastStatus)
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  Number.isFinite(value) &&
  value >= 0;

const isMeBingoStatus = (value: unknown): value is MeBingoStatus =>
  value === 'idle' ||
  value === 'playing' ||
  value === 'bingo' ||
  value === 'full-card';
