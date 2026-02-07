import { afterEach, describe, expect, it, vi } from 'vitest';

const registerSW = vi.hoisted(() => vi.fn());

vi.mock('virtual:pwa-register', () => ({
  registerSW,
}));

import * as registerModule from '../../src/pwa/register';

const {
  registerServiceWorker,
  shouldRegisterServiceWorker,
  subscribeServiceWorkerWaiting,
} = registerModule;

describe('shouldRegisterServiceWorker', () => {
  it('returns false in dev without override', () => {
    expect(shouldRegisterServiceWorker({ DEV: true })).toBe(false);
  });

  it('returns true in dev with override', () => {
    expect(
      shouldRegisterServiceWorker({ DEV: true, VITE_ENABLE_DEV_SW: 'true' }),
    ).toBe(true);
  });

  it('returns true in production', () => {
    expect(shouldRegisterServiceWorker({ DEV: false })).toBe(true);
  });
});

describe('registerServiceWorker', () => {
  afterEach(() => {
    registerSW.mockReset();
    vi.restoreAllMocks();
  });

  it('registers the service worker when allowed', () => {
    registerServiceWorker({ DEV: false });
    expect(registerSW).toHaveBeenCalled();
    const options = registerSW.mock.calls[0]?.[0] as
      | { immediate?: boolean; onNeedRefresh?: () => void }
      | undefined;
    expect(options?.immediate).toBe(true);
    expect(typeof options?.onNeedRefresh).toBe('function');
  });

  it('skips registration when disabled', () => {
    registerServiceWorker({ DEV: true });
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('emits a passive update event when a waiting worker is detected', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeServiceWorkerWaiting(listener);

    registerServiceWorker({ DEV: false });

    const call = registerSW.mock.calls.at(0);
    expect(call).toBeDefined();
    if (!call) {
      throw new Error('Expected registerSW to be called.');
    }

    const options = call[0] as { onNeedRefresh?: () => void };
    expect(options.onNeedRefresh).toBeDefined();
    options.onNeedRefresh?.();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
