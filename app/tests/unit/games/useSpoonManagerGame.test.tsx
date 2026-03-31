import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSpoonManagerActionById } from '../../../src/features/games/spoon-manager/data/content';
import { useSpoonManagerGame } from '../../../src/features/games/spoon-manager/hooks/useSpoonManagerGame';

describe('useSpoonManagerGame', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('handles guard calls before a game has started and records a finished seeded run', () => {
    const { result } = renderHook(() => useSpoonManagerGame('hook-seed'));

    act(() => {
      result.current.chooseAction('missing');
      result.current.advance();
    });

    expect(result.current.game).toBeNull();
    expect(result.current.stats.totalRuns).toBe(0);

    act(() => {
      result.current.startGame();
    });

    expect(result.current.game?.seed).toBe('hook-seed');
    expect(result.current.game?.status).toBe('playing');

    act(() => {
      result.current.restartGame();
    });

    expect(result.current.game?.seed).toBe('hook-seed');

    const firstActionId = result.current.game?.currentActionIds[0];
    expect(firstActionId).toBeTruthy();

    act(() => {
      result.current.chooseAction(firstActionId as string);
    });

    expect(result.current.game?.awaitingAdvance).toBe(true);

    act(() => {
      result.current.advance();
    });

    expect(result.current.game?.turnInPhase).toBe(2);
  });

  it('records exactly one finished run and ignores follow-up actions on completed days', () => {
    const { result } = renderHook(() => useSpoonManagerGame());
    const getGame = () => result.current.game;

    act(() => {
      result.current.startGame();
    });

    expect(result.current.game?.seed).toMatch(/\S/);

    act(() => {
      result.current.restartGame();
    });

    expect(result.current.game?.seed).toMatch(/\S/);

    while (getGame()?.status === 'playing') {
      const availableActionIds = getGame()?.currentActionIds ?? [];
      const chosenActionId = [...availableActionIds].sort((left, right) => {
        const leftAction = getSpoonManagerActionById(left);
        const rightAction = getSpoonManagerActionById(right);

        return (
          (leftAction?.immediateDelta ?? 0) - (rightAction?.immediateDelta ?? 0)
        );
      })[0];

      if (!chosenActionId) {
        throw new Error('Expected at least one selectable action.');
      }

      act(() => {
        result.current.chooseAction(chosenActionId);
      });

      if (getGame()?.status !== 'playing') {
        break;
      }

      act(() => {
        result.current.advance();
      });
    }

    expect(result.current.game?.status).not.toBe('playing');
    expect(result.current.stats.totalRuns).toBe(1);
    expect(result.current.stats.lastStatus).toBe(result.current.game?.status);

    act(() => {
      result.current.chooseAction('missing');
      result.current.advance();
    });

    expect(result.current.stats.totalRuns).toBe(1);
  });
});
