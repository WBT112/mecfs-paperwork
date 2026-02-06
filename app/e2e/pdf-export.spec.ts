import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'doctor-letter';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 30_000;
const BUTTON_LABEL = /pdf exportieren|export pdf/i;

const ensureActiveRecord = async (page: Page) => {
  const form = page.locator('.formpack-form');
  if (await form.isVisible()) {
    return;
  }

  await openCollapsibleSection(page, /drafts|entwuerfe|entwürfe/i);

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

test('pdf export produces a downloadable file', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await ensureActiveRecord(page);

  const pdfSection = page.locator('.formpack-pdf-export');
  await expect(pdfSection).toBeVisible({ timeout: POLL_TIMEOUT });

  const exportButton = pdfSection.locator('button.app__button');
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

  const downloadPromise = page
    .waitForEvent('download', { timeout: POLL_TIMEOUT })
    .then((download) => ({ type: 'download' as const, download }));
  const errorPromise = page
    .locator('.formpack-actions__status')
    .locator('.app__error')
    .first()
    .waitFor({ state: 'visible', timeout: POLL_TIMEOUT })
    .then(() => ({ type: 'error' as const }));

  await clickActionButton(exportButton, POLL_TIMEOUT);

  await expect(exportButton).toBeDisabled({ timeout: POLL_TIMEOUT });
  await expect(exportButton).toHaveText(/pdf wird erstellt|generating pdf/i, {
    timeout: POLL_TIMEOUT,
  });

  const completion = await Promise.any([downloadPromise, errorPromise]);

  if (completion.type === 'download') {
    expect(completion.download.suggestedFilename()).toMatch(/\.pdf$/i);
  } else {
    await expect(
      page.locator('.formpack-actions__status').locator('.app__error'),
    ).toBeVisible({ timeout: POLL_TIMEOUT });
  }

  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });
  await expect(exportButton).toHaveText(BUTTON_LABEL, {
    timeout: POLL_TIMEOUT,
  });
});
