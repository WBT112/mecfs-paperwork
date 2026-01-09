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

const ensureDraftExists = async (page: Page) => {
  const nameInput = page.locator('#root_person_name');
  if (await nameInput.count()) return;

  const newDraftBtn = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i
  });

  if (await newDraftBtn.count()) {
    await newDraftBtn.first().click();
  } else {
    await page.locator('.formpack-records__actions .app__button').first().click();
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

const clickNewDraft = async (page: Page) => {
  const btn = page.getByRole('button', { name: /new\s*draft|neuer\s*entwurf/i });
  if (await btn.count()) {
    await btn.first().click();
    return;
  }
  await page.locator('.formpack-records__actions .app__button').first().click();
};

const loadNonActiveDraftViaUI = async (page: Page) => {
  const nonActiveItem = page.locator(
    '.formpack-records__item:not(.formpack-records__item--active)'
  ).first();

  await expect(nonActiveItem).toBeVisible();

  // There is a single load button per record item in the current UI.
  await nonActiveItem.getByRole('button', { name: /load\s*draft|entwurf\s*laden/i }).click();
};

test('new draft clones data and old draft remains preserved (first clone + subsequent edits)', async ({
  page
}) => {
  // Clean slate
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB.dbName);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  // Required behavior: user must click “New draft” to start
  await ensureDraftExists(page);

  const nameInput = page.locator('#root_person_name');
  await expect(nameInput).toBeVisible();

  // 1) Enter data in Draft A and wait for autosave
  await nameInput.fill('Alice Clone');
  await waitForNamePersisted(page, 'Alice Clone');

  const recordCountA = await countObjectStoreRecords(page);
  expect(recordCountA).toBe(1);

  const draftAId = await getActiveRecordId(page);
  expect(draftAId).toBeTruthy();

  // 2) Click “New draft” -> Draft B should be created as a clone
  await clickNewDraft(page);

  await expect
    .poll(async () => getActiveRecordId(page), { timeout: 10_000, intervals: [250, 500, 1000] })
    .not.toBe(draftAId);

  const draftBId = await getActiveRecordId(page);
  expect(draftBId).toBeTruthy();

  await expect
    .poll(async () => countObjectStoreRecords(page), { timeout: 10_000, intervals: [250, 500, 1000] })
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
    .poll(async () => getActiveRecordId(page), { timeout: 10_000, intervals: [250, 500, 1000] })
    .toBe(draftAId);

  // 6) Switch back to Draft B via UI and verify Draft B data
  await loadNonActiveDraftViaUI(page);
  await expect(nameInput).toHaveValue('Bob In Draft B');

  await expect
    .poll(async () => getActiveRecordId(page), { timeout: 10_000, intervals: [250, 500, 1000] })
    .toBe(draftBId);

  // 7) Ensure no extra records were created by switching
  const recordCountEnd = await countObjectStoreRecords(page);
  expect(recordCountEnd).toBe(recordCountA + 1);
});
