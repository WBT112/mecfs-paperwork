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
  await expect(page.locator('.app__locale-switch')).toContainText(
    localeLabelMap[locale],
  );
};

export const switchLocale = async (page: Page, locale: SupportedTestLocale) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const localeSelect = page.locator('#locale-select');
    await expect(localeSelect).toBeVisible();
    await localeSelect.selectOption(locale);

    try {
      await expect(page.locator('html')).toHaveAttribute('lang', locale, {
        timeout: 2_000,
      });
      await expectLocaleLabel(page, locale);
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
};
