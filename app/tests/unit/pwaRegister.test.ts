import { afterEach, describe, expect, it, vi } from 'vitest';

type RegisterSwOptions = {
  immediate?: boolean;
  onNeedRefresh?: () => void;
};

type UpdateSwHandler = (reloadPage?: boolean) => Promise<void>;
const isVoidCallback = (value: TimerHandler): value is () => void =>
  typeof value === 'function';

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
  APP_UPDATE_AVAILABLE_EVENT,
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
    const appUpdateListener = vi.fn();
    const updateSW = vi.fn(async () => undefined);
    registerSW.mockReturnValueOnce(updateSW);
    const unsubscribe = subscribeServiceWorkerWaiting(listener);
    globalThis.addEventListener(APP_UPDATE_AVAILABLE_EVENT, appUpdateListener);

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
    expect(appUpdateListener).toHaveBeenCalledTimes(1);

    unsubscribe();
    globalThis.removeEventListener(
      APP_UPDATE_AVAILABLE_EVENT,
      appUpdateListener,
    );
  });

  it('keeps onNeedRefresh resilient when activating the waiting worker fails', async () => {
    const updateSW = vi.fn(async () => {
      throw new Error('activation failed');
    });
    registerSW.mockReturnValueOnce(updateSW);

    registerServiceWorker({ DEV: false });

    const options = registerSW.mock.calls[0]?.[0] as RegisterSwOptions;
    expect(() => options.onNeedRefresh?.()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });

  it('starts update polling once and triggers checks on interval and visibility change', async () => {
    vi.resetModules();
    registerSW.mockReset();

    const updateRegistration = vi.fn(async () => undefined);
    const getRegistration = vi.fn(async () => ({
      update: updateRegistration,
    }));
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration },
    });

    let scheduledCallback: (() => void) | undefined;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (isVoidCallback(callback)) {
        scheduledCallback = () => {
          callback();
        };
      }
      return 1 as unknown as ReturnType<typeof globalThis.setInterval>;
    }) as unknown as typeof globalThis.setInterval);

    let visibilityHandler: EventListener | undefined;
    vi.spyOn(globalThis, 'addEventListener').mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject,
    ) => {
      if (type === 'visibilitychange' && typeof listener === 'function') {
        visibilityHandler = listener;
      }
    }) as unknown as typeof globalThis.addEventListener);

    const module = await import('../../src/pwa/register');
    module.registerServiceWorker({ DEV: false });
    module.registerServiceWorker({ DEV: false });

    await Promise.resolve();
    expect(getRegistration).toHaveBeenCalledTimes(1);
    expect(globalThis.setInterval).toHaveBeenCalledTimes(1);
    expect(visibilityHandler).toBeDefined();

    if (!scheduledCallback) {
      throw new Error('Expected polling callback to be registered.');
    }
    scheduledCallback();
    await Promise.resolve();
    expect(getRegistration).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    if (!visibilityHandler) {
      throw new Error('Expected visibility handler to be registered.');
    }
    visibilityHandler(new Event('visibilitychange'));
    await Promise.resolve();
    expect(getRegistration).toHaveBeenCalledTimes(3);
  });

  it('keeps startup resilient when registration update checks fail', async () => {
    vi.resetModules();
    registerSW.mockReset();

    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn(async () => {
          throw new Error('update failed');
        }),
      },
    });
    vi.spyOn(globalThis, 'setInterval').mockImplementation(
      (() =>
        1 as unknown as ReturnType<
          typeof globalThis.setInterval
        >) as unknown as typeof globalThis.setInterval,
    );

    const module = await import('../../src/pwa/register');
    expect(() => module.registerServiceWorker({ DEV: false })).not.toThrow();
    await Promise.resolve();
  });

  it('skips scheduled checks when service worker support disappears', async () => {
    vi.resetModules();
    registerSW.mockReset();

    const getRegistration = vi.fn(async () => ({
      update: vi.fn(async () => undefined),
    }));
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistration },
    });

    let scheduledCallback: (() => void) | undefined;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (isVoidCallback(callback)) {
        scheduledCallback = () => {
          callback();
        };
      }
      return 1 as unknown as ReturnType<typeof globalThis.setInterval>;
    }) as unknown as typeof globalThis.setInterval);

    const module = await import('../../src/pwa/register');
    module.registerServiceWorker({ DEV: false });
    await Promise.resolve();
    expect(getRegistration).toHaveBeenCalledTimes(1);

    delete (globalThis.navigator as { serviceWorker?: unknown }).serviceWorker;
    if (!scheduledCallback) {
      throw new Error('Expected polling callback to be registered.');
    }
    scheduledCallback();
    await Promise.resolve();
    expect(getRegistration).toHaveBeenCalledTimes(1);
  });
});
