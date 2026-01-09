import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
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

const getActiveRecordId = async (page: Page) => {
  return page.evaluate(
    (key) => window.localStorage.getItem(key),
    ACTIVE_RECORD_KEY,
  );
};

const waitForActiveRecordId = async (page: Page) => {
  let activeId = '';
  await expect
    .poll(
      async () => {
        activeId = (await getActiveRecordId(page)) ?? '';
        return activeId;
      },
      { timeout: 10_000, intervals: [250, 500, 1000] },
    )
    .not.toBe('');
  return activeId;
};

const waitForRecordListReady = async (page: Page) => {
  await page.waitForFunction(() => {
    const empty = document.querySelector('.formpack-records__empty');
    if (empty) {
      const text = empty.textContent?.toLowerCase() ?? '';
      return !text.includes('loading') && !text.includes('geladen');
    }
    return true;
  });
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  const existingActiveId = await getActiveRecordId(page);
  if (existingActiveId) {
    await expect(nameInput).toBeVisible();
    return;
  }

  await waitForRecordListReady(page);

  const activeIdAfterLoad = await getActiveRecordId(page);
  if (activeIdAfterLoad) {
    await expect(nameInput).toBeVisible();
    return;
  }

  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  if (await newDraftButton.count()) {
    await newDraftButton.first().click();
  } else {
    // Fallback: click the first action button in the drafts area.
    await page
      .locator('.formpack-records__actions .app__button')
      .first()
      .click();
  }

  await waitForActiveRecordId(page);
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
  const exportButton = page
    .getByRole('button', {
      name: /Entwurf exportieren \(JSON\)|Export record \(JSON\)/i,
    })
    .first();
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).not.toBeNull();

  const contents = await readFile(filePath as string, 'utf-8');
  const payload = JSON.parse(contents) as {
    app: { id: string; version: string };
    formpack: { id: string; version: string };
    record: { id: string; name?: string; updatedAt: string };
    locale: string;
    exportedAt: string;
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
  expect(new Date(payload.exportedAt).toISOString()).toBe(payload.exportedAt);
  expect(payload.revisions).toBeUndefined();
});
