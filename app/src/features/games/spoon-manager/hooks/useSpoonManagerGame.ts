import { useState, type Dispatch, type SetStateAction } from 'react';
import {
  advanceSpoonGame,
  chooseSpoonGameAction,
  createSpoonGameState,
} from '../logic/spoonManager';
import {
  readSpoonGameStats,
  recordSpoonGameResult,
  saveSpoonGameStats,
} from '../storage/stats';
import type { SpoonGameState, SpoonGameStats } from '../types';

/**
 * React wrapper around the pure Spoon Manager state machine.
 *
 * @remarks
 * The active day stays in memory and only minimal aggregate counters are
 * persisted locally for privacy-preserving statistics.
 *
 * @param seedOverride - Optional deterministic seed from the current URL.
 * @returns Active game state, local statistics, and user actions.
 */
export const useSpoonManagerGame = (seedOverride?: string | null) => {
  const [game, setGame] = useState<SpoonGameState | null>(null);
  const [stats, setStats] = useState<SpoonGameStats>(() =>
    readSpoonGameStats(),
  );

  const startGame = () => {
    setGame(createSpoonGameState({ seed: seedOverride ?? undefined }));
  };

  const restartGame = () => {
    setGame(createSpoonGameState({ seed: seedOverride ?? undefined }));
  };

  const chooseAction = (actionId: string) => {
    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame;
      }

      const nextGame = chooseSpoonGameAction(currentGame, actionId);
      maybeRecordFinishedRun(currentGame, nextGame, setStats);
      return nextGame;
    });
  };

  const advance = () => {
    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame;
      }

      const nextGame = advanceSpoonGame(currentGame);
      maybeRecordFinishedRun(currentGame, nextGame, setStats);
      return nextGame;
    });
  };

  return {
    game,
    stats,
    startGame,
    restartGame,
    chooseAction,
    advance,
  };
};

const maybeRecordFinishedRun = (
  previousGame: SpoonGameState,
  nextGame: SpoonGameState,
  setStats: Dispatch<SetStateAction<SpoonGameStats>>,
) => {
  if (
    previousGame.status !== 'playing' ||
    nextGame.status === 'playing' ||
    previousGame.resultFlavorId !== null
  ) {
    return;
  }

  setStats((currentStats) => {
    const nextStats = recordSpoonGameResult(currentStats, {
      status: nextGame.status as NonNullable<SpoonGameStats['lastStatus']>,
      remainingSpoons: nextGame.spoons,
    });
    saveSpoonGameStats(nextStats);
    return nextStats;
  });
};
