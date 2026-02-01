/**
 * Locale utilities for storing and validating the UI language preference.
 */
export const supportedLocales = ['de', 'en'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = 'de';
export const fallbackLocale: SupportedLocale = 'en';

const storageKey = 'mecfs-paperwork.locale';

/**
 * Checks if a string is one of the supported locales.
 */
export const isSupportedLocale = (value: string): value is SupportedLocale =>
  supportedLocales.includes(value as SupportedLocale);

/**
 * Loads the stored locale preference from localStorage when available.
 */
export const getStoredLocale = (): SupportedLocale | null => {
  try {
    const storedValue = globalThis.localStorage.getItem(storageKey);

    if (storedValue && isSupportedLocale(storedValue)) {
      return storedValue;
    }
  } catch {
    return null;
  }

  return null;
};

/**
 * Persists the locale preference in localStorage.
 */
export const setStoredLocale = (locale: SupportedLocale): void => {
  try {
    globalThis.localStorage.setItem(storageKey, locale);
  } catch {
    // Ignore storage failures to keep the offline UI responsive.
  }
};
