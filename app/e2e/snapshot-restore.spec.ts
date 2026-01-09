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
    const openExistingDb = async () => {
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        if (!databases.some((db) => db.name === dbName)) {
          return null;
        }
      }

      return await new Promise<IDBDatabase | null>((resolve) => {
        let aborted = false;
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          aborted = true;
          request.transaction?.abort();
        };
        request.onsuccess = () => {
          const db = request.result;
          if (aborted) {
            db.close();
            resolve(null);
            return;
          }
          resolve(db);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      });
    };

    const db = await openExistingDb();
    if (!db) return 0;
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

const readRecordById = async (
  page: Page,
  id: string,
  options: DbOptions = DB,
) => {
  return page.evaluate(
    async ({ dbName, storeName, id }) => {
      const openExistingDb = async () => {
        if (indexedDB.databases) {
          const databases = await indexedDB.databases();
          if (!databases.some((db) => db.name === dbName)) {
            return null;
          }
        }

        return await new Promise<IDBDatabase | null>((resolve) => {
          let aborted = false;
          const request = indexedDB.open(dbName);
          request.onupgradeneeded = () => {
            aborted = true;
            request.transaction?.abort();
          };
          request.onsuccess = () => {
            const db = request.result;
            if (aborted) {
              db.close();
              resolve(null);
              return;
            }
            resolve(db);
          };
          request.onerror = () => resolve(null);
          request.onblocked = () => resolve(null);
        });
      };

      const db = await openExistingDb();
      if (!db) return null;
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
    { ...options, id },
  );
};

const waitForNamePersisted = async (
  page: Page,
  expectedName: string,
  recordId?: string,
) => {
  await expect
    .poll(
      async () => {
        const activeId = recordId ?? (await getActiveRecordId(page));
        if (!activeId) return '';
        const record = await readRecordById(page, activeId);
        return record?.data?.person?.name ?? '';
      },
      { timeout: 15_000, intervals: [250, 500, 1000] },
    )
    .toBe(expectedName);
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

const createSnapshot = async (page: Page) => {
  const createBtn = page.getByRole('button', {
    name: /create\s*snapshot|snapshot\s*erstellen|momentaufnahme/i,
  });

  if (await createBtn.count()) {
    await createBtn.first().click();
  } else {
    await page
      .locator('.formpack-snapshots__actions .app__button')
      .first()
      .click();
  }

  const items = page.locator('.formpack-snapshots__item');
  await expect(items).toHaveCount(1, { timeout: 10_000 });
};

const restoreFirstSnapshot = async (page: Page) => {
  const snapshotItem = page.locator('.formpack-snapshots__item').first();
  await expect(snapshotItem).toBeVisible();

  // Try to click the restore action explicitly (locale-tolerant).
  const restoreBtn = snapshotItem.getByRole('button', {
    name: /restore|wiederherstellen|laden/i,
  });

  if (await restoreBtn.count()) {
    await restoreBtn.first().click();
    return;
  }

  // Fallback: in many UIs the restore button is the last action (delete is often first).
  const buttons = snapshotItem.locator('button');
  const btnCount = await buttons.count();
  if (btnCount === 0)
    throw new Error('No action buttons found in snapshot item.');
  await buttons.nth(btnCount - 1).click();
};

// Verifies snapshot creation/restoration and ensures no extra drafts are created across reloads.
test('snapshot restore restores data and does not create extra records', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  await clickNewDraftIfNeeded(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();
  const activeRecordId = await waitForActiveRecordId(page);

  // 1) Set initial value and wait for persistence
  await nameInput.fill('Alice Snapshot');
  await waitForNamePersisted(page, 'Alice Snapshot', activeRecordId);

  // Snapshot operations must stay within the existing draft.
  const recordsCountBaseline = await countObjectStoreRecords(page);
  expect(recordsCountBaseline).toBeGreaterThan(0);

  // 2) Create snapshot and verify it appears
  await createSnapshot(page);

  // 3) Change value and persist
  await nameInput.fill('Bob After Change');
  await waitForNamePersisted(page, 'Bob After Change', activeRecordId);

  // 4) Restore snapshot and verify value + persistence
  await restoreFirstSnapshot(page);

  await expect(nameInput).toHaveValue('Alice Snapshot', { timeout: 10_000 });
  await waitForNamePersisted(page, 'Alice Snapshot', activeRecordId);

  // Restore should not create a new draft record
  // Restoring a snapshot must not create a new draft.
  const recordsCountAfterRestore = await countObjectStoreRecords(page);
  expect(recordsCountAfterRestore).toBe(recordsCountBaseline);

  // 5) Reload: restored value must remain, and still no extra records
  await page.reload();

  await expect(nameInput).toBeVisible();
  await expect(nameInput).toHaveValue('Alice Snapshot');

  // Reload must keep the same record count after restoration.
  const recordsCountAfterReload = await countObjectStoreRecords(page);
  expect(recordsCountAfterReload).toBe(recordsCountBaseline);
});
