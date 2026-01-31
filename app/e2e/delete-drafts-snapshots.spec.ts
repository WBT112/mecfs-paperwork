import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { openCollapsibleSection } from './helpers/sections';
import {
  getActiveRecordId,
  waitForRecordById,
  waitForSnapshotCount,
} from './helpers/records';

const FORM_PACK_ID = 'notfallpass';
const DB_NAME = 'mecfs-paperwork';

const waitForActiveRecordId = async (page: Page) => {
  let activeId: string | null = null;

  await expect
    .poll(async () => {
      activeId = await getActiveRecordId(page, FORM_PACK_ID);
      return activeId;
    })
    .not.toBeNull();

  return activeId as string;
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);
  await page.goto(`/formpacks/${FORM_PACK_ID}`);
});

test('deletes a non-active draft and removes its snapshots', async ({
  page,
}) => {
  await openCollapsibleSection(page, /entwürfe|drafts/i);

  const recordId = await waitForActiveRecordId(page);
  await waitForRecordById(page, recordId);

  await openCollapsibleSection(page, /verlauf|history/i);
  await page
    .getByRole('button', { name: /create\s*snapshot|snapshot\s*erstellen/i })
    .click();
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);
  await waitForSnapshotCount(page, recordId, 1);

  await openCollapsibleSection(page, /entwürfe|drafts/i);
  await page
    .getByRole('button', { name: /new\s*draft|neuer\s*entwurf/i })
    .click();

  let newRecordId: string | null = null;
  await expect
    .poll(async () => {
      newRecordId = await getActiveRecordId(page, FORM_PACK_ID);
      return newRecordId;
    })
    .not.toBe(recordId);

  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: /delete\s*draft|entwurf\s*löschen/i })
    .click();

  await expect(page.locator('.formpack-records__item')).toHaveCount(1);
  await waitForSnapshotCount(page, recordId, 0);
  await waitForRecordById(page, newRecordId as string);
});

test('clears snapshots for the active draft', async ({ page }) => {
  const recordId = await waitForActiveRecordId(page);
  await waitForRecordById(page, recordId);

  await openCollapsibleSection(page, /verlauf|history/i);
  await page
    .getByRole('button', { name: /create\s*snapshot|snapshot\s*erstellen/i })
    .click();
  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(1);

  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', {
      name: /delete\s*all\s*snapshots|alle\s*snapshots\s*löschen/i,
    })
    .click();

  await expect(page.locator('.formpack-snapshots__item')).toHaveCount(0);
  await waitForSnapshotCount(page, recordId, 0);
});
