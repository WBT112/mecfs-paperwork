import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAllLocalData } from '../../../src/lib/diagnostics/resetAllLocalData';

describe('resetAllLocalData', () => {
  let mockReload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockReload = vi.fn();
    vi.stubGlobal('location', { reload: mockReload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes the IndexedDB database', async () => {
    const deleteDatabase = vi.fn().mockReturnValue({
      set onsuccess(fn: () => void) {
        fn();
      },
      set onerror(_: () => void) {
        /* noop */
      },
      set onblocked(_: () => void) {
        /* noop */
      },
    });
    vi.stubGlobal('indexedDB', { deleteDatabase });
    vi.stubGlobal('navigator', {});

    await resetAllLocalData();

    expect(deleteDatabase).toHaveBeenCalledWith('mecfs-paperwork');
  });

  it('unregisters all service workers', async () => {
    const mockUnregister = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: vi
          .fn()
          .mockResolvedValue([
            { unregister: mockUnregister },
            { unregister: mockUnregister },
          ]),
      },
    });

    await resetAllLocalData();

    expect(mockUnregister).toHaveBeenCalledTimes(2);
  });

  it('clears all caches', async () => {
    vi.stubGlobal('navigator', {});
    const mockDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['cache-v1', 'cache-v2']),
      delete: mockDelete,
    });

    await resetAllLocalData();

    expect(mockDelete).toHaveBeenCalledWith('cache-v1');
    expect(mockDelete).toHaveBeenCalledWith('cache-v2');
  });

  it('clears localStorage', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('navigator', {});
    const mockClear = vi.fn();
    vi.stubGlobal('localStorage', { clear: mockClear });

    await resetAllLocalData();

    expect(mockClear).toHaveBeenCalledOnce();
  });

  it('reloads the page after cleanup', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('navigator', {});

    await resetAllLocalData();

    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('clears the storage encryption key cookie', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('navigator', {});
    document.cookie = 'mecfs-paperwork.storage-key=secret';

    await resetAllLocalData();

    expect(document.cookie).not.toContain('mecfs-paperwork.storage-key=');
  });

  it('handles missing APIs gracefully', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('navigator', {});

    await expect(resetAllLocalData()).resolves.toBeUndefined();
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('proceeds when deleteDatabase is blocked', async () => {
    const deleteDatabase = vi.fn().mockReturnValue({
      set onsuccess(_: () => void) {
        /* never called */
      },
      set onerror(_: () => void) {
        /* noop */
      },
      set onblocked(fn: () => void) {
        fn();
      },
    });
    vi.stubGlobal('indexedDB', { deleteDatabase });
    vi.stubGlobal('navigator', {});

    await resetAllLocalData();

    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('rejects when deleteDatabase reports an error', async () => {
    const deleteError = new Error('delete failed');
    const request = {
      error: deleteError,
      set onsuccess(_: () => void) {
        /* noop */
      },
      set onerror(fn: () => void) {
        fn();
      },
      set onblocked(_: () => void) {
        /* noop */
      },
    };
    const deleteDatabase = vi.fn().mockReturnValue(request);

    vi.stubGlobal('indexedDB', { deleteDatabase });
    vi.stubGlobal('navigator', {});

    await expect(resetAllLocalData()).rejects.toBe(deleteError);
    expect(mockReload).not.toHaveBeenCalled();
  });
});
