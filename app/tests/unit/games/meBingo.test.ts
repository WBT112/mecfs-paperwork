import { describe, expect, it } from 'vitest';
import {
  ME_BINGO_FREE_FIELD_ID,
  getMeBingoPromptIds,
  getMeBingoPromptIdsByCategory,
  getMeBingoPromptLabel,
  getMeBingoPromptPool,
} from '../../../src/features/games/me-bingo/data/content';
import {
  ME_BINGO_FREE_INDEX,
  createMeBingoBoard,
  evaluateMeBingoBoard,
  resetMeBingoBoard,
  toggleMeBingoCell,
} from '../../../src/features/games/me-bingo/logic/meBingo';
import type { MeBingoPromptCategory } from '../../../src/features/games/me-bingo/types';

const PROMPT_IDS_BY_CATEGORY: Record<MeBingoPromptCategory, readonly string[]> =
  {
    'minimization-visibility': Array.from(
      { length: 5 },
      (_, index) => `minimization-${index}`,
    ),
    'push-and-movement': Array.from(
      { length: 5 },
      (_, index) => `push-${index}`,
    ),
    'medical-psychologizing': Array.from(
      { length: 5 },
      (_, index) => `medical-${index}`,
    ),
    'wellness-advice': Array.from(
      { length: 5 },
      (_, index) => `wellness-${index}`,
    ),
    'daily-life-expectations': Array.from(
      { length: 5 },
      (_, index) => `daily-${index}`,
    ),
  };

const createMarkedBoard = (markedIndexes: number[]) =>
  createMeBingoBoard(PROMPT_IDS_BY_CATEGORY, () => 0).map((cell, index) => ({
    ...cell,
    isMarked: cell.isFree || markedIndexes.includes(index),
  }));

describe('meBingo logic', () => {
  it('creates a 5x5 board with 24 prompts, one omitted prompt, and a marked free center', () => {
    const board = createMeBingoBoard(PROMPT_IDS_BY_CATEGORY, () => 0);
    const promptEntryIds = board
      .filter((cell) => !cell.isFree)
      .map((cell) => cell.entryId);
    const categoryCounts = {
      minimization: promptEntryIds.filter((entryId) =>
        entryId.startsWith('minimization-'),
      ).length,
      push: promptEntryIds.filter((entryId) => entryId.startsWith('push-'))
        .length,
      medical: promptEntryIds.filter((entryId) =>
        entryId.startsWith('medical-'),
      ).length,
      wellness: promptEntryIds.filter((entryId) =>
        entryId.startsWith('wellness-'),
      ).length,
      daily: promptEntryIds.filter((entryId) => entryId.startsWith('daily-'))
        .length,
    };

    expect(board).toHaveLength(25);
    expect(board[ME_BINGO_FREE_INDEX]).toMatchObject({
      entryId: ME_BINGO_FREE_FIELD_ID,
      isFree: true,
      isMarked: true,
    });
    expect(promptEntryIds).toHaveLength(24);
    expect(new Set(promptEntryIds).size).toBe(24);
    expect(
      Object.values(categoryCounts).sort((left, right) => left - right),
    ).toEqual([4, 5, 5, 5, 5]);
  });

  it('exposes the prompt pool grouped into five balanced categories', () => {
    const promptPool = getMeBingoPromptPool();
    const promptIds = getMeBingoPromptIds();
    const promptIdsByCategory = getMeBingoPromptIdsByCategory();

    expect(promptPool).toHaveLength(125);
    expect(promptIds).toHaveLength(125);
    expect(getMeBingoPromptLabel(promptPool[0].id, 'de')).toBe(
      promptPool[0].labels.de,
    );
    expect(
      Object.values(promptIdsByCategory).every(
        (promptIds) => promptIds.length === 25,
      ),
    ).toBe(true);
    expect(getMeBingoPromptLabel('unknown-entry', 'en')).toBe('unknown-entry');
  });

  it('throws when a category does not have enough unique prompts for a new board', () => {
    expect(() =>
      createMeBingoBoard(
        {
          ...PROMPT_IDS_BY_CATEGORY,
          'wellness-advice': ['only-one', 'only-two', 'only-three'],
        },
        () => 0,
      ),
    ).toThrowError(
      /At least 5 unique ME Bingo prompts are required per category/u,
    );
  });

  it('toggles regular cells and leaves the free field untouched', () => {
    const board = createMeBingoBoard(PROMPT_IDS_BY_CATEGORY, () => 0);
    const firstCellId = board[0].cellId;
    const toggledBoard = toggleMeBingoCell(board, firstCellId);
    const freeFieldBoard = toggleMeBingoCell(
      board,
      board[ME_BINGO_FREE_INDEX].cellId,
    );
    const untouchedBoard = toggleMeBingoCell(board, 'missing-cell');

    expect(toggledBoard[0]?.isMarked).toBe(true);
    expect(freeFieldBoard[ME_BINGO_FREE_INDEX]?.isMarked).toBe(true);
    expect(untouchedBoard[0]?.isMarked).toBe(false);
  });

  it('reports a playing state when no bingo line is complete', () => {
    const evaluation = evaluateMeBingoBoard(
      createMeBingoBoard(PROMPT_IDS_BY_CATEGORY, () => 0),
    );

    expect(evaluation.lineCount).toBe(0);
    expect(evaluation.status).toBe('playing');
  });

  it('detects horizontal bingo lines', () => {
    const evaluation = evaluateMeBingoBoard(createMarkedBoard([0, 1, 2, 3, 4]));

    expect(evaluation.lineCount).toBe(1);
    expect(evaluation.status).toBe('bingo');
  });

  it('detects vertical bingo lines', () => {
    const evaluation = evaluateMeBingoBoard(
      createMarkedBoard([0, 5, 10, 15, 20]),
    );

    expect(evaluation.lineCount).toBe(1);
    expect(evaluation.status).toBe('bingo');
  });

  it('detects diagonal bingo lines', () => {
    const evaluation = evaluateMeBingoBoard(createMarkedBoard([0, 6, 18, 24]));

    expect(evaluation.lineCount).toBe(1);
    expect(evaluation.status).toBe('bingo');
  });

  it('detects full-card completion', () => {
    const evaluation = evaluateMeBingoBoard(
      createMeBingoBoard(PROMPT_IDS_BY_CATEGORY, () => 0).map((cell) => ({
        ...cell,
        isMarked: true,
      })),
    );

    expect(evaluation.isFullCard).toBe(true);
    expect(evaluation.status).toBe('full-card');
    expect(evaluation.lineCount).toBe(12);
  });

  it('resets the current board while keeping only the free field marked', () => {
    const board = createMeBingoBoard(PROMPT_IDS_BY_CATEGORY, () => 0);
    const resetBoard = resetMeBingoBoard(
      board.map((cell) => ({
        ...cell,
        isMarked: true,
      })),
    );

    expect(resetBoard.filter((cell) => cell.isMarked)).toHaveLength(1);
    expect(resetBoard[ME_BINGO_FREE_INDEX]?.isMarked).toBe(true);
  });
});
