import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { fillTextInputStable } from './helpers/form';
import { switchLocale, type SupportedTestLocale } from './helpers/locale';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  waitForRecordById,
  waitForRecordField,
} from './helpers/records';

type DbOptions = { dbName: string; storeName: string };
const FORM_PACK_ID = 'notfallpass';
const ACTIVE_RECORD_KEY = `mecfs-paperwork.activeRecordId.${FORM_PACK_ID}`;

const DB: DbOptions = { dbName: 'mecfs-paperwork', storeName: 'records' };

const countObjectStoreRecords = async (page: Page, options: DbOptions = DB) => {
  return page.evaluate(async ({ dbName, storeName }) => {
    const openExistingDb = async () => {
      // Avoid indexedDB.databases() here; it can be flaky and hide existing DBs.
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
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
    )
    .not.toBe('');
  return activeId;
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
  await expect(items).toHaveCount(1, { timeout: POLL_TIMEOUT });
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

test.describe.configure({ mode: 'parallel' });

const locales: SupportedTestLocale[] = ['de', 'en'];
const snapshotsHeadingByLocale: Record<SupportedTestLocale, RegExp> = {
  de: /Verlauf/i,
  en: /History/i,
};

for (const locale of locales) {
  test.describe(locale, () => {
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
      await switchLocale(page, locale);
      await expect(
        page.getByRole('heading', {
          name: snapshotsHeadingByLocale[locale],
        }),
      ).toBeVisible();

      await clickNewDraftIfNeeded(page);
      const recordId = await waitForActiveRecordId(page);
      await waitForRecordById(page, recordId, { timeout: POLL_TIMEOUT });

      const nameInput = page.locator('#root_person_name');
      await expect(nameInput).toBeVisible({ timeout: POLL_TIMEOUT });
      // 1) Set initial value and wait for persistence
      await fillTextInputStable(page, '#root_person_name', 'Alice Snapshot');
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.person?.name ?? '',
        'Alice Snapshot',
        { timeout: POLL_TIMEOUT },
      );

      // Snapshot operations must stay within the existing draft.
      const recordsCountBaseline = await countObjectStoreRecords(page);
      expect(recordsCountBaseline).toBeGreaterThan(0);

      // 2) Create snapshot and verify it appears
      await createSnapshot(page);

      // 3) Change value and persist
      await fillTextInputStable(page, '#root_person_name', 'Bob After Change');
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.person?.name ?? '',
        'Bob After Change',
        { timeout: POLL_TIMEOUT },
      );

      // 4) Restore snapshot and verify value + persistence
      await restoreFirstSnapshot(page);

      await expect(nameInput).toHaveValue('Alice Snapshot', {
        timeout: POLL_TIMEOUT,
      });
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.person?.name ?? '',
        'Alice Snapshot',
        { timeout: POLL_TIMEOUT },
      );

      // Restore should not create a new draft record
      // Restoring a snapshot must not create a new draft.
      const recordsCountAfterRestore = await countObjectStoreRecords(page);
      expect(recordsCountAfterRestore).toBe(recordsCountBaseline);

      // 5) Reload: restored value must remain, and still no extra records
      await page.reload();

      await expect(nameInput).toBeVisible({ timeout: POLL_TIMEOUT });
      await expect(nameInput).toHaveValue('Alice Snapshot', {
        timeout: POLL_TIMEOUT,
      });
      await waitForRecordField(
        page,
        recordId,
        (record) => record?.data?.person?.name ?? '',
        'Alice Snapshot',
        { timeout: POLL_TIMEOUT },
      );

      // Reload must keep the same record count after restoration.
      const recordsCountAfterReload = await countObjectStoreRecords(page);
      expect(recordsCountAfterReload).toBe(recordsCountBaseline);
    });
  });
}
