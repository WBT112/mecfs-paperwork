import { expect, type Page } from '@playwright/test';

export const POLL_TIMEOUT = 30_000;
export const POLL_INTERVALS = [200, 400, 800, 1200];

const DB_NAME = 'mecfs-paperwork';
const STORE_NAME_RECORDS = 'records';
const STORE_NAME_SNAPSHOTS = 'snapshots';

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
    firstName?: string;
    lastName?: string;
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
      const STORAGE_KEY_COOKIE_NAME = 'mecfs-paperwork.storage-key';
      const STORAGE_ENCRYPTION_KIND = 'mecfs-paperwork-idb-encrypted';
      const AES_GCM_TAG_LENGTH = 128;

      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && !Array.isArray(value);

      const fromBase64Url = (value: string): Uint8Array => {
        const base64 = value
          .replaceAll('-', '+')
          .replaceAll('_', '/')
          .padEnd(Math.ceil(value.length / 4) * 4, '=');
        const binary = atob(base64);
        return Uint8Array.from(binary, (char) => char.charCodeAt(0));
      };

      const getCookieValue = (name: string): string | null => {
        const cookies = document.cookie ? document.cookie.split('; ') : [];
        const prefix = `${name}=`;
        for (const cookie of cookies) {
          if (cookie.startsWith(prefix)) {
            return cookie.slice(prefix.length);
          }
        }
        return null;
      };

      const decodeRecordData = async (
        data: unknown,
      ): Promise<Record<string, unknown> | undefined | null> => {
        if (data === undefined) {
          return undefined;
        }

        if (!isRecord(data)) {
          return null;
        }

        if (data.kind !== STORAGE_ENCRYPTION_KIND) {
          return data;
        }

        const keyCookie = getCookieValue(STORAGE_KEY_COOKIE_NAME);
        if (!keyCookie) {
          return null;
        }

        try {
          const key = await crypto.subtle.importKey(
            'raw',
            fromBase64Url(keyCookie),
            { name: 'AES-GCM' },
            false,
            ['decrypt'],
          );
          const iv =
            typeof data.iv === 'string' ? fromBase64Url(data.iv) : null;
          const ciphertext =
            typeof data.ciphertext === 'string'
              ? fromBase64Url(data.ciphertext)
              : null;
          if (!iv || !ciphertext) {
            return null;
          }

          const plainBuffer = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv,
              tagLength: AES_GCM_TAG_LENGTH,
            },
            key,
            ciphertext,
          );
          const parsed = JSON.parse(new TextDecoder().decode(plainBuffer));
          return isRecord(parsed) ? parsed : null;
        } catch {
          return null;
        }
      };

      const hasAnyActiveRecordId = (): boolean => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (!key.startsWith('mecfs-paperwork.activeRecordId.')) continue;
            const value = localStorage.getItem(key);
            if (value) return true;
          }
        } catch {
          // If localStorage is unavailable for any reason, fall back to opening.
        }
        return false;
      };

      const openExistingDb = async (): Promise<IDBDatabase | null> => {
        // Avoid implicitly creating or mutating schema from tests.
        // If the DB does not exist yet (or a schema upgrade would be needed),
        // return null and let the poller retry after the app has initialized.
        // Cross-browser signal:
        // Once the app has created at least one draft for any form pack, it
        // writes an activeRecordId.* key into localStorage. If that signal is
        // present, it is safe for tests to open the DB without risking an
        // onupgradeneeded race against the app's first-time initialization.
        const safeToOpen = hasAnyActiveRecordId();

        if (!safeToOpen) {
          // If there is no localStorage signal, be conservative.
          // Some engines (esp. WebKit, and occasionally Firefox) can report an
          // incomplete list from indexedDB.databases(), or not implement it at
          // all. We therefore only use databases() as an additional guard.
          if (indexedDB.databases) {
            const databases = await indexedDB.databases();
            if (!databases.some((db) => db.name === dbName)) {
              return null;
            }
          } else {
            return null;
          }
        }

        return await new Promise((resolve) => {
          let aborted = false;
          const req = indexedDB.open(dbName);

          req.onupgradeneeded = () => {
            aborted = true;
            try {
              req.transaction?.abort();
            } catch {
              // ignore
            }
          };

          req.onerror = () => resolve(null);
          req.onblocked = () => resolve(null);
          req.onsuccess = () => {
            const db = req.result;
            if (aborted) {
              try {
                db.close();
              } catch {
                // ignore
              }
              resolve(null);
              return;
            }
            resolve(db);
          };
        });
      };

      const db = await openExistingDb();
      if (!db) return null;

      try {
        const entry = await new Promise<Record<string, unknown> | null>(
          (resolve) => {
            try {
              const tx = db.transaction(storeName, 'readonly');
              const store = tx.objectStore(storeName);
              const getReq = store.get(recordId);
              getReq.onsuccess = () => {
                const result = getReq.result;
                resolve(
                  isRecord(result) ? (result as Record<string, unknown>) : null,
                );
              };
              getReq.onerror = () => {
                resolve(null);
              };
            } catch {
              resolve(null);
            }
          },
        );

        if (!entry) {
          return null;
        }

        const decodedData = await decodeRecordData(entry.data);
        if (entry.data !== undefined && decodedData === null) {
          return null;
        }

        return {
          ...entry,
          data: decodedData ?? undefined,
        };
      } catch {
        return null;
      } finally {
        try {
          db.close();
        } catch {
          // ignore
        }
      }
    },
    { dbName: DB_NAME, storeName: STORE_NAME_RECORDS, recordId },
  ) as Promise<StoredRecord | null>;
};

