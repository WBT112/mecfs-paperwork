import { afterEach, describe, expect, it, vi } from 'vitest';

const registerSW = vi.hoisted(() => vi.fn());

vi.mock('virtual:pwa-register', () => ({
  registerSW,
}));

import * as registerModule from '../../src/pwa/register';

const { registerServiceWorker, shouldRegisterServiceWorker } = registerModule;

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
    expect(registerSW).toHaveBeenCalledWith({ immediate: true });
  });

  it('skips registration when disabled', () => {
    registerServiceWorker({ DEV: true });
    expect(registerSW).not.toHaveBeenCalled();
  });
});
