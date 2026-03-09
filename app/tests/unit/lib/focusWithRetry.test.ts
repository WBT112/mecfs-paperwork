import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusWithRetry } from '../../../src/lib/focusWithRetry';

describe('focusWithRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses the primary target when available', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const target = document.createElement('button');
    target.className = 'target';
    root.appendChild(target);
    const focusSpy = vi.spyOn(target, 'focus');
    const onResolved = vi.fn();

    focusWithRetry({
      getRoot: () => root,
      selector: '.target',
      fallbackSelector: '.fallback',
      maxAttempts: 2,
      retryDelayMs: 10,
      onResolved,
    });

    await vi.runAllTimersAsync();

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('focuses the fallback when primary target stays unavailable', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const fallback = document.createElement('button');
    fallback.className = 'fallback';
    root.appendChild(fallback);
    const fallbackFocusSpy = vi.spyOn(fallback, 'focus');
    const onResolved = vi.fn();

    focusWithRetry({
      getRoot: () => root,
      selector: '.missing',
      fallbackSelector: '.fallback',
      maxAttempts: 1,
      retryDelayMs: 10,
      onResolved,
    });

    await vi.runAllTimersAsync();

    expect(fallbackFocusSpy).toHaveBeenCalledTimes(1);
    expect(onResolved).toHaveBeenCalledTimes(1);
  });

  it('supports cancellation before focus resolves', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const target = document.createElement('button');
    target.className = 'target';
    root.appendChild(target);
    const focusSpy = vi.spyOn(target, 'focus');
    const onResolved = vi.fn();

    const cancel = focusWithRetry({
      getRoot: () => root,
      selector: '.target',
      maxAttempts: 1,
      retryDelayMs: 10,
      onResolved,
    });

    cancel();
    await vi.runAllTimersAsync();

    expect(focusSpy).not.toHaveBeenCalled();
    expect(onResolved).not.toHaveBeenCalled();
  });

  it('resolves after retries even when no fallback selector is provided', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const onResolved = vi.fn();

    focusWithRetry({
      getRoot: () => root,
      selector: '.missing',
      maxAttempts: 1,
      retryDelayMs: 10,
      onResolved,
    });

    await vi.runAllTimersAsync();

    expect(onResolved).toHaveBeenCalledTimes(1);
  });
});