const readSnapshotCountByRecordId = async (
  page: Page,
  recordId: string,
): Promise<number | null> => {
  return page.evaluate(
    async ({ dbName, storeName, recordId }) => {
      const hasAnyActiveRecordId = (): boolean => {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (!key.startsWith('mecfs-paperwork.activeRecordId.')) continue;
            const value = localStorage.getItem(key);
            if (value) return true;
          }
        } catch {
          // ignore
        }
        return false;
      };

      const openExistingDb = async (): Promise<IDBDatabase | null> => {
        const safeToOpen = hasAnyActiveRecordId();

        if (!safeToOpen) {
          if (indexedDB.databases) {
            const databases = await indexedDB.databases();
            if (!databases.some((db) => db.name === dbName)) {
              return null;
            }
          } else {
            return null;
          }
        }

        return await new Promise((resolve) => {
          let aborted = false;
          const req = indexedDB.open(dbName);

          req.onupgradeneeded = () => {
            aborted = true;
            try {
              req.transaction?.abort();
            } catch {
              // ignore
            }
          };

          req.onerror = () => resolve(null);
          req.onblocked = () => resolve(null);
          req.onsuccess = () => {
            const db = req.result;
            if (aborted) {
              try {
                db.close();
              } catch {
                // ignore
              }
              resolve(null);
              return;
            }
            resolve(db);
          };
        });
      };

      const db = await openExistingDb();
      if (!db) return null;
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);

        return await new Promise((resolve) => {
          let result: number | null = null;

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
            const index = store.index('by_recordId');
            const getReq = index.getAllKeys(recordId);
            getReq.onsuccess = () => {
              result = Array.isArray(getReq.result) ? getReq.result.length : 0;
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
    { dbName: DB_NAME, storeName: STORE_NAME_SNAPSHOTS, recordId },
  ) as Promise<number | null>;
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

export const waitForSnapshotCount = async (
  page: Page,
  recordId: string,
  expected: number,
  options?: PollOptions,
): Promise<void> => {
  const { timeout, intervals } = normalizePollOptions(options);

  await expect
    .poll(
      async () => {
        return await readSnapshotCountByRecordId(page, recordId);
      },
      { timeout, intervals },
    )
    .toBe(expected);
};
