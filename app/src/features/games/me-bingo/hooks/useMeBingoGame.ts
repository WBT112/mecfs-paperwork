import { useState, type Dispatch, type SetStateAction } from 'react';
import { getMeBingoPromptIdsByCategory } from '../data/content';
import {
  createMeBingoBoard,
  evaluateMeBingoBoard,
  resetMeBingoBoard,
  toggleMeBingoCell,
} from '../logic/meBingo';
import {
  readMeBingoStats,
  recordMeBingoProgress,
  recordMeBingoRoundStarted,
  saveMeBingoStats,
} from '../logic/stats';
import type { MeBingoGameState, MeBingoStats } from '../types';

/**
 * Manages the active ME Bingo round and local aggregate statistics.
 *
 * @remarks
 * The hook keeps gameplay fully local and offline. Only aggregated counters are
 * written to localStorage; the active board stays in memory.
 *
 * @returns Active round state, local statistics, and user actions.
 */
export const useMeBingoGame = () => {
  const [game, setGame] = useState<MeBingoGameState | null>(null);
  const [stats, setStats] = useState<MeBingoStats>(() => readMeBingoStats());
  const [announcement, setAnnouncement] = useState<
    'bingo' | 'full-card' | null
  >(null);

  const beginFreshRound = () => {
    setAnnouncement(null);
    setGame(createFreshGameState());
    updateStats(setStats, recordMeBingoRoundStarted);
  };

  const startGame = () => {
    beginFreshRound();
  };

  const resetGame = () => {
    setAnnouncement(null);
    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame;
      }

      return createGameStateFromBoard(resetMeBingoBoard(currentGame.board));
    });
  };

  const drawNewCard = () => {
    beginFreshRound();
  };

  const toggleCell = (cellId: string) => {
    setGame((currentGame) => {
      if (!currentGame) {
        return currentGame;
      }

      const nextBoard = toggleMeBingoCell(currentGame.board, cellId);
      const nextGame = createGameStateFromBoard(nextBoard, currentGame);
      const reachedBingo =
        currentGame.bingoAt === null && nextGame.bingoAt !== null;
      const reachedFullCard =
        currentGame.fullCardAt === null && nextGame.fullCardAt !== null;
      const improvedLineCount = nextGame.lineCount > currentGame.lineCount;

      if (reachedBingo || reachedFullCard || improvedLineCount) {
        updateStats(setStats, (currentStats) =>
          recordMeBingoProgress(currentStats, {
            lineCount: nextGame.lineCount,
            reachedBingo,
            reachedFullCard,
            status: nextGame.status,
          }),
        );
      }

      setAnnouncement(resolveAnnouncement(reachedBingo, reachedFullCard));

      return nextGame;
    });
  };

  return {
    game,
    stats,
    announcement,
    startGame,
    resetGame,
    drawNewCard,
    toggleCell,
  };
};

const createFreshGameState = (): MeBingoGameState =>
  createGameStateFromBoard(createMeBingoBoard(getMeBingoPromptIdsByCategory()));

const createGameStateFromBoard = (
  board: ReturnType<typeof createMeBingoBoard>,
  previousState?: MeBingoGameState,
): MeBingoGameState => {
  const evaluatedBoard = evaluateMeBingoBoard(board);
  const now = Date.now();
  const bingoAt =
    previousState?.bingoAt ??
    (evaluatedBoard.status === 'bingo' || evaluatedBoard.status === 'full-card'
      ? now
      : null);
  const fullCardAt =
    previousState?.fullCardAt ??
    (evaluatedBoard.status === 'full-card' ? now : null);

  return {
    ...evaluatedBoard,
    board,
    startedAt: previousState?.startedAt ?? now,
    bingoAt,
    fullCardAt,
  };
};

const updateStats = (
  setStats: Dispatch<SetStateAction<MeBingoStats>>,
  updater: (stats: MeBingoStats) => MeBingoStats,
) => {
  setStats((currentStats) => {
    const nextStats = updater(currentStats);
    saveMeBingoStats(nextStats);
    return nextStats;
  });
};

const resolveAnnouncement = (
  reachedBingo: boolean,
  reachedFullCard: boolean,
): 'bingo' | 'full-card' | null => {
  if (reachedFullCard) {
    return 'full-card';
  }

  if (reachedBingo) {
    return 'bingo';
  }

  return null;
};
