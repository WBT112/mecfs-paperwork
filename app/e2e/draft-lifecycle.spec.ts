import { expect, test, type Locator, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { fillTextInputStable } from './helpers/form';

const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;
const DB_NAME = 'mecfs-paperwork';
const STORE_NAME = 'records';
const POLL_TIMEOUT = 20_000;

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
      { timeout: POLL_TIMEOUT, intervals: [250, 500, 1000] },
    )
    .not.toBe('');
  return activeId;
};

const waitForActiveRecordIdChange = async (page: Page, previousId: string) => {
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: [250, 500, 1000],
    })
    .not.toBe(previousId);
  return (await getActiveRecordId(page)) ?? '';
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

const readRecordById = async (page: Page, id: string) => {
  return page.evaluate(
    async ({ dbName, storeName, id }) => {
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        if (!databases.some((db) => db.name === dbName)) {
          return null;
        }
      }

      const db = await new Promise<IDBDatabase | null>((resolve) => {
        let aborted = false;
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          aborted = true;
          request.transaction?.abort();
        };
        request.onsuccess = () => {
          const result = request.result;
          if (aborted) {
            result.close();
            resolve(null);
            return;
          }
          resolve(result);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      });

      if (!db || !db.objectStoreNames.contains(storeName)) {
        db?.close();
        return null;
      }

      try {
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
    { dbName: DB_NAME, storeName: STORE_NAME, id },
  );
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
      { timeout: POLL_TIMEOUT, intervals: [250, 500, 1000] },
    )
    .toBe(expectedName);
};

const clickActionButton = async (button: Locator) => {
  await expect(button).toBeVisible({ timeout: POLL_TIMEOUT });
  await expect(button).toBeEnabled({ timeout: POLL_TIMEOUT });
  await button.click();
};

const clickNewDraft = async (page: Page) => {
  await waitForRecordListReady(page);
  const newDraftButton = page.getByRole('button', {
    name: /new\s*draft|neuer\s*entwurf/i,
  });
  if (await newDraftButton.count()) {
    await clickActionButton(newDraftButton.first());
  } else {
    await clickActionButton(
      page.locator('.formpack-records__actions .app__button').first(),
    );
  }
  await waitForActiveRecordId(page);
};

test('draft lifecycle supports switching between multiple drafts', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await deleteDatabase(page, DB_NAME);

  await page.goto(`/formpacks/${FORM_PACK_ID}`);

  await clickNewDraft(page);
  await fillTextInputStable(
    page,
    page.locator('#root_person_name'),
    'Draft One',
    POLL_TIMEOUT,
  );
  const firstActiveId = await waitForActiveRecordId(page);
  await waitForNamePersisted(page, firstActiveId, 'Draft One');

  await clickNewDraft(page);
  const secondActiveId = await waitForActiveRecordIdChange(page, firstActiveId);
  await fillTextInputStable(
    page,
    page.locator('#root_person_name'),
    'Draft Two',
    POLL_TIMEOUT,
  );
  await waitForNamePersisted(page, secondActiveId, 'Draft Two');
  expect(secondActiveId).not.toBe(firstActiveId);

  const records = page.locator('.formpack-records__item');
  await expect
    .poll(async () => records.count(), {
      timeout: POLL_TIMEOUT,
      intervals: [250, 500, 1000],
    })
    .toBeGreaterThanOrEqual(2);

  const loadNonActiveDraft = async () => {
    const nonActiveItem = page
      .locator('.formpack-records__item:not(.formpack-records__item--active)')
      .first();
    await expect(nonActiveItem).toBeVisible({ timeout: POLL_TIMEOUT });
    const loadButton = nonActiveItem.getByRole('button', {
      name: /load\s*draft|entwurf\s*laden/i,
    });
    await clickActionButton(loadButton);
  };

  await loadNonActiveDraft();
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: [250, 500, 1000],
    })
    .toBe(firstActiveId);
  await expect(page.locator('#root_person_name')).toHaveValue('Draft One');

  const activeBadge = page.locator(
    '.formpack-records__item--active .formpack-records__badge',
  );
  await expect(activeBadge).toHaveText(/active|aktiv/i);

  await loadNonActiveDraft();
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: [250, 500, 1000],
    })
    .toBe(secondActiveId);
  await expect(page.locator('#root_person_name')).toHaveValue('Draft Two');

  await expect(activeBadge).toHaveText(/active|aktiv/i);

  await page.reload();
  await expect
    .poll(async () => getActiveRecordId(page), {
      timeout: POLL_TIMEOUT,
      intervals: [250, 500, 1000],
    })
    .toBe(secondActiveId);
  await expect(page.locator('#root_person_name')).toHaveValue('Draft Two');
});
