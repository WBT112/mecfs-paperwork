import { expect, type Page } from '@playwright/test';

export const POLL_TIMEOUT = 30_000;
export const POLL_INTERVALS = [200, 400, 800, 1200];

const DB_NAME = 'mecfs-paperwork';
const STORE_NAME_RECORDS = 'records';

type PollOptions =
  | number
  | {
      timeout?: number;
      intervals?: number[];
    };

const normalizePollOptions = (options?: PollOptions) => {
  if (typeof options === 'number') {
    return { timeout: options, intervals: POLL_INTERVALS };
  }

  return {
    timeout: options?.timeout ?? POLL_TIMEOUT,
    intervals: options?.intervals ?? POLL_INTERVALS,
  };
};

export type StoredRecordData = {
  person?: {
    name?: string;
    birthDate?: string;
    [key: string]: unknown;
  };
  doctor?: {
    phone?: string;
    [key: string]: unknown;
  };
  diagnoses?: {
    meCfs?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type StoredRecord = {
  id: string;
  locale?: string;
  title?: string;
  data?: StoredRecordData;
  createdAt?: string;
  updatedAt?: string;
  snapshots?: unknown[];
  [key: string]: unknown;
};

export const getActiveRecordId = async (
  page: Page,
  formpackId: string,
): Promise<string | null> => {
  return page.evaluate((id) => {
    const key = `mecfs-paperwork.activeRecordId.${id}`;
    return localStorage.getItem(key);
  }, formpackId);
};

const readRecordById = async (
  page: Page,
  recordId: string,
): Promise<StoredRecord | null> => {
  return page.evaluate(
    async ({ dbName, storeName, recordId }) => {
      const openExistingDb = async (): Promise<IDBDatabase | null> => {
        return await new Promise((resolve) => {
          const req = indexedDB.open(dbName);
          let settled = false;

          const settle = (db: IDBDatabase | null) => {
            if (settled) return;
            settled = true;
            resolve(db);
          };

          req.onupgradeneeded = () => {
            try {
              const db = req.result;
              const tx = req.transaction;

              // records store (matches app schema; keep additive)
              if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, {
                  keyPath: 'id',
                });
                if (!store.indexNames.contains('active'))
                  store.createIndex('active', 'active');
                if (!store.indexNames.contains('updatedAt'))
                  store.createIndex('updatedAt', 'updatedAt');
              } else if (tx) {
                const store = tx.objectStore(storeName);
                if (!store.indexNames.contains('active'))
                  store.createIndex('active', 'active');
                if (!store.indexNames.contains('updatedAt'))
                  store.createIndex('updatedAt', 'updatedAt');
              }

              // snapshots store (app schema)
              const snapshotsName = 'snapshots';
              if (!db.objectStoreNames.contains(snapshotsName)) {
                const store = db.createObjectStore(snapshotsName, {
                  keyPath: 'id',
                });
                if (!store.indexNames.contains('recordId'))
                  store.createIndex('recordId', 'recordId');
                if (!store.indexNames.contains('createdAt'))
                  store.createIndex('createdAt', 'createdAt');
              } else if (tx) {
                const store = tx.objectStore(snapshotsName);
                if (!store.indexNames.contains('recordId'))
                  store.createIndex('recordId', 'recordId');
                if (!store.indexNames.contains('createdAt'))
                  store.createIndex('createdAt', 'createdAt');
              }
            } catch {
              // ignore
            }
          };

          req.onerror = () => settle(null);
          req.onblocked = () => settle(null);
          req.onsuccess = () => settle(req.result);
        });
      };

      const db = await openExistingDb();
      if (!db) return null;
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);

        return await new Promise((resolve) => {
          let result: any = null;

          const cleanup = () => {
            try {
              db.close();
            } catch {
              // ignore
            }
          };

          tx.oncomplete = () => {
            cleanup();
            resolve(result ?? null);
          };

          tx.onabort = () => {
            cleanup();
            resolve(null);
          };

          tx.onerror = () => {
            cleanup();
            resolve(null);
          };

          try {
            const getReq = store.get(recordId);
            getReq.onsuccess = () => {
              result = getReq.result ?? null;
            };
            getReq.onerror = () => {
              result = null;
            };
          } catch {
            cleanup();
            resolve(null);
          }
        });
      } catch {
        try {
          db.close();
        } catch {
          // ignore
        }
        return null;
      }
    },
    { dbName: DB_NAME, storeName: STORE_NAME_RECORDS, recordId },
  ) as Promise<StoredRecord | null>;
};

export const waitForRecordById = async (
  page: Page,
  recordId: string,
  options?: PollOptions,
): Promise<StoredRecord> => {
  const { timeout, intervals } = normalizePollOptions(options);
  let latest: StoredRecord | null = null;

  await expect
    .poll(
      async () => {
        latest = await readRecordById(page, recordId);
        return latest;
      },
      { timeout, intervals },
    )
    .not.toBeNull();

  // expect.poll above ensures `latest` is not null. The additional guard keeps
  // TypeScript happy and produces a clearer error if something goes wrong.
  if (!latest) {
    throw new Error(`Record ${recordId} not found within ${timeout}ms`);
  }

  return latest;
};

export const waitForRecordField = async <T>(
  page: Page,
  recordId: string,
  select: (record: StoredRecord | null) => T,
  expected: T,
  options?: PollOptions,
): Promise<void> => {
  const { timeout, intervals } = normalizePollOptions(options);

  await expect
    .poll(
      async () => {
        const record = await readRecordById(page, recordId);
        return select(record);
      },
      { timeout, intervals },
    )
    .toEqual(expected);
};
