import { expect, test, type Page } from '@playwright/test';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records'
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

const countObjectStoreRecords = async (page: Page, options: DbOptions = DB) => {
  return page.evaluate(async ({ dbName, storeName }) => {
    const openDb = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => resolve(request.result);
        request.onsuccess = () => resolve(request.result);
      });

    const db = await openDb();

    try {
      if (!db.objectStoreNames.contains(storeName)) return 0;

      return await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const countReq = store.count();
        countReq.onerror = () => reject(countReq.error);
        countReq.onsuccess = () => resolve(countReq.result);
      });
    } finally {
      db.close();
    }
  }, options);
};

const getActiveRecordId = async (page: Page) => {
  return page.evaluate((key) => window.localStorage.getItem(key), ACTIVE_RECORD_KEY);
};

const readRecordById = async (page: Page, id: string, options: DbOptions = DB) => {
  return page.evaluate(async ({ dbName, storeName, id }) => {
    const openDb = () =>
      new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => resolve(request.result);
        request.onsuccess = () => resolve(request.result);
      });

    const db = await openDb();

    try {
      if (!db.objectStoreNames.contains(storeName)) return null;

      return await new Promise<any>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const getReq = store.get(id);
        getReq.onerror = () => reject(getReq.error);
        getReq.onsuccess = () => resolve(getReq.result ?? null);
      });
    } finally {
      db.close();
    }
  }, { ...options, id });
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.count()) return;

  const newDraftButton = page.locator('.formpack-records__actions .app__button').first();
  if (await newDraftButton.count()) {
    await newDraftButton.click();
  } else {
    // Fallback (if CSS changes): click the first button on the page.
    await page.getByRole('button').first().click();
  }

  await expect(nameInput).toBeVisible();
};

const waitForNamePersisted = async (page: Page, expectedName: string) => {
  await expect
    .poll(
      async () => {
        const activeId = await getActiveRecordId(page);
        if (!activeId) return '';

        const record = await readRecordById(page, activeId);
        return record?.data?.person?.name ?? '';
      },
      { timeout: 15_000, intervals: [250, 500, 1000] }
    )
    .toBe(expectedName);
};

test('autosave persists and reload does not create extra records', async ({ page }) => {
  // Clean slate: no persisted state
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  // Ensure we have an editable form (active record)
  await clickNewDraftIfNeeded(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();

  // Edit form
  await nameInput.fill('Test User');

  // Wait until the value is actually persisted in IndexedDB (no flaky sleeps)
  await waitForNamePersisted(page, 'Test User');

  const countBefore = await countObjectStoreRecords(page);
  expect(countBefore).toBeGreaterThan(0);

  // Reload and verify no new record was created and value is restored
  await page.reload();

  const nameInputAfter = page.locator('#root_person_name');
  await expect(nameInputAfter).toBeVisible();
  await expect(nameInputAfter).toHaveValue('Test User');

  const countAfter = await countObjectStoreRecords(page);
  expect(countAfter).toBe(countBefore);
});
