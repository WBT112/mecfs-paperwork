import { expect, test } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { getCollapsibleSectionToggleById } from './helpers/sections';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';

test.setTimeout(60000);

test('collapsible sections default and toggle offline', async ({
  page,
  context,
}) => {
  await deleteDatabase(page, DB_NAME);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto(`/formpacks/${FORM_PACK_ID}`);

    const manifestLoadError = page.getByText(
      /unable to reach the formpack manifest/i,
    );

    const recordsToggle = page.locator('#formpack-records-toggle');
    const recordsVisible = await recordsToggle
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    if (recordsVisible) {
      break;
    }

    if (await manifestLoadError.isVisible().catch(() => false)) {
      if (attempt < 2) {
        await page.waitForTimeout(250);
        continue;
      }
    }
  }

  await expect(page.locator('#formpack-records-toggle')).toBeVisible();

  const draftsToggle = getCollapsibleSectionToggleById(
    page,
    'formpack-records',
  );
  const importToggle = getCollapsibleSectionToggleById(page, 'formpack-import');
  const historyToggle = getCollapsibleSectionToggleById(
    page,
    'formpack-snapshots',
  );
  const previewToggle = getCollapsibleSectionToggleById(
    page,
    'formpack-document-preview',
  );
  const toolsHeading = page.getByRole('heading', {
    name: /tools|werkzeuge/i,
  });

  await expect(draftsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(importToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(historyToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(previewToggle).toHaveAttribute('aria-expanded', 'false');

  await draftsToggle.focus();
  await page.keyboard.press('Enter');
  await expect(draftsToggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(draftsToggle).toHaveAttribute('aria-expanded', 'false');

  const previewBox = await previewToggle.boundingBox();
  const toolsBox = await toolsHeading.boundingBox();
  expect(previewBox).not.toBeNull();
  expect(toolsBox).not.toBeNull();
  if (previewBox && toolsBox) {
    expect(previewBox.y).toBeLessThan(toolsBox.y);
  }

  const toolsSection = toolsHeading.locator('..');
  await expect(toolsSection.locator('#formpack-records-toggle')).toBeVisible();
  await expect(toolsSection.locator('#formpack-import-toggle')).toBeVisible();
  await expect(
    toolsSection.locator('#formpack-snapshots-toggle'),
  ).toBeVisible();

  await context.setOffline(true);

  await clickActionButton(draftsToggle);
  await expect(draftsToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('button', { name: /new\s*draft|neuer\s*entwurf/i }),
  ).toBeVisible();

  await clickActionButton(importToggle);
  await expect(importToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#formpack-import-file')).toBeVisible();

  await clickActionButton(historyToggle);
  await expect(historyToggle).toHaveAttribute('aria-expanded', 'true');
  const snapshotAction = page.locator(
    '.formpack-snapshots__actions .app__button',
  );
  if (await snapshotAction.count()) {
    await expect(snapshotAction.first()).toBeVisible();
  } else {
    await expect(page.locator('.formpack-snapshots__empty')).toBeVisible();
  }

  await clickActionButton(previewToggle);
  await expect(previewToggle).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.locator(
      '.formpack-document-preview, .formpack-document-preview__empty',
    ),
  ).toBeVisible();

  await clickActionButton(previewToggle);
  await expect(previewToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.locator(
      '.formpack-document-preview, .formpack-document-preview__empty',
    ),
  ).toBeHidden();

  await context.setOffline(false);
});
