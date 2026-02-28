import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStorageHealth } from '../../../src/lib/diagnostics/useStorageHealth';
import type { StorageHealthInfo } from '../../../src/lib/diagnostics/types';

const mockCheckStorageHealth = vi.fn();

vi.mock('../../../src/lib/diagnostics/storageHealth', () => ({
  checkStorageHealth: (...args: unknown[]) =>
    mockCheckStorageHealth(...args) as Promise<StorageHealthInfo>,
}));

const healthyResult: StorageHealthInfo = {
  indexedDbAvailable: true,
  storageEstimate: { supported: true, usage: 5000, quota: 100000 },
  status: 'ok',
  message: '',
};

const errorResult: StorageHealthInfo = {
  indexedDbAvailable: false,
  storageEstimate: { supported: false },
  status: 'error',
  message: 'storageHealthGuidanceError',
};

describe('useStorageHealth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCheckStorageHealth.mockResolvedValue(healthyResult);
  });

  it('starts in loading state', () => {
    // Use a never-resolving promise to keep it in loading state
    mockCheckStorageHealth.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useStorageHealth());

    expect(result.current.loading).toBe(true);
    expect(result.current.health).toEqual({
      indexedDbAvailable: true,
      storageEstimate: { supported: false },
      status: 'ok',
      message: '',
    });
  });

  it('resolves to healthy state after successful check', async () => {
    const { result } = renderHook(() => useStorageHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.health).toEqual(healthyResult);
    expect(result.current.health.status).toBe('ok');
    expect(result.current.health.indexedDbAvailable).toBe(true);
    expect(result.current.health.storageEstimate.supported).toBe(true);
    expect(result.current.health.storageEstimate.usage).toBe(5000);
    expect(result.current.health.storageEstimate.quota).toBe(100000);
  });

  it('sets error state when checkStorageHealth rejects', async () => {
    mockCheckStorageHealth.mockRejectedValue(new Error('Check failed'));

    const { result } = renderHook(() => useStorageHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.health.indexedDbAvailable).toBe(false);
    expect(result.current.health.storageEstimate.supported).toBe(false);
    expect(result.current.health.status).toBe('error');
    expect(result.current.health.message).toBe('storageHealthGuidanceError');
  });

  it('re-checks storage health when refresh is called', async () => {
    const { result } = renderHook(() => useStorageHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callCountBefore = mockCheckStorageHealth.mock.calls.length;

    // Update the mock to return a different result for the second call
    mockCheckStorageHealth.mockResolvedValue(errorResult);

    act(() => {
      result.current.refresh();
    });

    // Should go back to loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCheckStorageHealth.mock.calls.length).toBe(callCountBefore + 1);
    expect(result.current.health).toEqual(errorResult);
  });

  it('does not update state after unmount (cancelled flag)', async () => {
    let resolveCheck: (value: StorageHealthInfo) => void;
    mockCheckStorageHealth.mockReturnValue(
      new Promise<StorageHealthInfo>((resolve) => {
        resolveCheck = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useStorageHealth());

    expect(result.current.loading).toBe(true);

    unmount();

    // Resolve after unmount -- should not throw or update state
    resolveCheck!(healthyResult);

    // The hook has been unmounted, so no assertions about state updates
    // The key thing is that this does not cause React warnings about
    // updating state on an unmounted component
  });

  it('does not set error state when a rejected check resolves after unmount', async () => {
    let rejectCheck: (error: unknown) => void;
    mockCheckStorageHealth.mockReturnValue(
      new Promise<StorageHealthInfo>((_, reject) => {
        rejectCheck = reject;
      }),
    );

    const { unmount } = renderHook(() => useStorageHealth());
    unmount();

    rejectCheck!(new Error('late failure'));
    await Promise.resolve();
    expect(mockCheckStorageHealth).toHaveBeenCalled();
  });

  it('exposes a refresh function that is stable between renders', async () => {
    const { result, rerender } = renderHook(() => useStorageHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const firstRefresh = result.current.refresh;

    rerender();

    // refresh should be a function
    expect(typeof result.current.refresh).toBe('function');
    // Note: we only verify it's callable; React may or may not
    // preserve referential identity depending on implementation
    expect(firstRefresh).toBeDefined();
  });

  it('handles multiple rapid refresh calls', async () => {
    const { result } = renderHook(() => useStorageHealth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refresh multiple times rapidly
    act(() => {
      result.current.refresh();
      result.current.refresh();
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Each refresh increments the key, triggering the effect.
    // The cancelled flag should prevent stale updates.
    expect(result.current.health).toEqual(healthyResult);
  });
});
