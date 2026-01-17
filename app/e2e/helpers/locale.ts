import { expect, type Page } from '@playwright/test';

const localeLabelMap = {
  de: 'Sprache',
  en: 'Language',
} as const;

export type SupportedTestLocale = keyof typeof localeLabelMap;

export const expectLocaleLabel = async (
  page: Page,
  locale: SupportedTestLocale,
) => {
  await expect(page.locator('label[for="locale-select"]')).toHaveText(
    localeLabelMap[locale],
  );
};

export const switchLocale = async (page: Page, locale: SupportedTestLocale) => {
  const localeSelect = page.locator('#locale-select');
  await expect(localeSelect).toBeVisible();
  await localeSelect.selectOption(locale);
  await expectLocaleLabel(page, locale);
};
