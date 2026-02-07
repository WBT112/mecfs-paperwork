import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { clickActionButton } from './helpers/actions';
import { openCollapsibleSectionById } from './helpers/sections';
import {
  getActiveRecordId,
  waitForRecordById,
  waitForSnapshotCount,
} from './helpers/records';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';

test.setTimeout(60_000);

const waitForActiveRecordId = async (
  page: Page,
  timeout: number = 10_000,
) => {
  let activeId: string | null = null;

  await expect
    .poll(async () => {
      activeId = await getActiveRecordId(page, FORM_PACK_ID);
      return activeId;
    }, { timeout })
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

test.beforeEach(async ({ page }) => {
  await deleteDatabase(page, DB_NAME);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await expect(page.locator('.formpack-detail')).toBeVisible();
});

test('deletes a non-active draft and removes its snapshots', async ({
  page,
}) => {
  await openCollapsibleSectionById(page, 'formpack-records');

  const recordId = await ensureActiveRecordId(page);
  await waitForRecordById(page, recordId);

  await openCollapsibleSectionById(page, 'formpack-snapshots');
  await clickActionButton(
    page.getByRole('button', {
      name: /create\s*snapshot|snapshot\s*erstellen/i,
    }),
  );
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

  await openCollapsibleSectionById(page, 'formpack-records');
  page.once('dialog', (dialog) => dialog.accept());
  await clickActionButton(
    page.getByRole('button', { name: /delete\s*draft|entwurf\s*löschen/i }),
  );

  await expect(page.locator('.formpack-records__item')).toHaveCount(1);
  await waitForSnapshotCount(page, recordId, 0);
  await waitForRecordById(page, newRecordId as string);
});

test('clears snapshots for the active draft', async ({ page }) => {
  const recordId = await ensureActiveRecordId(page);
  await waitForRecordById(page, recordId);

  await openCollapsibleSectionById(page, 'formpack-snapshots');
  await clickActionButton(
    page.getByRole('button', {
      name: /create\s*snapshot|snapshot\s*erstellen/i,
    }),
  );
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);

  page.once('dialog', (dialog) => dialog.accept());
  await clickActionButton(
    page.getByRole('button', {
      name: /delete\s*all\s*snapshots|alle\s*snapshots\s*löschen/i,
    }),
  );

  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(0);
  await waitForSnapshotCount(page, recordId, 0);
});
