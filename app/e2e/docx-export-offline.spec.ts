import { expect, test, type Locator, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';
import { openCollapsibleSectionById } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const ensureActiveRecord = async (page: Page) => {
  const form = page.locator('.formpack-form');
  if (await form.isVisible()) {
    return;
  }

  await openCollapsibleSectionById(page, 'formpack-records');

  const newDraftButton = page.getByRole('button', {
    name: /new draft|neuer entwurf/i,
  });
  if (await newDraftButton.count()) {
    await clickActionButton(newDraftButton.first(), POLL_TIMEOUT);
  } else {
    await clickActionButton(
      page.locator('.formpack-records__actions .app__button').first(),
      POLL_TIMEOUT,
    );
  }

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
