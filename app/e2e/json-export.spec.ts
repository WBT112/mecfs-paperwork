import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
};

const deleteDatabase = async (page: Page, dbName: string) => {
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, dbName);
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.count()) return;

  const newDraftButton = page
    .locator('.formpack-records__actions .app__button')
    .first();
  if (await newDraftButton.count()) {
    await newDraftButton.click();
  } else {
    await page.getByRole('button').first().click();
  }

  await expect(nameInput).toBeVisible();
};

test('exports JSON with record metadata and form data', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await clickNewDraftIfNeeded(page);

  await page.locator('#root_person_name').fill('Test User');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /JSON/ }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).not.toBeNull();

  const contents = await readFile(filePath as string, 'utf-8');
  const payload = JSON.parse(contents) as {
    app: { id: string; version: string };
    formpack: { id: string; version: string };
    record: { id: string; name?: string; updatedAt: string };
    locale: string;
    createdAt: string;
    data: Record<string, unknown>;
    revisions?: unknown[];
  };

  expect(payload.app.id).toBe('mecfs-paperwork');
  expect(payload.formpack.id).toBe(FORM_PACK_ID);
  expect(payload.record.id).toBeTruthy();
  expect(payload.record.updatedAt).toBeTruthy();
  expect(payload.locale).toBe('de');
  expect(payload.data).toMatchObject({
    person: {
      name: 'Test User',
    },
  });
  expect(new Date(payload.createdAt).toISOString()).toBe(payload.createdAt);
  expect(payload.revisions).toBeUndefined();
});
