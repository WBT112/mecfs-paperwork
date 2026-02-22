import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from '../helpers';
import { clickActionButton } from '../helpers/actions';
import { openCollapsibleSectionById } from '../helpers/sections';

const FORM_PACK_ID = 'doctor-letter';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 30_000;
const BUTTON_LABEL = /pdf exportieren|export pdf/i;

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

test('pdf export works on mobile @mobile', async ({ page }) => {
  test.setTimeout(60_000);
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await expect(page.locator('.formpack-detail')).toBeVisible({
    timeout: POLL_TIMEOUT,
  });
  await ensureActiveRecord(page);

  const pdfSection = page.locator('.formpack-pdf-export');
  await expect(pdfSection).toBeVisible({ timeout: POLL_TIMEOUT });

  const exportButton = pdfSection.locator('button.app__button');
  await expect(exportButton).toBeEnabled({ timeout: POLL_TIMEOUT });

  const waitCompletion = async () => {
    const statusRegion = page.locator('.formpack-actions__status');
    const downloadPromise = page
      .waitForEvent('download', { timeout: POLL_TIMEOUT })
      .then((download) => ({ type: 'download' as const, download }));
    const successPromise = statusRegion
      .locator('.formpack-actions__success')
      .first()
      .waitFor({ state: 'visible', timeout: POLL_TIMEOUT })
      .then(() => ({ type: 'success' as const }));
    const errorPromise = statusRegion
      .locator('.app__error')
      .first()
      .waitFor({ state: 'visible', timeout: POLL_TIMEOUT })
      .then(() => ({ type: 'error' as const }));

    await clickActionButton(exportButton, POLL_TIMEOUT);
    return Promise.any([downloadPromise, successPromise, errorPromise]);
  };

  const completion = await waitCompletion().catch(async () => {
    await page.waitForTimeout(400);
    return waitCompletion();
  });

  if (completion.type === 'download') {
    expect(completion.download.suggestedFilename()).toMatch(/\.pdf$/i);
  } else if (completion.type === 'success') {
    await expect(
      page
        .locator('.formpack-actions__status')
        .locator('.formpack-actions__success'),
    ).toBeVisible({ timeout: POLL_TIMEOUT });
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
