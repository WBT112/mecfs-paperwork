import { useEffect, useState } from 'react';
import i18n from './index';
import {
  SupportedLocale,
  defaultLocale,
  isSupportedLocale,
  setStoredLocale,
  supportedLocales,
} from './locale';

const normalizeLocale = (value: string): SupportedLocale => {
  if (isSupportedLocale(value)) {
    return value;
  }

  return defaultLocale;
};

/**
 * React hook for reading and updating the active UI locale.
 */
export const useLocale = () => {
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    normalizeLocale(i18n.language),
  );

  useEffect(() => {
    const handleLanguageChange = (language: string) => {
      setLocaleState(normalizeLocale(language));
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const setLocale = async (nextLocale: SupportedLocale) => {
    if (nextLocale === i18n.language) {
      return;
    }

    try {
      await i18n.changeLanguage(nextLocale);
      setStoredLocale(nextLocale);
    } catch {
      setStoredLocale(normalizeLocale(i18n.language));
    }
  };

  return {
    locale,
    setLocale,
    supportedLocales,
  };
};
