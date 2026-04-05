import type {
  MeBingoCell,
  MeBingoEvaluation,
  MeBingoPromptCategory,
} from '../types';
import { ME_BINGO_FREE_FIELD_ID } from '../data/content';

export const ME_BINGO_BOARD_SIZE = 5;
export const ME_BINGO_FREE_INDEX = 12;

const ME_BINGO_BOARD_CELLS = ME_BINGO_BOARD_SIZE * ME_BINGO_BOARD_SIZE;
const ME_BINGO_PROMPTS_PER_CATEGORY = 5;
const ME_BINGO_LINE_PATTERNS = buildLinePatterns(ME_BINGO_BOARD_SIZE);

/**
 * Creates a randomized 5x5 bingo board with balanced category coverage.
 *
 * @remarks
 * The function draws exactly five prompts from each editorial category, removes
 * one of those twenty-five prompts at random, shuffles the remaining twenty-four
 * prompts, and inserts the automatically marked free field into the center.
 * Localized labels are resolved later in the UI so language switches do not
 * require a fresh board.
 *
 * @param promptIdsByCategory - Available prompt identifiers grouped by category.
 * @param random - Optional random source for deterministic tests.
 * @returns A fresh bingo board with 24 unique prompts plus a marked free center.
 * @throws When any category has fewer than five unique prompt identifiers.
 */
export const createMeBingoBoard = (
  promptIdsByCategory: Readonly<
    Record<MeBingoPromptCategory, readonly string[]>
  >,
  random: () => number = Math.random,
): MeBingoCell[] => {
  const selectedPromptIds = Object.values(promptIdsByCategory).flatMap(
    (promptIds) => {
      const uniquePromptIds = Array.from(new Set(promptIds));
      if (uniquePromptIds.length < ME_BINGO_PROMPTS_PER_CATEGORY) {
        throw new Error(
          'At least 5 unique ME Bingo prompts are required per category.',
        );
      }

      return shuffle(uniquePromptIds, random).slice(
        0,
        ME_BINGO_PROMPTS_PER_CATEGORY,
      );
    },
  );

  const omittedPromptIndex = Math.floor(random() * selectedPromptIds.length);
  const playablePromptIds = selectedPromptIds.filter(
    (_promptId, index) => index !== omittedPromptIndex,
  );
  const shuffledPromptIds = shuffle(playablePromptIds, random);

  let promptIndex = 0;

  return Array.from({ length: ME_BINGO_BOARD_CELLS }, (_unusedCell, index) => {
    if (index === ME_BINGO_FREE_INDEX) {
      return {
        cellId: `cell-${index}`,
        entryId: ME_BINGO_FREE_FIELD_ID,
        isFree: true,
        isMarked: true,
      };
    }

    const entryId = shuffledPromptIds[promptIndex];
    promptIndex += 1;

    return {
      cellId: `cell-${index}`,
      entryId,
      isFree: false,
      isMarked: false,
    };
  });
};

/**
 * Toggles a non-free bingo square by cell identifier.
 *
 * @param board - Current board state.
 * @param cellId - Stable cell identifier.
 * @returns A new board array when the cell is interactive, otherwise the original board.
 */
export const toggleMeBingoCell = (
  board: readonly MeBingoCell[],
  cellId: string,
): MeBingoCell[] => {
  const targetCell = board.find((cell) => cell.cellId === cellId);
  if (!targetCell || targetCell.isFree) {
    return [...board];
  }

  return board.map((cell) =>
    cell.cellId === cellId ? { ...cell, isMarked: !cell.isMarked } : cell,
  );
};

/**
 * Resets the current board while keeping the same randomized prompts.
 *
 * @param board - Current board state.
 * @returns The same layout with only the free field marked.
 */
export const resetMeBingoBoard = (
  board: readonly MeBingoCell[],
): MeBingoCell[] =>
  board.map((cell) => ({
    ...cell,
    isMarked: cell.isFree,
  }));

/**
 * Evaluates the current board for bingo lines and completion state.
 *
 * @param board - Board to evaluate.
 * @returns Derived board metrics and milestone status.
 */
export const evaluateMeBingoBoard = (
  board: readonly MeBingoCell[],
): MeBingoEvaluation => {
  const lineIndexes = ME_BINGO_LINE_PATTERNS.filter((pattern) =>
    pattern.every((index) => board[index]?.isMarked),
  );
  const markedCount = board.filter((cell) => cell.isMarked).length;
  const isFullCard = markedCount === ME_BINGO_BOARD_CELLS;
  const lineCount = lineIndexes.length;

  return {
    lineIndexes,
    lineCount,
    markedCount,
    isFullCard,
    status: resolveBoardStatus(isFullCard, lineCount),
  };
};

const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const nextValues = [...values];

  for (let index = nextValues.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextValues[index], nextValues[swapIndex]] = [
      nextValues[swapIndex],
      nextValues[index],
    ];
  }

  return nextValues;
};

function buildLinePatterns(boardSize: number): number[][] {
  const horizontalLines = Array.from(
    { length: boardSize },
    (_unusedRowValue, rowIndex) =>
      Array.from(
        { length: boardSize },
        (_unusedColumnValue, columnIndex) => rowIndex * boardSize + columnIndex,
      ),
  );

  const verticalLines = Array.from(
    { length: boardSize },
    (_unusedColumnValue, columnIndex) =>
      Array.from(
        { length: boardSize },
        (_unusedRowValue, rowIndex) => rowIndex * boardSize + columnIndex,
      ),
  );

  const diagonalPrimary = Array.from(
    { length: boardSize },
    (_, index) => index * (boardSize + 1),
  );
  const diagonalSecondary = Array.from(
    { length: boardSize },
    (_, index) => (index + 1) * (boardSize - 1),
  );

  return [
    ...horizontalLines,
    ...verticalLines,
    diagonalPrimary,
    diagonalSecondary,
  ];
}

const resolveBoardStatus = (
  isFullCard: boolean,
  lineCount: number,
): MeBingoEvaluation['status'] => {
  if (isFullCard) {
    return 'full-card';
  }

  if (lineCount > 0) {
    return 'bingo';
  }

  return 'playing';
};
