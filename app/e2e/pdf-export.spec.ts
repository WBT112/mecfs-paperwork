import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openCollapsibleSection } from './helpers/sections';

const FORM_PACK_ID = 'doctor-letter';
const DB_NAME = 'mecfs-paperwork';
const POLL_TIMEOUT = 20_000;

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

  await clickActionButton(exportButton, POLL_TIMEOUT);

  await expect(exportButton).toBeDisabled({ timeout: POLL_TIMEOUT });
  await expect(exportButton).toHaveText(/pdf wird erstellt|generating pdf/i, {
    timeout: POLL_TIMEOUT,
  });
  await expect(pdfSection.locator('.app__error')).toHaveCount(0);
});
