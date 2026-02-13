import { expect, test } from '@playwright/test';
import { deleteDatabase } from './helpers';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'offlabel-antrag';

test.beforeEach(async ({ page }) => {
  await deleteDatabase(page, DB_NAME);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
});

test('blocks form until intro is accepted and keeps form stable after notes modal close', async ({
  page,
}) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  const introBody = page.locator('.formpack-intro-gate__content');
  const acceptanceCheckbox = page.getByLabel(
    /Habe verstanden, Nutzung auf eigenes Risiko/i,
  );
  const continueButton = page.getByRole('button', { name: /weiter/i });

  await expect(introHeading).toBeVisible();
  await expect(page.locator('.formpack-form')).toHaveCount(0);
  await expect(page.locator('#formpack-document-preview-toggle')).toHaveCount(
    0,
  );
  await expect(continueButton).toBeDisabled();

  await introBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await acceptanceCheckbox.check();
  await expect(continueButton).toBeEnabled();

  await continueButton.click();

  const reopenNotesButton = page.getByRole('button', {
    name: /Hinweise anzeigen/i,
  });
  await expect(reopenNotesButton).toBeVisible();
  await expect(page.locator('.formpack-form')).toBeVisible();

  await reopenNotesButton.click();

  const notesDialog = page.getByRole('dialog', { name: /Hinweise/i });
  await expect(notesDialog).toBeVisible();
  await notesDialog.getByRole('button', { name: /Schließen/i }).click();

  await expect(notesDialog).toHaveCount(0);
  await expect(page.locator('.formpack-form')).toBeVisible();
  await expect(page.locator('.app__error')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(
    /Invalid "root" object field configuration/i,
  );
});
