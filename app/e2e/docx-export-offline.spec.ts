import { expect, test, type Locator, type Page } from '@playwright/test';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const deleteDatabase = async (page: Page, dbName: string) => {
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, dbName);
};

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
  const successMessage = docxSection.locator(
    '.formpack-docx-export__success',
  );
  const errorMessage = docxSection.locator('.app__error');

  await clickActionButton(exportButton);
  await expect(successMessage).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(errorMessage).toHaveCount(0);
};

test('docx export works online and offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  const { docxSection, exportButton } = await waitForDocxExportReady(page);

  await exportDocxAndExpectSuccess(docxSection, exportButton);

  await context.setOffline(true);
  await exportDocxAndExpectSuccess(docxSection, exportButton);
  await context.setOffline(false);
});
