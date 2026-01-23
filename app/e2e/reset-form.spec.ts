import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { fillTextInputStable } from './helpers/form';
import { openCollapsibleSection } from './helpers/sections';

type DbOptions = {
  dbName: string;
  storeName: string;
};

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
const POLL_TIMEOUT = 20_000;
const POLL_INTERVALS = [250, 500, 1000];
const AUTOSAVE_TIMEOUT_MS = 20_000;

const DB: DbOptions = {
  dbName: 'mecfs-paperwork',
  storeName: 'records',
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
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
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

const waitForNamePersisted = async (page: Page, expected: string) => {
  await expect
    .poll(
      async () => {
        const activeId = await getActiveRecordId(page);
        if (!activeId) return '';
        const record = await readRecordById(page, activeId);
        return record?.data?.person?.name ?? '';
      },
      { timeout: AUTOSAVE_TIMEOUT_MS, intervals: POLL_INTERVALS },
    )
    .toBe(expected);
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
    await page
      .locator('.formpack-records__actions .app__button')
      .first()
      .click();
  }

  await waitForActiveRecordId(page);
  await expect(nameInput).toBeVisible();
};

test.describe('reset form', () => {
  test('clears the draft and persists after reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await deleteDatabase(page, DB.dbName);
    await page.goto(`/formpacks/${FORM_PACK_ID}`);
    await openDraftsSection(page);

    await clickNewDraftIfNeeded(page);

    const nameInput = page.locator('#root_person_name');
    await waitForActiveRecordId(page);
    await fillTextInputStable(page, nameInput, 'Test Person', POLL_TIMEOUT);
    await waitForNamePersisted(page, 'Test Person');
    await page.reload();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('Test Person');

    await page
      .getByRole('button', {
        name: /form.*zurücksetzen|reset\s*form/i,
      })
      .click();

    await expect(nameInput).toHaveValue('');
    await waitForNamePersisted(page, '');
    await page.reload();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue('');
  });
});
