export const themeStorageKey = 'mecfs-paperwork.theme';

export const themeModes = ['dark', 'light', 'system'] as const;

export type ThemeMode = (typeof themeModes)[number];

export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

export const defaultThemeMode: ThemeMode = 'dark';

export const isThemeMode = (value: string): value is ThemeMode =>
  themeModes.includes(value as ThemeMode);

export const getStoredThemeMode = (): ThemeMode | null => {
  try {
    const storedValue = window.localStorage.getItem(themeStorageKey);

    if (storedValue && isThemeMode(storedValue)) {
      return storedValue;
    }
  } catch {
    return null;
  }

  return null;
};

export const setStoredThemeMode = (mode: ThemeMode): void => {
  try {
    window.localStorage.setItem(themeStorageKey, mode);
  } catch {
    // Ignore storage failures to keep the offline UI responsive.
  }
};

export const getInitialThemeMode = (): ThemeMode =>
  getStoredThemeMode() ?? defaultThemeMode;
