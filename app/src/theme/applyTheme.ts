import type { ResolvedTheme, ThemeMode } from './theme';

const systemThemeQuery = '(prefers-color-scheme: dark)';

const getMatchMedia = (): ((query: string) => MediaQueryList) | null => {
  if (typeof globalThis.matchMedia === 'function') {
    return globalThis.matchMedia.bind(globalThis);
  }
  return null;
};

export const getSystemTheme = (): ResolvedTheme => {
  const matchMedia = getMatchMedia();
  if (!matchMedia) {
    return 'dark';
  }

  return matchMedia(systemThemeQuery).matches ? 'dark' : 'light';
};

export const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === 'system' ? getSystemTheme() : mode;

export const applyTheme = (mode: ThemeMode): ResolvedTheme => {
  const resolvedTheme = resolveTheme(mode);

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolvedTheme;
  }

  return resolvedTheme;
};

export const getThemeMediaQuery = (): MediaQueryList | null => {
  const matchMedia = getMatchMedia();
  return matchMedia ? matchMedia(systemThemeQuery) : null;
};
