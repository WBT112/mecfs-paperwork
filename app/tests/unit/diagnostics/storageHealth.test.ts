import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkStorageHealth } from '../../../src/lib/diagnostics/storageHealth';

const DB_NAME = 'mecfs-paperwork';

describe('checkStorageHealth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok status when IDB is available and quota is fine', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.indexedDbAvailable).toBe(true);
    expect(result.storageEstimate.supported).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.encryptionAtRest).toBeDefined();
  });

  it('detects encrypted payload envelopes in records store', async () => {
    const encryptedPayload = {
      kind: 'mecfs-paperwork-idb-encrypted',
      version: 1,
      cipher: 'AES-GCM',
      iv: 'iv',
      ciphertext: 'ciphertext',
    };

    const cursorRequest = {
      result: { value: { data: encryptedPayload } },
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
    };

    const db = {
      objectStoreNames: {
        contains: (storeName: string) => storeName === 'records',
      },
      transaction: () => ({
        objectStore: () => ({
          openCursor: () => {
            queueMicrotask(() => {
              cursorRequest.onsuccess?.();
            });
            return cursorRequest;
          },
        }),
      }),
      close: vi.fn(),
    };

    const openRequest = {
      result: db,
      transaction: undefined,
      onupgradeneeded: null as null | (() => void),
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
      onblocked: null as null | (() => void),
    };

    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi.fn(() => {
        queueMicrotask(() => {
          openRequest.onsuccess?.();
        });
        return openRequest;
      }),
    });

    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.encryptionAtRest?.status).toBe('encrypted');
  });

  it('returns error when IndexedDB is not available', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.indexedDbAvailable).toBe(false);
    expect(result.status).toBe('error');
    expect(result.message).toBe('storageHealthGuidanceError');
  });

  it('returns warning when storage usage is above 85%', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 90000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.status).toBe('warning');
    expect(result.message).toBe('storageHealthGuidanceWarning');
  });

  it('returns error when storage quota is exceeded', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 100000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.status).toBe('error');
    expect(result.message).toBe('storageHealthGuidanceQuotaExceeded');
  });

  it('handles navigator.storage.estimate not being available', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: undefined,
    });

    const result = await checkStorageHealth();
    expect(result.indexedDbAvailable).toBe(true);
    expect(result.storageEstimate.supported).toBe(false);
    expect(result.status).toBe('ok');
  });

  it('handles navigator.storage.estimate throwing', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockRejectedValue(new Error('Not supported')),
      },
    });

    const result = await checkStorageHealth();
    expect(result.storageEstimate.supported).toBe(false);
    expect(result.status).toBe('ok');
  });

  it('returns ok when quota is zero (division by zero guard)', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.status).toBe('ok');
  });

  it('includes usage and quota values in the result', async () => {
    vi.stubGlobal('indexedDB', {});
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 5000, quota: 50000 }),
      },
    });

    const result = await checkStorageHealth();
    expect(result.storageEstimate.usage).toBe(5000);
    expect(result.storageEstimate.quota).toBe(50000);
  });

  it('returns unknown encryption status when listing databases fails', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockRejectedValue(new Error('listing failed')),
      open: openSpy,
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();

    expect(result.encryptionAtRest?.status).toBe('unknown');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('aborts newly created databases during diagnostics and reports unknown encryption state', async () => {
    const db = {
      close: vi.fn(),
    };
    const abortSpy = vi.fn();
    const openRequest = {
      result: db,
      transaction: { abort: abortSpy },
      onupgradeneeded: null as null | (() => void),
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
      onblocked: null as null | (() => void),
    };

    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi.fn(() => {
        queueMicrotask(() => {
          openRequest.onupgradeneeded?.();
          openRequest.onsuccess?.();
        });
        return openRequest;
      }),
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();

    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(db.close).toHaveBeenCalledTimes(1);
    expect(result.encryptionAtRest?.status).toBe('unknown');
  });

  it('returns unknown encryption status when opening IndexedDB is blocked', async () => {
    const openRequest = {
      result: null,
      transaction: undefined,
      onupgradeneeded: null as null | (() => void),
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
      onblocked: null as null | (() => void),
    };

    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi.fn(() => {
        queueMicrotask(() => {
          openRequest.onblocked?.();
        });
        return openRequest;
      }),
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();

    expect(result.encryptionAtRest?.status).toBe('unknown');
  });

  it('returns unknown encryption status when records store cannot be read', async () => {
    const cursorRequest = {
      result: null,
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
    };
    const db = {
      objectStoreNames: {
        contains: (storeName: string) => storeName === 'records',
      },
      transaction: () => ({
        objectStore: () => ({
          openCursor: () => {
            queueMicrotask(() => {
              cursorRequest.onerror?.();
            });
            return cursorRequest;
          },
        }),
      }),
      close: vi.fn(),
    };
    const openRequest = {
      result: db,
      transaction: undefined,
      onupgradeneeded: null as null | (() => void),
      onsuccess: null as null | (() => void),
      onerror: null as null | (() => void),
      onblocked: null as null | (() => void),
    };

    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: 'mecfs-paperwork' }]),
      open: vi.fn(() => {
        queueMicrotask(() => {
          openRequest.onsuccess?.();
        });
        return openRequest;
      }),
    });
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 100000 }),
      },
    });

    const result = await checkStorageHealth();

    expect(result.encryptionAtRest?.status).toBe('unknown');
    expect(db.close).toHaveBeenCalledTimes(1);
  });
});
