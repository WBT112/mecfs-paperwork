import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './resources/de.json';
import en from './resources/en.json';
import {
  defaultLocale,
  fallbackLocale,
  getStoredLocale,
  supportedLocales,
} from './locale';

const initialLocale = getStoredLocale() ?? defaultLocale;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { app: de },
      en: { app: en },
    },
    lng: initialLocale,
    fallbackLng: fallbackLocale,
    supportedLngs: supportedLocales,
    defaultNS: 'app',
    interpolation: {
      escapeValue: false,
    },
  })
  .catch(() => undefined);

export default i18n;
