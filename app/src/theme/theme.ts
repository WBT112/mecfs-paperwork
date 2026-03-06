import { readLocalStorage, writeLocalStorage } from '../lib/safeLocalStorage';

export const themeStorageKey = 'mecfs-paperwork.theme';

export const themeModes = ['dark', 'light', 'system'] as const;

export type ThemeMode = (typeof themeModes)[number];

export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

export const defaultThemeMode: ThemeMode = 'system';

export const isThemeMode = (value: string): value is ThemeMode =>
  themeModes.includes(value as ThemeMode);

export const getStoredThemeMode = (): ThemeMode | null => {
  const storedValue = readLocalStorage(themeStorageKey);
  if (storedValue && isThemeMode(storedValue)) {
    return storedValue;
  }
  return null;
};

export const setStoredThemeMode = (mode: ThemeMode): void => {
  writeLocalStorage(themeStorageKey, mode);
};

export const getInitialThemeMode = (): ThemeMode =>
  getStoredThemeMode() ?? defaultThemeMode;
