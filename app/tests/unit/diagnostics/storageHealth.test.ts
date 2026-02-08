import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkStorageHealth } from '../../../src/lib/diagnostics/storageHealth';

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
    expect(result.message).toContain('IndexedDB is not available');
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
    expect(result.message).toContain('high');
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
    expect(result.message).toContain('exceeded');
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
});
