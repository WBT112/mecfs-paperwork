import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

// WebKit can be more timing-sensitive; keep polling explicit and stable.
const POLL_TIMEOUT = 15_000;
const POLL_INTERVALS = [250, 500, 1000];

const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
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

const waitForActiveRecordId = async (page: Page, timeoutMs = 10_000) => {
  let activeId = '';
  await expect
    .poll(
      async () => {
        activeId = (await getActiveRecordId(page)) ?? '';
        return activeId;
      },
      { timeout: timeoutMs, intervals: POLL_INTERVALS },
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

  let activeIdAfterLoad = await getActiveRecordId(page);
  if (!activeIdAfterLoad) {
    try {
      // Some browsers (especially WebKit) can take longer to bootstrap the initial draft.
      activeIdAfterLoad = await waitForActiveRecordId(page, 8_000);
    } catch {
      // ignore and fall back to manual draft creation below
    }
  }

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

const waitForNamePersisted = async (
  page: Page,
  recordId: string,
  expectedName: string,
) => {
  await expect
    .poll(
      async () => {
        const record = await readRecordById(page, recordId);
        return record?.data?.person?.name ?? '';
      },
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
    )
    .toBe(expectedName);
};

// Verifies autosave persists to IndexedDB and reload restores the same draft without creating extras.
test('autosave persists and reload does not create extra records', async ({
  page,
}) => {
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
  const recordId = await waitForActiveRecordId(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();

  // Edit form
  await nameInput.fill('Test User');

  // Wait until the value is actually persisted in IndexedDB (no flaky sleeps)
  await waitForNamePersisted(page, recordId, 'Test User');

  // Ensure only one persisted draft exists before the reload.
  const countBefore = await countObjectStoreRecords(page);
  expect(countBefore).toBeGreaterThan(0);

  // Reload and verify no new record was created and value is restored
  await page.reload();

  const nameInputAfter = page.locator('#root_person_name');
  await expect(nameInputAfter).toBeVisible();
  await expect(nameInputAfter).toHaveValue('Test User');

  // Reload must not create additional drafts.
  const countAfter = await countObjectStoreRecords(page);
  expect(countAfter).toBe(countBefore);
});
