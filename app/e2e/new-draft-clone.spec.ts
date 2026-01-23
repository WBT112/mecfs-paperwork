import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { openCollapsibleSection } from './helpers/sections';

type DbOptions = { dbName: string; storeName: string };

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

const DB: DbOptions = { dbName: 'mecfs-paperwork', storeName: 'records' };

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

const waitForActiveRecordIdOrNull = async (page: Page, timeoutMs = 3000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const activeId = await getActiveRecordId(page);
    if (activeId) {
      return activeId;
    }
    await page.waitForTimeout(100);
  }
  return null;
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

const openDraftsSection = async (page: Page) => {
  await openCollapsibleSection(page, /entwürfe|drafts/i);
};

const clickNewDraftIfNeeded = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  const existingActiveId = await getActiveRecordId(page);
  if (existingActiveId) {
    await expect(nameInput).toBeVisible();
    return;
  }

  await openDraftsSection(page);
  await waitForRecordListReady(page);

  const autoDraftId = await waitForActiveRecordIdOrNull(page);
  if (autoDraftId) {
    await expect(nameInput).toBeVisible();
    return;
  }

  const existingDraftCount = await page
    .locator('.formpack-records__item')
    .count();
  if (existingDraftCount > 0) {
    const loadButton = page
      .locator('.formpack-records__item')
      .first()
      .getByRole('button', { name: /load\s*draft|entwurf\s*laden/i });
    if (await loadButton.count()) {
      await loadButton.click();
      await waitForActiveRecordId(page);
    }
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

const clickNewDraft = async (page: Page) => {
  await openDraftsSection(page);
  await waitForRecordListReady(page);

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
      { timeout: 15_000, intervals: [250, 500, 1000] },
    )
    .toBe(expectedName);
};

const loadNonActiveDraftViaUI = async (page: Page) => {
  await openDraftsSection(page);
  const nonActiveItem = page
    .locator('.formpack-records__item:not(.formpack-records__item--active)')
    .first();

  await expect(nonActiveItem).toBeVisible();

  // There is a single load button per record item in the current UI.
  await nonActiveItem
    .getByRole('button', { name: /load\s*draft|entwurf\s*laden/i })
    .click();
};

// Verifies new draft cloning, data isolation, and draft switching without creating extra records.
test('new draft clones data and old draft remains preserved (first clone + subsequent edits)', async ({
  page,
}) => {
  // Clean slate
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);
  await openDraftsSection(page);

  // Required behavior: user must click “New draft” to start
  await clickNewDraftIfNeeded(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();

  // 1) Enter data in Draft A and wait for autosave
  await nameInput.fill('Alice Clone');
  await waitForNamePersisted(page, 'Alice Clone');

  // There should be exactly one draft after the first save.
  const recordCountA = await countObjectStoreRecords(page);
  expect(recordCountA).toBe(1);

  const draftAId = await getActiveRecordId(page);
  expect(draftAId).toBeTruthy();

  // 2) Click “New draft” -> Draft B should be created as a clone
  await clickNewDraft(page);

  // New draft must have a different ID than Draft A.
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: 10_000,
      intervals: [250, 500, 1000],
    })
    .not.toBe(draftAId);

  const draftBId = await getActiveRecordId(page);
  expect(draftBId).toBeTruthy();

  // Creating Draft B should add exactly one more record.
  await expect
    .poll(async () => countObjectStoreRecords(page), {
      timeout: 10_000,
      intervals: [250, 500, 1000],
    })
    .toBe(recordCountA + 1);

  // 3) Verify both Draft A and Draft B contain the cloned value
  const recordAAfterClone = await readRecordById(page, draftAId as string);
  const recordBAfterClone = await readRecordById(page, draftBId as string);

  expect(recordAAfterClone?.data?.person?.name ?? '').toBe('Alice Clone');
  expect(recordBAfterClone?.data?.person?.name ?? '').toBe('Alice Clone');

  // 4) Edit Draft B and verify Draft A remains unchanged
  await expect(nameInput).toHaveValue('Alice Clone');
  await nameInput.fill('Bob In Draft B');
  await waitForNamePersisted(page, 'Bob In Draft B');

  const recordAAfterEditB = await readRecordById(page, draftAId as string);
  const recordBAfterEditB = await readRecordById(page, draftBId as string);

  expect(recordAAfterEditB?.data?.person?.name ?? '').toBe('Alice Clone');
  expect(recordBAfterEditB?.data?.person?.name ?? '').toBe('Bob In Draft B');

  // 5) Switch to Draft A via UI and verify the form shows Draft A data
  await loadNonActiveDraftViaUI(page);
  await expect(nameInput).toHaveValue('Alice Clone');

  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: 10_000,
      intervals: [250, 500, 1000],
    })
    .toBe(draftAId);

  // 6) Switch back to Draft B via UI and verify Draft B data
  await loadNonActiveDraftViaUI(page);
  await expect(nameInput).toHaveValue('Bob In Draft B');

  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: 10_000,
      intervals: [250, 500, 1000],
    })
    .toBe(draftBId);

  // 7) Ensure no extra records were created by switching
  // Switching drafts must not create any additional records.
  const recordCountEnd = await countObjectStoreRecords(page);
  expect(recordCountEnd).toBe(recordCountA + 1);
});
