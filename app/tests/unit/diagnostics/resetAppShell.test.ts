import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppShell } from '../../../src/lib/diagnostics/resetAppShell';

describe('resetAppShell', () => {
  let mockReload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockReload = vi.fn();
    vi.stubGlobal('location', { reload: mockReload });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unregisters all service workers and clears cache storage before reloading', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: vi
          .fn()
          .mockResolvedValue([{ unregister }, { unregister }]),
      },
    });
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['shell-a', 'shell-b']),
      delete: deleteCache,
    });

    await resetAppShell();

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenNthCalledWith(1, 'shell-a');
    expect(deleteCache).toHaveBeenNthCalledWith(2, 'shell-b');
    expect(mockReload).toHaveBeenCalledOnce();
  });

  it('skips the final reload when requested explicitly', async () => {
    vi.stubGlobal('navigator', {});

    await resetAppShell({ reload: false });

    expect(mockReload).not.toHaveBeenCalled();
  });

  it('handles missing service worker and cache APIs gracefully', async () => {
    vi.stubGlobal('navigator', {});

    await expect(resetAppShell()).resolves.toBeUndefined();
    expect(mockReload).toHaveBeenCalledOnce();
  });
});
