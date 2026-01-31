import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const waitForServiceWorkerReady = async (page: Page) => {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    await navigator.serviceWorker.ready;
    return true;
  });
  await page.waitForFunction(() => navigator.serviceWorker?.controller != null);
};

const ensureActiveRecord = async (page: Page) => {
  const form = page.locator('.formpack-form');
  if (await form.isVisible()) {
    return;
  }

  await openCollapsibleSection(page, /drafts|entwürfe/i);

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

test('offline reload keeps core navigation and docx export working', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto('/formpacks');
  await expect(
    page.getByRole('heading', { name: /forms|formulare/i }),
  ).toBeVisible({ timeout: POLL_TIMEOUT });
  await waitForServiceWorkerReady(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /forms|formulare/i }),
  ).toBeVisible({ timeout: POLL_TIMEOUT });
  await waitForServiceWorkerReady(page);

  await context.setOffline(true);
  await page.reload();

  await expect(
    page.getByRole('heading', { name: /forms|formulare/i }),
  ).toBeVisible({ timeout: POLL_TIMEOUT });

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await expect(page.locator('.formpack-form')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });

  const { docxSection, exportButton } = await waitForDocxExportReady(page);
  const offlineDownload = await exportDocxAndExpectSuccess(
    docxSection,
    exportButton,
  );
  expect(offlineDownload.suggestedFilename()).toMatch(/\.docx$/i);

  await context.setOffline(false);
});
