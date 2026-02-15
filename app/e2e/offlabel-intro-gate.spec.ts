import { expect, test } from '@playwright/test';
import { deleteDatabase } from './helpers';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'offlabel-antrag';

test.setTimeout(60_000);
test.beforeEach(async ({ page }) => {
  await deleteDatabase(page, DB_NAME);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto(`/formpacks/${FORM_PACK_ID}`);

    const introHeading = page.getByRole('heading', { name: /hinweise/i });
    const hasIntro = await introHeading
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    if (hasIntro) {
      return;
    }

    const manifestLoadError = page.getByText(
      /unable to reach the formpack manifest/i,
    );
    const hasManifestError = await manifestLoadError
      .isVisible({ timeout: 1_000 })
      .catch(() => false);
    if (!hasManifestError || attempt === 3) {
      break;
    }
  }
});

test('blocks form until intro is accepted and keeps form stable after notes modal close', async ({
  page,
}) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
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

  await acceptanceCheckbox.check();
  await expect(continueButton).toBeEnabled();

  await continueButton.click();

  const reopenNotesButton = page.getByRole('button', {
    name: /Hinweise anzeigen/i,
  });
  await expect(reopenNotesButton).toBeVisible({ timeout: 20_000 });

  await reopenNotesButton.click();

  const notesDialog = page.getByRole('dialog', { name: /Hinweise/i });
  const dialogVisible = await notesDialog
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (dialogVisible) {
    await notesDialog.getByRole('button', { name: /Schließen/i }).click();
    await expect(notesDialog).toHaveCount(0);
  }
  await expect(page.locator('.app__error')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(
    /Invalid "root" object field configuration/i,
  );
});
