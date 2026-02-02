import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  getSystemTheme,
  getThemeMediaQuery,
  resolveTheme,
} from '../../src/theme/applyTheme';
import {
  getInitialThemeMode,
  getStoredThemeMode,
  isThemeMode,
  setStoredThemeMode,
  type ResolvedTheme,
  themeStorageKey,
} from '../../src/theme/theme';

const buildMatchMedia = (matches: boolean): MediaQueryList => ({
  matches,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

describe('theme utilities', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = '';
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.localStorage.clear();
  });

  it('defaults to dark when no stored theme is available', () => {
    expect(getInitialThemeMode()).toBe('dark');
  });

  it('validates supported theme modes', () => {
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('unknown')).toBe(false);
  });

  it('persists the selected theme mode', () => {
    setStoredThemeMode('light');

    expect(window.localStorage.getItem(themeStorageKey)).toBe('light');
  });

  it('ignores invalid stored theme values', () => {
    window.localStorage.setItem(themeStorageKey, 'neon');

    expect(getStoredThemeMode()).toBeNull();
  });

  it('returns null when storage access fails', () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('Storage failure');
      });

    expect(getStoredThemeMode()).toBeNull();

    getItemSpy.mockRestore();
  });

  it('ignores failures when storing theme selection', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('Storage failure');
      });

    expect(() => setStoredThemeMode('dark')).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('applies the resolved theme to the document', () => {
    applyTheme('light');

    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('resolves system theme using matchMedia', () => {
    window.matchMedia = vi.fn().mockReturnValue(buildMatchMedia(true));

    expect(resolveTheme('system')).toBe<ResolvedTheme>('dark');
  });

  it('falls back to light when system preference is light', () => {
    window.matchMedia = vi.fn().mockReturnValue(buildMatchMedia(false));

    expect(resolveTheme('system')).toBe<ResolvedTheme>('light');
  });

  it('falls back to dark when matchMedia is unavailable', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    expect(getSystemTheme()).toBe<ResolvedTheme>('dark');
  });

  it('returns null when media queries are not supported', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;

    expect(getThemeMediaQuery()).toBeNull();
  });
});
