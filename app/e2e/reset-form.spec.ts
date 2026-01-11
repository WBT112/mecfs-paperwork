import { expect, test, type Page } from '@playwright/test';

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

const waitForRecordData = async (
  page: Page,
  id: string,
  check: (data: Record<string, unknown> | null) => boolean,
) => {
  await expect
    .poll(
      async () => {
        const record = await readRecordById(page, id);
        if (!record || !record.data) {
          return false;
        }
        return check(record.data as Record<string, unknown>);
      },
      { timeout: 10_000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
};

const isMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.some((entry) => isMeaningfulValue(entry));
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      isMeaningfulValue(entry),
    );
  }
  return false;
};

test.describe('reset form', () => {
  test('clears the draft and persists after reload', async ({ page }) => {
    await page.goto(`/formpacks/${FORM_PACK_ID}`);
    await deleteDatabase(page, DB.dbName);
    await page.reload();

    await clickNewDraftIfNeeded(page);

    const nameInput = page.locator('#root_person_name');
    await nameInput.fill('Test Person');
    await expect(nameInput).toHaveValue('Test Person');

    const activeId = await waitForActiveRecordId(page);
    await waitForRecordData(page, activeId, (data) => {
      const person = data.person as Record<string, unknown> | undefined;
      return person?.name === 'Test Person';
    });

    await page
      .getByRole('button', {
        name: /form.*zurücksetzen|reset\s*form/i,
      })
      .click();

    await expect(nameInput).toHaveValue('');

    await waitForRecordData(page, activeId, (data) => {
      return !isMeaningfulValue(data);
    });

    await page.reload();

    await expect(nameInput).toHaveValue('');

    await waitForRecordData(page, activeId, (data) => {
      return !isMeaningfulValue(data);
    });
  });
});
