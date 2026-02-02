import i18n from './index';
import { defaultLocale, fallbackLocale, SupportedLocale } from './locale';

type FormpackTranslations = Record<string, string>;

const buildFormpackPath = (formpackId: string, locale: SupportedLocale) =>
  `/formpacks/${formpackId}/i18n/${locale}.json`;

const buildFormpackNamespace = (formpackId: string) => `formpack:${formpackId}`;

const fetchTranslations = async (
  formpackId: string,
  locale: SupportedLocale,
): Promise<FormpackTranslations | null> => {
  try {
    const response = await fetch(buildFormpackPath(formpackId, locale));

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as FormpackTranslations;
  } catch {
    return null;
  }
};

const getLocaleFallbacks = (locale: SupportedLocale): SupportedLocale[] => {
  const candidates = [locale, defaultLocale, fallbackLocale];

  return Array.from(new Set(candidates));
};

/**
 * Loads formpack translations into i18next for the provided formpack and locale.
 */
export const loadFormpackI18n = async (
  formpackId: string,
  locale: SupportedLocale,
): Promise<void> => {
  const namespace = buildFormpackNamespace(formpackId);

  // ⚡ Bolt: Skip fetching if translations for this formpack and locale are already loaded.
  // This avoids redundant network requests when switching languages or components.
  if (i18n.hasResourceBundle(locale, namespace)) {
    return;
  }

  for (const candidateLocale of getLocaleFallbacks(locale)) {
    const translations = await fetchTranslations(formpackId, candidateLocale);

    if (!translations) {
      continue;
    }

    // Register fallback translations under the requested locale so i18next
    // can resolve them even when the active language is the original request.
    i18n.addResourceBundle(locale, namespace, translations, true, true);

    if (candidateLocale !== locale) {
      i18n.addResourceBundle(
        candidateLocale,
        namespace,
        translations,
        true,
        true,
      );
    }
    return;
  }
};
