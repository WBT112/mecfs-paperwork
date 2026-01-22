import { expect, test } from '@playwright/test';
import { deleteDatabase } from './helpers';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';

test('collapsible sections default and toggle offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  const draftsToggle = page.locator('.collapsible-section__toggle', {
    hasText: /entwürfe|drafts/i,
  });
  const importToggle = page.locator('.collapsible-section__toggle', {
    hasText: /import/i,
  });
  const historyToggle = page.locator('.collapsible-section__toggle', {
    hasText: /verlauf|history/i,
  });
  const previewToggle = page.locator('.collapsible-section__toggle', {
    hasText: /dokumentvorschau|document preview/i,
  });

  await expect(draftsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(importToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(historyToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(previewToggle).toHaveAttribute('aria-expanded', 'true');

  await context.setOffline(true);

  await draftsToggle.click();
  await expect(draftsToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('button', { name: /new\s*draft|neuer\s*entwurf/i }),
  ).toBeVisible();

  await importToggle.click();
  await expect(importToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#formpack-import-file')).toBeVisible();

  await historyToggle.click();
  await expect(historyToggle).toHaveAttribute('aria-expanded', 'true');
  const snapshotAction = page.locator(
    '.formpack-snapshots__actions .app__button',
  );
  if (await snapshotAction.count()) {
    await expect(snapshotAction.first()).toBeVisible();
  } else {
    await expect(page.locator('.formpack-snapshots__empty')).toBeVisible();
  }

  await previewToggle.click();
  await expect(previewToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.locator(
      '.formpack-document-preview, .formpack-document-preview__empty',
    ),
  ).toBeHidden();

  await previewToggle.click();
  await expect(previewToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.locator(
      '.formpack-document-preview, .formpack-document-preview__empty',
    ),
  ).toBeVisible();

  await context.setOffline(false);
});
