import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from './helpers';
import { openFormpackWithRetry } from './helpers/formpack';
import {
  POLL_INTERVALS,
  POLL_TIMEOUT,
  getActiveRecordId,
} from './helpers/records';

const DB_NAME = 'mecfs-paperwork';
const FORMPACK_ID = 'notfallpass';
const STORAGE_KEY_COOKIE_NAME = 'mecfs-paperwork.storage-key';
const STORAGE_ENCRYPTION_KIND = 'mecfs-paperwork-idb-encrypted';

const waitForActiveRecordId = async (
  page: Page,
  formpackId: string,
): Promise<string> => {
  let activeId: string | null = null;
  await expect
    .poll(
      async () => {
        activeId = await getActiveRecordId(page, formpackId);
        return activeId;
      },
      { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
    )
    .not.toBeNull();

  if (!activeId) {
    throw new Error('Expected active record id to be available.');
  }

  return activeId;
};

const readRawRecordData = async (page: Page, recordId: string) => {
  return page.evaluate(
    async ({ dbName, id }) => {
      const db = await new Promise<IDBDatabase | null>((resolve) => {
        let aborted = false;
        const request = indexedDB.open(dbName);
        request.onupgradeneeded = () => {
          aborted = true;
          request.transaction?.abort();
        };
        request.onsuccess = () => {
          const database = request.result;
          if (aborted) {
            database.close();
            resolve(null);
            return;
          }
          resolve(database);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      });

      if (!db || !db.objectStoreNames.contains('records')) {
        return null;
      }

      try {
        const entry = await new Promise<Record<string, unknown> | null>(
          (resolve) => {
            const tx = db.transaction('records', 'readonly');
            const store = tx.objectStore('records');
            const req = store.get(id);
            req.onsuccess = () => {
              const value = req.result;
              resolve(
                typeof value === 'object' &&
                  value !== null &&
                  !Array.isArray(value)
                  ? (value as Record<string, unknown>)
                  : null,
              );
            };
            req.onerror = () => resolve(null);
          },
        );

        if (!entry) {
          return null;
        }

        return entry.data ?? null;
      } finally {
        db.close();
      }
    },
    { dbName: DB_NAME, id: recordId },
  );
};

test.describe('storage encryption', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await deleteDatabase(page, DB_NAME);
  });

  test('persists encrypted record payloads in IndexedDB', async ({ page }) => {
    await openFormpackWithRetry(
      page,
      FORMPACK_ID,
      page.locator('#formpack-records-toggle'),
    );

    const firstNameField = page.locator('#root_person_firstName');
    await expect(firstNameField).toBeVisible({ timeout: POLL_TIMEOUT });
    await firstNameField.fill('Encrypted');

    const recordId = await waitForActiveRecordId(page, FORMPACK_ID);

    await expect
      .poll(
        async () => {
          const rawData = await readRawRecordData(page, recordId);
          if (!rawData || typeof rawData !== 'object') {
            return null;
          }
          return {
            kind: (rawData as Record<string, unknown>).kind,
            hasCiphertext:
              typeof (rawData as Record<string, unknown>).ciphertext ===
              'string',
            hasPlainPerson: Object.prototype.hasOwnProperty.call(
              rawData,
              'person',
            ),
          };
        },
        { timeout: POLL_TIMEOUT, intervals: POLL_INTERVALS },
      )
      .toEqual({
        kind: STORAGE_ENCRYPTION_KIND,
        hasCiphertext: true,
        hasPlainPerson: false,
      });
  });

  test('shows recovery action when encrypted data key is missing', async ({
    page,
  }) => {
    await openFormpackWithRetry(
      page,
      FORMPACK_ID,
      page.locator('#formpack-records-toggle'),
    );

    await waitForActiveRecordId(page, FORMPACK_ID);

    await page.evaluate((cookieName) => {
      document.cookie = `${cookieName}=; Max-Age=0; Path=/; SameSite=Strict`;
    }, STORAGE_KEY_COOKIE_NAME);

    await page.reload();

    await page.locator('#formpack-records-toggle').click();

    const resetButton = page.getByRole('button', {
      name: /Alle lokalen Daten löschen|Reset all local data/i,
    });
    await expect(resetButton).toBeVisible({ timeout: POLL_TIMEOUT });
  });
});
