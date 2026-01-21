import type { ResolvedTheme, ThemeMode } from './theme';

const systemThemeQuery = '(prefers-color-scheme: dark)';

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }

  return window.matchMedia(systemThemeQuery).matches ? 'dark' : 'light';
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
  if (typeof window === 'undefined' || !window.matchMedia) {
    return null;
  }

  return window.matchMedia(systemThemeQuery);
};
