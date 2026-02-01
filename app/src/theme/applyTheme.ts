import type { ResolvedTheme, ThemeMode } from './theme';

const systemThemeQuery = '(prefers-color-scheme: dark)';
const FALLBACK_THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#eef1f4',
  dark: '#191919',
};

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
    const computed = getComputedStyle(document.documentElement);
    const backgroundColor =
      computed.getPropertyValue('--color-bg').trim() ||
      FALLBACK_THEME_COLORS[resolvedTheme];
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const meta = themeMeta ?? document.createElement('meta');
    if (!themeMeta) {
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', backgroundColor);
  }

  return resolvedTheme;
};

export const getThemeMediaQuery = (): MediaQueryList | null => {
  const matchMedia = getMatchMedia();
  return matchMedia ? matchMedia(systemThemeQuery) : null;
};
