import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isSupportedLocale,
  getStoredLocale,
  setStoredLocale,
} from '../../src/i18n/locale';

describe('i18n/locale utilities', () => {
  beforeEach(() => {
    // ensure a clean localStorage between tests
    try {
      globalThis.localStorage.clear();
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  it('validates supported locales', () => {
    expect(isSupportedLocale('de')).toBe(true);
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
  });

  it('reads stored locale when available', () => {
    globalThis.localStorage.setItem('mecfs-paperwork.locale', 'en');
    expect(getStoredLocale()).toBe('en');
  });

  it('returns null when localStorage.getItem throws', () => {
    const orig = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('boom');
        },
      },
      configurable: true,
    });
    try {
      expect(getStoredLocale()).toBeNull();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: orig });
    }
  });

  it('setStoredLocale writes value and swallows errors', () => {
    setStoredLocale('de');
    expect(globalThis.localStorage.getItem('mecfs-paperwork.locale')).toBe(
      'de',
    );

    // simulate setItem throwing - should not throw from our function
    const orig = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        setItem: () => {
          throw new Error('err');
        },
      },
      configurable: true,
    });
    try {
      expect(() => setStoredLocale('en')).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: orig });
    }
  });
});
