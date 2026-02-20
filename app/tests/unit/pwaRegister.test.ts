import { afterEach, describe, expect, it, vi } from 'vitest';

type RegisterSwOptions = {
  immediate?: boolean;
  onNeedRefresh?: () => void;
};

type UpdateSwHandler = (reloadPage?: boolean) => Promise<void>;

const registerSW = vi.hoisted(() =>
  vi.fn(
    (_options?: RegisterSwOptions): UpdateSwHandler =>
      vi.fn(async () => undefined),
  ),
);

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
    const options = registerSW.mock.calls[0]?.[0];
    expect(options?.immediate).toBe(true);
    expect(typeof options?.onNeedRefresh).toBe('function');
  });

  it('skips registration when disabled', () => {
    registerServiceWorker({ DEV: true });
    expect(registerSW).not.toHaveBeenCalled();
  });

  it('emits an update event and activates a waiting service worker', () => {
    const listener = vi.fn();
    const updateSW = vi.fn(async () => undefined);
    registerSW.mockReturnValueOnce(updateSW);
    const unsubscribe = subscribeServiceWorkerWaiting(listener);

    registerServiceWorker({ DEV: false });

    const call = registerSW.mock.calls.at(0);
    expect(call).toBeDefined();
    if (!call) {
      throw new Error('Expected registerSW to be called.');
    }

    const options = call[0] as RegisterSwOptions;
    expect(options.onNeedRefresh).toBeDefined();
    options.onNeedRefresh?.();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(updateSW).toHaveBeenCalledWith(true);

    unsubscribe();
  });
});
