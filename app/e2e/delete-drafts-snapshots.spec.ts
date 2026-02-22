import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openFormpackWithRetry } from './helpers/formpack';
import { openCollapsibleSectionById } from './helpers/sections';
import {
  getActiveRecordId,
  waitForRecordById,
  waitForSnapshotCount,
} from './helpers/records';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';

test.setTimeout(60_000);

const waitForActiveRecordId = async (page: Page, timeout: number = 10_000) => {
  let activeId: string | null = null;

  await expect
    .poll(
      async () => {
        activeId = await getActiveRecordId(page, FORM_PACK_ID);
        return activeId;
      },
      { timeout },
    )
    .not.toBeNull();

  return activeId as string;
};

const ensureActiveRecordId = async (page: Page) => {
  try {
    return await waitForActiveRecordId(page, 12_000);
  } catch {
    await openCollapsibleSectionById(page, 'formpack-records');
    const newDraftButton = page.getByRole('button', {
      name: /new draft|neuer entwurf/i,
    });
    if (await newDraftButton.count()) {
      await clickActionButton(newDraftButton.first());
    } else {
      await clickActionButton(
        page.locator('.formpack-records__actions .app__button').first(),
      );
    }
    return waitForActiveRecordId(page, 20_000);
  }
};

const createSnapshot = async (page: Page) => {
  const actionButtons = page.locator(
    '.formpack-snapshots__actions .app__button',
  );
  await expect(actionButtons.first()).toBeVisible({ timeout: 15_000 });
  await clickActionButton(actionButtons.first());
};

const clearAllSnapshots = async (page: Page) => {
  const actionsButtons = page.locator(
    '.formpack-snapshots__actions .app__button',
  );
  await expect(actionsButtons.first()).toBeVisible({ timeout: 15_000 });
  const buttonCount = await actionsButtons.count();
  await clickActionButton(actionsButtons.nth(Math.max(0, buttonCount - 1)));
};

test.beforeEach(async ({ page }) => {
  await deleteDatabase(page, DB_NAME);
  await openFormpackWithRetry(
    page,
    FORM_PACK_ID,
    page.locator('#formpack-records-toggle'),
  );
  await expect(page.locator('.formpack-detail')).toBeVisible();
});

test('deletes a non-active draft and removes its snapshots', async ({
  page,
  browserName,
}) => {
  test.slow(browserName !== 'chromium', 'non-chromium is slower/flakier here');
  await openCollapsibleSectionById(page, 'formpack-records');

  const recordId = await ensureActiveRecordId(page);
  await waitForRecordById(page, recordId);

  await openCollapsibleSectionById(page, 'formpack-snapshots');
  await createSnapshot(page);
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);
  await waitForSnapshotCount(page, recordId, 1);

  await openCollapsibleSectionById(page, 'formpack-records');
  await clickActionButton(
    page.locator('.formpack-records__actions .app__button').first(),
  );

  let newRecordId: string | null = null;
  await expect
    .poll(async () => {
      newRecordId = await getActiveRecordId(page, FORM_PACK_ID);
      return newRecordId;
    })
    .not.toBe(recordId);
  await expect
    .poll(async () => page.locator('.formpack-records__item').count(), {
      timeout: 20_000,
    })
    .toBeGreaterThan(1);

  await openCollapsibleSectionById(page, 'formpack-records');
  const nonActiveRecordItem = page
    .locator('.formpack-records__item:not(.formpack-records__item--active)')
    .first();
  await expect(nonActiveRecordItem).toBeVisible();
  const itemButtons = nonActiveRecordItem.locator('button');
  const buttonCount = await itemButtons.count();
  const deleteDraftButton = itemButtons.nth(Math.max(0, buttonCount - 1));
  page.once('dialog', (dialog) => dialog.accept());
  await clickActionButton(deleteDraftButton);

  await expect(page.locator('.formpack-records__item')).toHaveCount(1);
  await waitForSnapshotCount(page, recordId, 0);
  await waitForRecordById(page, newRecordId as string);
});

test('clears snapshots for the active draft', async ({ page, browserName }) => {
  test.slow(browserName !== 'chromium', 'non-chromium is slower/flakier here');
  const recordId = await ensureActiveRecordId(page);
  await waitForRecordById(page, recordId);

  await openCollapsibleSectionById(page, 'formpack-snapshots');
  await createSnapshot(page);
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);

  page.once('dialog', (dialog) => dialog.accept());
  await clearAllSnapshots(page);

  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(0);
  await waitForSnapshotCount(page, recordId, 0);
});
