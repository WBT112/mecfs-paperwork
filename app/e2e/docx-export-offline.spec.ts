import { expect, test, type Locator, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { deleteDatabase } from './helpers';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const clickActionButton = async (button: Locator) => {
  await expect(button).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(button).toBeEnabled({ timeout: POLL_TIMEOUT });
  await button.scrollIntoViewIfNeeded();
  await button.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
};

const waitForDocxExportReady = async (page: Page) => {
  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });

  const exportButton = docxSection.getByRole('button', {
    name: /export docx|docx exportieren/i,
  });
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  return { docxSection, exportButton };
};

const exportDocxAndExpectSuccess = async (
  docxSection: Locator,
  exportButton: Locator,
) => {
  const page = docxSection.page();
  const downloadPromise = page.waitForEvent('download');
  const successMessage = docxSection.locator('.formpack-docx-export__success');
  const errorMessage = docxSection.locator('.app__error');

  await clickActionButton(exportButton);
  const download = await downloadPromise;
  await expect(successMessage).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(errorMessage).toHaveCount(0);
  return download;
};

test('docx template select and export button align in height', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });

  const templateSelect = docxSection.locator('.formpack-docx-export__select');
  const exportButton = docxSection.getByRole('button', {
    name: /export docx|docx exportieren/i,
  });

  await expect(templateSelect).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(exportButton).toBeVisible({ timeout: POLL_TIMEOUT });

  const selectBox = await templateSelect.boundingBox();
  const buttonBox = await exportButton.boundingBox();

  expect(selectBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();

  if (!selectBox || !buttonBox) {
    throw new Error('Expected bounding boxes for DOCX controls.');
  }

  expect(Math.abs(selectBox.height - buttonBox.height)).toBeLessThanOrEqual(1);
});

test.describe.configure({ mode: 'parallel' });

const locales: SupportedTestLocale[] = ['de', 'en'];

for (const locale of locales) {
  test.describe(locale, () => {
    test('docx export works online and offline', async ({ page, context }) => {
      await page.goto('/');
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await deleteDatabase(page, DB_NAME);

      await page.goto(`/formpacks/${FORM_PACK_ID}`);
      await switchLocale(page, locale);

      const { docxSection, exportButton } = await waitForDocxExportReady(page);

      const onlineDownload = await exportDocxAndExpectSuccess(
        docxSection,
        exportButton,
      );
      expect(onlineDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const onlinePath = await onlineDownload.path();
      expect(onlinePath).not.toBeNull();
      const onlineStats = await stat(onlinePath as string);
      expect(onlineStats.size).toBeGreaterThan(5_000);

      await context.setOffline(true);
      const offlineDownload = await exportDocxAndExpectSuccess(
        docxSection,
        exportButton,
      );
      expect(offlineDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const offlinePath = await offlineDownload.path();
      expect(offlinePath).not.toBeNull();
      const offlineStats = await stat(offlinePath as string);
      expect(offlineStats.size).toBeGreaterThan(5_000);
      await context.setOffline(false);
    });
  });
}
