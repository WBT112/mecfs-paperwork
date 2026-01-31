import { describe, expect, it, vi } from 'vitest';

const registerSW = vi.hoisted(() => vi.fn());

vi.mock('virtual:pwa-register', () => ({
  registerSW,
}));

import { registerServiceWorker } from '../../src/pwa/register';

describe('registerServiceWorker', () => {
  it('registers the service worker immediately', () => {
    registerServiceWorker();
    expect(registerSW).toHaveBeenCalledWith({ immediate: true });
  });
});
