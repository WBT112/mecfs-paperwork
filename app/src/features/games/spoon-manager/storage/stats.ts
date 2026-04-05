import {
  readLocalStorage,
  writeLocalStorage,
} from '../../../../lib/safeLocalStorage';
import type { SpoonGameStats } from '../types';

const SPOON_MANAGER_STATS_STORAGE_KEY =
  'mecfs-paperwork.games.spoon-manager.stats.v1';

/**
 * Creates an empty Spoon Manager statistics object.
 *
 * @returns Zeroed aggregate counters for local-only statistics.
 */
export const createDefaultSpoonGameStats = (): SpoonGameStats => ({
  totalRuns: 0,
  stableRuns: 0,
  narrowRuns: 0,
  crashRuns: 0,
  bestRemainingSpoons: null,
  lastStatus: null,
});

/**
 * Loads local Spoon Manager statistics with a defensive fallback.
 *
 * @returns Parsed aggregate statistics or a default snapshot.
 */
export const readSpoonGameStats = (): SpoonGameStats => {
  const rawValue = readLocalStorage(SPOON_MANAGER_STATS_STORAGE_KEY);
  if (!rawValue) {
    return createDefaultSpoonGameStats();
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (!isSpoonGameStats(parsedValue)) {
      return createDefaultSpoonGameStats();
    }

    return parsedValue;
  } catch {
    return createDefaultSpoonGameStats();
  }
};

/**
 * Persists Spoon Manager statistics locally.
 *
 * @param stats - Aggregate counters to store.
 * @returns `true` when the write succeeded, otherwise `false`.
 */
export const saveSpoonGameStats = (stats: SpoonGameStats): boolean =>
  writeLocalStorage(SPOON_MANAGER_STATS_STORAGE_KEY, JSON.stringify(stats));

/**
 * Records a finished day in aggregate statistics.
 *
 * @param stats - Current aggregate statistics.
 * @param result - Finished day result.
 * @returns Updated aggregate statistics.
 */
export const recordSpoonGameResult = (
  stats: SpoonGameStats,
  result: {
    status: NonNullable<SpoonGameStats['lastStatus']>;
    remainingSpoons: number;
  },
): SpoonGameStats => ({
  totalRuns: stats.totalRuns + 1,
  stableRuns: stats.stableRuns + (result.status === 'stable' ? 1 : 0),
  narrowRuns: stats.narrowRuns + (result.status === 'narrow' ? 1 : 0),
  crashRuns: stats.crashRuns + (result.status === 'crash' ? 1 : 0),
  bestRemainingSpoons:
    stats.bestRemainingSpoons === null
      ? result.remainingSpoons
      : Math.max(stats.bestRemainingSpoons, result.remainingSpoons),
  lastStatus: result.status,
});

const isSpoonGameStats = (value: unknown): value is SpoonGameStats => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.totalRuns) &&
    isNonNegativeInteger(value.stableRuns) &&
    isNonNegativeInteger(value.narrowRuns) &&
    isNonNegativeInteger(value.crashRuns) &&
    isNullableInteger(value.bestRemainingSpoons) &&
    isNullableStatus(value.lastStatus)
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= 0;

const isNullableInteger = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isInteger(value));

const isNullableStatus = (
  value: unknown,
): value is SpoonGameStats['lastStatus'] =>
  value === null ||
  value === 'stable' ||
  value === 'narrow' ||
  value === 'crash';
