import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDB } from 'idb';
import { resetAllLocalData } from '../../../src/lib/diagnostics/resetAllLocalData';

vi.mock('idb', () => ({ deleteDB: vi.fn() }));

const KEY_COOKIE = 'mecfs-paperwork.storage-key';
const STORAGE_MARKER = 'synthetic-marker';

describe('resetAllLocalData', () => {
  let mockReload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(deleteDB).mockReset();
    vi.mocked(deleteDB).mockResolvedValue(undefined);
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    });
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = `${KEY_COOKIE}=; Max-Age=0; Path=/`;
    mockReload = vi.fn();
    vi.stubGlobal('location', { reload: mockReload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes the IndexedDB database', async () => {
    await resetAllLocalData();

    expect(deleteDB).toHaveBeenCalledWith('mecfs-paperwork');
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
    document.cookie = `${KEY_COOKIE}=synthetic-key`;

    await resetAllLocalData();

    expect(document.cookie).not.toContain(`${KEY_COOKIE}=`);
  });

  it('handles missing APIs gracefully', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('navigator', {});
    Reflect.deleteProperty(globalThis, 'caches');

    await expect(resetAllLocalData()).resolves.toBeUndefined();
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('retains storage and the key until a blocked deletion actually completes', async () => {
    let confirmDeletion!: () => void;
    vi.mocked(deleteDB).mockReturnValue(
      new Promise<void>((resolve) => {
        confirmDeletion = resolve;
      }),
    );
    localStorage.setItem(STORAGE_MARKER, 'retained');
    sessionStorage.setItem(STORAGE_MARKER, 'retained');
    document.cookie = `${KEY_COOKIE}=synthetic-key`;
    const getRegistrations = vi.fn().mockResolvedValue([]);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations } });

    const reset = resetAllLocalData();
    await Promise.resolve();

    expect(localStorage.getItem(STORAGE_MARKER)).toBe('retained');
    expect(sessionStorage.getItem(STORAGE_MARKER)).toBe('retained');
    expect(document.cookie).toContain(`${KEY_COOKIE}=synthetic-key`);
    expect(getRegistrations).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();

    confirmDeletion();
    await reset;

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).not.toContain(`${KEY_COOKIE}=`);
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('rejects when deleteDatabase reports an error', async () => {
    const deleteError = new Error('delete failed');
    vi.mocked(deleteDB).mockRejectedValue(deleteError);
    document.cookie = `${KEY_COOKIE}=synthetic-key`;
    localStorage.setItem(STORAGE_MARKER, 'retained');

    await expect(resetAllLocalData()).rejects.toBe(deleteError);
    expect(document.cookie).toContain(`${KEY_COOKIE}=synthetic-key`);
    expect(localStorage.getItem(STORAGE_MARKER)).toBe('retained');
    expect(mockReload).not.toHaveBeenCalled();
  });
});
