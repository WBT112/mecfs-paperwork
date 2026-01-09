import { expect, test, type Page } from '@playwright/test';

type DbOptions = { dbName: string; storeName: string };

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

const DB: DbOptions = { dbName: 'mecfs-paperwork', storeName: 'records' };

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
  return page.evaluate(
    async ({ dbName, storeName, id }) => {
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
    },
    { ...options, id }
  );
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

const ensureDraftExists = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.count()) return;

  // Preferred: role-based, locale-tolerant selector
  const newDraftBtn = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i
  });

  if (await newDraftBtn.count()) {
    await newDraftBtn.first().click();
  } else {
    // Fallback: keep your existing layout class hook
    await page.locator('.formpack-records__actions .app__button').first().click();
  }

  await expect(nameInput).toBeVisible();
};

const createSnapshot = async (page: Page) => {
  const createBtn = page.getByRole('button', {
    name: /create\s*snapshot|snapshot\s*erstellen|momentaufnahme/i
  });

  if (await createBtn.count()) {
    await createBtn.first().click();
  } else {
    await page.locator('.formpack-snapshots__actions .app__button').first().click();
  }

  const items = page.locator('.formpack-snapshots__item');
  await expect(items).toHaveCount(1, { timeout: 10_000 });
};

const restoreFirstSnapshot = async (page: Page) => {
  const snapshotItem = page.locator('.formpack-snapshots__item').first();
  await expect(snapshotItem).toBeVisible();

  // Try to click the restore action explicitly (locale-tolerant).
  const restoreBtn = snapshotItem.getByRole('button', {
    name: /restore|wiederherstellen|laden/i
  });

  if (await restoreBtn.count()) {
    await restoreBtn.first().click();
    return;
  }

  // Fallback: in many UIs the restore button is the last action (delete is often first).
  const buttons = snapshotItem.locator('button');
  const btnCount = await buttons.count();
  if (btnCount === 0) throw new Error('No action buttons found in snapshot item.');
  await buttons.nth(btnCount - 1).click();
};

test('snapshot restore restores data and does not create extra records', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  await ensureDraftExists(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();

  // 1) Set initial value and wait for persistence
  await nameInput.fill('Alice Snapshot');
  await waitForNamePersisted(page, 'Alice Snapshot');

  const recordsCountBaseline = await countObjectStoreRecords(page);
  expect(recordsCountBaseline).toBeGreaterThan(0);

  // 2) Create snapshot and verify it appears
  await createSnapshot(page);

  // 3) Change value and persist
  await nameInput.fill('Bob After Change');
  await waitForNamePersisted(page, 'Bob After Change');

  // 4) Restore snapshot and verify value + persistence
  await restoreFirstSnapshot(page);

  await expect(nameInput).toHaveValue('Alice Snapshot', { timeout: 10_000 });
  await waitForNamePersisted(page, 'Alice Snapshot');

  // Restore should not create a new draft record
  const recordsCountAfterRestore = await countObjectStoreRecords(page);
  expect(recordsCountAfterRestore).toBe(recordsCountBaseline);

  // 5) Reload: restored value must remain, and still no extra records
  await page.reload();

  await expect(nameInput).toBeVisible();
  await expect(nameInput).toHaveValue('Alice Snapshot');

  const recordsCountAfterReload = await countObjectStoreRecords(page);
  expect(recordsCountAfterReload).toBe(recordsCountBaseline);
});
