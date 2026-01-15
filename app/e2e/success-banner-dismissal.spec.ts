import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const createNewDraft = async (page: Page) => {
  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  await expect(newDraftButton).toBeVisible({ timeout: POLL_TIMEOUT });
  await newDraftButton.click();
  await expect(page.locator('#root_person_name')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
};

test('dismisses success messages when other action buttons are clicked', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await createNewDraft(page);
  await page.locator('#root_person_name').fill('Test User');

  const docxSection = page.locator('.formpack-docx-export');
  const docxExportButton = docxSection.getByRole('button', {
    name: /export docx|docx exportieren/i,
  });
  const docxSuccess = docxSection.locator('.formpack-docx-export__success');
  await expect(docxExportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await docxExportButton.click();
  await expect(docxSuccess).toBeVisible({ timeout: POLL_TIMEOUT });

  const downloadPromise = page.waitForEvent('download');
  const exportJsonButton = page
    .getByRole('button', {
      name: /Entwurf exportieren \(JSON\)|Export record \(JSON\)/i,
    })
    .first();
  await expect(exportJsonButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await exportJsonButton.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  await expect(docxSuccess).toBeHidden({ timeout: POLL_TIMEOUT });

  await page
    .locator('#formpack-import-file')
    .setInputFiles(downloadPath as string);
  const importButton = page
    .getByRole('button', { name: /JSON importieren|Import JSON/i })
    .first();
  await expect(importButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await importButton.click();

  const importSuccess = page.locator('.formpack-import__success');
  await expect(importSuccess).toBeVisible({ timeout: POLL_TIMEOUT });

  await docxExportButton.click();
  await expect(importSuccess).toBeHidden({ timeout: POLL_TIMEOUT });
});
