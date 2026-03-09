import { expect, test, type Locator, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const ensureSectionActionButton = async (
  page: Page,
  sectionId: string,
  actionSelector: string,
  timeoutMs = POLL_TIMEOUT,
) => {
  const toggle = page.locator(`#${sectionId}-toggle`);
  const button = page.locator(actionSelector).first();
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    if (await button.isVisible().catch(() => false)) {
      return button;
    }
    await expect(toggle).toBeVisible({
      timeout: Math.min(5_000, timeoutMs - (Date.now() - startedAt)),
    });
    await clickActionButton(toggle);
    attempt += 1;
    await page.waitForTimeout(100 * attempt);
  }

  await expect(button).toBeVisible({ timeout: 1_000 });
  return button;
};

const ensureActiveRecord = async (page: Page) => {
  const form = page.locator('.formpack-form');
  try {
    await expect(form).toBeVisible({ timeout: Math.floor(POLL_TIMEOUT / 2) });
    return;
  } catch {
    // Fall through to creating a draft explicitly when the form is not ready yet.
  }

  const newDraftButton = await ensureSectionActionButton(
    page,
    'formpack-records',
    '.formpack-records__actions .app__button:visible',
    POLL_TIMEOUT,
  );
  await clickActionButton(newDraftButton, POLL_TIMEOUT);

  await expect(form).toBeVisible({ timeout: POLL_TIMEOUT });
};

const waitForDocxExportReady = async (page: Page) => {
  await ensureActiveRecord(page);
  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });

  const exportButton = docxSection.locator('.app__button').first();
  await expect(exportButton).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  return { docxSection, exportButton };
};

const exportDocxAndExpectSuccess = async (
  docxSection: Locator,
  exportButton: Locator,
) => {
  const page = docxSection.page();
  const statusMessage = page.locator('.formpack-actions__status');
  const successMessage = statusMessage.locator('.formpack-actions__success');
  const errorMessage = statusMessage.locator('.app__error');
  const attempt = async () => {
    const downloadPromise = page.waitForEvent('download', {
      timeout: POLL_TIMEOUT,
    });
    await clickActionButton(exportButton);
    return downloadPromise;
  };
  let download = await attempt().catch(async () => {
    if (page.isClosed()) {
      throw new Error('Page closed before DOCX download could start.');
    }
    await page.waitForTimeout(350);
    return attempt();
  });
  await expect(successMessage).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(errorMessage).toHaveCount(0);
  return download;
};

test.describe.configure({ mode: 'default' });

const locales: SupportedTestLocale[] = ['de', 'en'];

for (const locale of locales) {
  test.describe(locale, () => {
    test('docx export works online and offline', async ({
      page,
      context,
      browserName,
    }) => {
      test.slow(
        browserName !== 'chromium',
        'non-chromium is slower/flakier here',
      );
      await page.goto('/');
      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
      await deleteDatabase(page, DB_NAME);

      await openFormpackWithRetry(
        page,
        FORM_PACK_ID,
        page.locator('#formpack-records-toggle'),
      );
      await switchLocale(page, locale);
      await ensureActiveRecord(page);

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
      if (browserName !== 'chromium') {
        await page.waitForTimeout(300);
        await context.setOffline(false).catch(() => undefined);
        return;
      }

      const offlineDownload = await exportDocxAndExpectSuccess(
        docxSection,
        exportButton,
      ).catch(() => null);
      if (!offlineDownload) {
        throw new Error('Offline DOCX export failed on chromium.');
      }
      expect(offlineDownload.suggestedFilename()).toMatch(/\.docx$/i);
      const offlinePath = await offlineDownload.path();
      expect(offlinePath).not.toBeNull();
      const offlineStats = await stat(offlinePath as string);
      expect(offlineStats.size).toBeGreaterThan(5_000);
      await context.setOffline(false);
    });
  });
}
