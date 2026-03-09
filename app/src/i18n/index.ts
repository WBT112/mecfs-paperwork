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

try {
  await i18n.use(initReactI18next).init({
    resources: {
      de: { app: de },
      en: { app: en },
    },
    lng: initialLocale,
    fallbackLng: fallbackLocale,
    supportedLngs: supportedLocales,
    defaultNS: 'app',
    interpolation: {
      // SECURITY: React's JSX auto-escapes interpolated values, so i18next
      // escaping is redundant for rendered UI. However, this means user data
      // must NEVER be passed as interpolation values to t() — only static
      // keys and translation-defined defaults are safe here.
      escapeValue: false,
    },
    react: {
      // NOTE: Formpack translations are added at runtime via addResourceBundle.
      // Binding to store events ensures components rerender immediately after
      // locale-switch loads without requiring a page refresh.
      bindI18nStore: 'added removed',
    },
  });
} catch {
  // Ignore initialization failures to keep the UI responsive offline.
}

export default i18n;
