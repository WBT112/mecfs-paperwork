import { useCallback, useEffect, useState } from 'react';
import { applyTheme, getThemeMediaQuery } from './applyTheme';
import {
  getInitialThemeMode,
  setStoredThemeMode,
  type ResolvedTheme,
  type ThemeMode,
} from './theme';

type ThemeState = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
};

const toResolvedTheme = (matches: boolean): ResolvedTheme =>
  matches ? 'dark' : 'light';

const updateResolvedTheme = (resolvedTheme: ResolvedTheme) => {
  document.documentElement.dataset.theme = resolvedTheme;
};

export const useTheme = (): ThemeState => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    getInitialThemeMode(),
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    applyTheme(themeMode),
  );

  const handleSetThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  useEffect(() => {
    setStoredThemeMode(themeMode);
    const currentResolved = applyTheme(themeMode);
    setResolvedTheme(currentResolved);

    if (themeMode !== 'system') {
      return;
    }

    const mediaQuery = getThemeMediaQuery();
    if (!mediaQuery) {
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      const nextResolved = toResolvedTheme(event.matches);
      updateResolvedTheme(nextResolved);
      setResolvedTheme(nextResolved);
    };

    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    if (typeof legacyMediaQuery.addEventListener === 'function') {
      legacyMediaQuery.addEventListener('change', handleChange);
      return () => legacyMediaQuery.removeEventListener('change', handleChange);
    }

    if (typeof legacyMediaQuery.addListener === 'function') {
      legacyMediaQuery.addListener(handleChange);
      return () => legacyMediaQuery.removeListener?.(handleChange);
    }

    return;
  }, [themeMode]);

  return { themeMode, resolvedTheme, setThemeMode: handleSetThemeMode };
};
