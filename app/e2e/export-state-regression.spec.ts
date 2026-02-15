import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import { openCollapsibleSectionById } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

const waitForRecordListReady = async (page: Page) => {
  await page.waitForFunction(() => {
    const empty = document.querySelector('.formpack-records__empty');
    if (empty) {
      const text = empty.textContent?.toLowerCase() ?? '';
      return !text.includes('loading') && !text.includes('geladen');
    }
    return true;
  });
};

const openDraftsSection = async (page: Page) => {
  await openCollapsibleSectionById(page, 'formpack-records');
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.isVisible()) {
    return;
  }

  await openDraftsSection(page);
  await waitForRecordListReady(page);
  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  if (await newDraftButton.count()) {
    await clickActionButton(newDraftButton.first(), POLL_TIMEOUT);
  } else {
    await clickActionButton(
      page.locator('.formpack-records__actions .app__button').first(),
      POLL_TIMEOUT,
    );
  }
  await expect(nameInput).toBeVisible({ timeout: POLL_TIMEOUT });
};

test('json export followed by docx export re-enables actions', async ({
  page,
}) => {
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
  await openDraftsSection(page);
  await clickNewDraftIfNeeded(page);

  await page.locator('#root_person_name').fill('Export Regression');
  await page.locator('#root_diagnoses_meCfs').check();

  const jsonExportButton = page
    .getByRole('button', {
      name: /Entwurf exportieren \(JSON\)|Export draft \(JSON\)/i,
    })
    .first();
  const jsonDownloadPromise = page.waitForEvent('download');
  await clickActionButton(jsonExportButton, POLL_TIMEOUT);
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/i);

  const docxExportButton = page
    .locator('.formpack-docx-export .app__button')
    .first();
  const docxSection = page.locator('.formpack-docx-export');
  await expect(docxSection).toBeVisible({ timeout: POLL_TIMEOUT });

  const docxDownloadPromise = page.waitForEvent('download');
  await clickActionButton(docxExportButton, POLL_TIMEOUT);
  const docxDownload = await docxDownloadPromise;
  expect(docxDownload.suggestedFilename()).toMatch(/\.docx$/i);

  await expect(
    page
      .locator('.formpack-actions__status')
      .locator('.formpack-actions__success'),
  ).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(jsonExportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await expect(docxExportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
});
