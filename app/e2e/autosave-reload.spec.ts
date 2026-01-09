import { expect, test, type Page } from '@playwright/test';

type DbCountOptions = {
  dbName: string;
  storeName: string;
};

const DEFAULT_DB: DbCountOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
};

const deleteDatabase = async (page: Page, dbName: string) => {
  await page.evaluate(async (name) => {
    // Best-effort cleanup; failures should not make the test flaky.
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, dbName);
};

const countObjectStoreRecords = async (
  page: Page,
  options: DbCountOptions = DEFAULT_DB,
) => {
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
      if (!db.objectStoreNames.contains(storeName)) {
        return 0;
      }

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

const ensureActiveDraft = async (page: Page) => {
  // Wait until the form container is present; formpacks load async.
  await page.waitForSelector('.formpack-detail__form', { state: 'visible' });
  // Give the app a brief moment to auto-restore/create the initial record.
  await page.waitForTimeout(300);

  // If the form is not yet rendered (no active record), create a new draft.
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.count()) {
    return;
  }

  // The “New draft” button is rendered inside the records section.
  // We intentionally avoid text-based selectors to keep tests locale-independent.
  await page.locator('.formpack-records__actions .app__button').first().click();
  await expect(nameInput).toBeVisible();
};

test('autosave persists and reload does not create extra records', async ({ page }) => {
  // Start from a clean slate.
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DEFAULT_DB.dbName);

  await page.goto('/formpacks/notfallpass');
  await ensureActiveDraft(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();

  await nameInput.fill('Test User');

  // Wait for debounce (defaults to 1200ms) + a small buffer.
  await page.waitForTimeout(1700);

  const countBefore = await countObjectStoreRecords(page);
  expect(countBefore).toBeGreaterThan(0);

  await page.reload();

  const nameInputAfter = page.locator('#root_person_name');
  await expect(nameInputAfter).toHaveValue('Test User');

  const countAfter = await countObjectStoreRecords(page);
  expect(countAfter).toBe(countBefore);
});
