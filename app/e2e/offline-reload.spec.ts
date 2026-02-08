import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openCollapsibleSection } from './helpers/sections';
import { waitForServiceWorkerReady } from './helpers/serviceWorker';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;
const SW_READY_TIMEOUT = 45_000;

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

  const exportButton = docxSection.locator('[data-action="docx-export"]');
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  return { docxSection, exportButton };
};

const exportDocxAndExpectSuccess = async (
  docxSection: Locator,
  exportButton: Locator,
) => {
  const page = docxSection.page();
  const downloadPromise = page.waitForEvent('download');
  const statusMessage = page.locator('.formpack-actions__status');
  const successMessage = statusMessage.locator('.formpack-actions__success');
  const errorMessage = statusMessage.locator('.app__error');

  await clickActionButton(exportButton);
  const download = await downloadPromise;
  await expect(successMessage).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(errorMessage).toHaveCount(0);
  return download;
};

test('offline reload keeps core navigation and docx export working', async ({
  page,
  context,
  browserName,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto('/formpacks');
  await expect(
    page.getByRole('heading', { name: /forms|formulare|hilfsangebote/i }),
  ).toBeVisible({ timeout: POLL_TIMEOUT });
  const initialSwReady = await waitForServiceWorkerReady(page, {
    timeoutMs: SW_READY_TIMEOUT,
  });
  if (!initialSwReady && browserName === 'webkit') {
    test.skip(
      true,
      'WebKit did not attach a service worker controller in time on this run.',
    );
  }
  expect(initialSwReady).toBe(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /forms|formulare|hilfsangebote/i }),
  ).toBeVisible({ timeout: POLL_TIMEOUT });
  expect(
    await waitForServiceWorkerReady(page, {
      timeoutMs: SW_READY_TIMEOUT,
      allowSingleReload: false,
    }),
  ).toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(
    page.getByRole('heading', { name: /forms|formulare|hilfsangebote/i }),
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
