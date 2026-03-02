import { useEffect, useState } from 'react';
import i18n from './index';
import type { SupportedLocale } from './locale';
import {
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
  const [locale, setLocale] = useState<SupportedLocale>(() =>
    normalizeLocale(i18n.language),
  );

  useEffect(() => {
    const handleLanguageChange = (language: string) => {
      setLocale(normalizeLocale(language));
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [setLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = 'ltr';
  }, [locale]);

  const changeLocale = async (nextLocale: SupportedLocale) => {
    if (nextLocale === i18n.language) {
      return;
    }

    await i18n.changeLanguage(nextLocale);
    setStoredLocale(nextLocale);
  };

  return {
    locale,
    setLocale: changeLocale,
    supportedLocales,
  };
};
