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

const clickSectionActionButton = async (
  page: Page,
  sectionId: string,
  actionSelector: string,
  pick: 'first' | 'last' = 'first',
  timeoutMs = 20_000,
) => {
  const toggle = page.locator(`#${sectionId}-toggle`);
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    await expect(toggle).toBeVisible({
      timeout: Math.min(5_000, timeoutMs - (Date.now() - startedAt)),
    });
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await clickActionButton(toggle);
    }
    const actions = page.locator(actionSelector);
    const actionsCount = await actions.count();
    if (actionsCount > 0) {
      const targetButton =
        pick === 'last' ? actions.nth(actionsCount - 1) : actions.first();
      if (
        (await targetButton.isVisible().catch(() => false)) &&
        (await targetButton.isEnabled().catch(() => false))
      ) {
        try {
          await clickActionButton(targetButton, 4_000);
          return;
        } catch {
          // Retry with a freshly resolved locator on the next loop iteration.
        }
      }
    }
    attempt += 1;
    await page.waitForTimeout(100 * attempt);
  }

  const finalActions = page.locator(actionSelector);
  const finalCount = await finalActions.count();
  const finalButton =
    pick === 'last'
      ? finalActions.nth(Math.max(0, finalCount - 1))
      : finalActions.first();
  await expect(finalButton).toBeVisible({ timeout: 1_000 });
  await clickActionButton(finalButton, 4_000);
};

const ensureActiveRecordId = async (page: Page) => {
  try {
    return await waitForActiveRecordId(page, 12_000);
  } catch {
    await clickSectionActionButton(
      page,
      'formpack-records',
      '.formpack-records__actions .app__button',
    );
    return waitForActiveRecordId(page, 20_000);
  }
};

const createSnapshot = async (page: Page) => {
  await clickSectionActionButton(
    page,
    'formpack-snapshots',
    '.formpack-snapshots__actions .app__button:visible',
  );
};

const clearAllSnapshots = async (page: Page) => {
  await clickSectionActionButton(
    page,
    'formpack-snapshots',
    '.formpack-snapshots__actions .app__button:visible',
    'last',
  );
};

const clickDeleteOnFirstNonActiveRecord = async (
  page: Page,
  timeoutMs = 20_000,
) => {
  const startedAt = Date.now();
  let attempt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    await openCollapsibleSectionById(page, 'formpack-records');
    const deleteButton = page
      .locator(
        '.formpack-records__item:not(.formpack-records__item--active) .formpack-records__item-actions .app__icon-button',
      )
      .first();

    if (
      (await deleteButton.isVisible().catch(() => false)) &&
      (await deleteButton.isEnabled().catch(() => false))
    ) {
      page.once('dialog', (dialog) => dialog.accept());
      try {
        await clickActionButton(deleteButton, 4_000);
        return;
      } catch {
        // Retry with a freshly resolved locator on the next loop iteration.
      }
    }

    attempt += 1;
    await page.waitForTimeout(100 * attempt);
  }

  const finalButton = page
    .locator(
      '.formpack-records__item:not(.formpack-records__item--active) .formpack-records__item-actions .app__icon-button',
    )
    .first();
  await expect(finalButton).toBeVisible({ timeout: 1_000 });
  page.once('dialog', (dialog) => dialog.accept());
  await clickActionButton(finalButton, 4_000);
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
  await waitForSnapshotCount(page, recordId, 1);
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);

  await openCollapsibleSectionById(page, 'formpack-records');
  await clickSectionActionButton(
    page,
    'formpack-records',
    '.formpack-records__actions .app__button',
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

  await clickDeleteOnFirstNonActiveRecord(page);

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
  await waitForSnapshotCount(page, recordId, 1);
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);

  page.once('dialog', (dialog) => dialog.accept());
  await clearAllSnapshots(page);

  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(0);
  await waitForSnapshotCount(page, recordId, 0);
});
