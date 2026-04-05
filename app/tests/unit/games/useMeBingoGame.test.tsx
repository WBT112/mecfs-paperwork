import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMeBingoGame } from '../../../src/features/games/me-bingo/hooks/useMeBingoGame';

describe('useMeBingoGame', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('handles reset and toggle calls before a game has started', () => {
    const { result } = renderHook(() => useMeBingoGame());

    act(() => {
      result.current.resetGame();
      result.current.toggleCell('cell-0');
    });

    expect(result.current.game).toBeNull();
    expect(result.current.stats.playedRounds).toBe(0);
  });
});
