import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, resolveTheme } from '../../src/theme/applyTheme';
import {
  getInitialThemeMode,
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

  it('persists the selected theme mode', () => {
    setStoredThemeMode('light');

    expect(window.localStorage.getItem(themeStorageKey)).toBe('light');
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
});
