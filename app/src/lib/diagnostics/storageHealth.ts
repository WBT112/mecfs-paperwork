import { isEncryptedStoragePayload } from '../../storage/atRestEncryption';
import { getStorageEncryptionCookieDiagnostics } from './storageEncryptionCookieDiagnostics';
import type {
  StorageEncryptionStatus,
  StorageHealthInfo,
  StorageHealthStatus,
} from './types';

const QUOTA_WARNING_THRESHOLD = 0.85;
const DB_NAME = 'mecfs-paperwork';
const RECORDS_STORE_NAME = 'records';

const checkIndexedDbAvailable = (): boolean => typeof indexedDB !== 'undefined';

const openExistingDb = async (dbName: string): Promise<IDBDatabase | null> => {
  if (
    typeof indexedDB.open !== 'function' ||
    typeof indexedDB.databases !== 'function'
  ) {
    return null;
  }

  try {
    const databases = await indexedDB.databases();
    if (!databases.some((database) => database.name === dbName)) {
      return null;
    }
  } catch {
    return null;
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

const readFirstRecordData = async (
  db: IDBDatabase,
  storeName: string,
): Promise<unknown> => {
  if (!db.objectStoreNames.contains(storeName)) {
    return undefined;
  }

  return await new Promise<unknown>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(undefined);
          return;
        }

        const value = cursor.value as Record<string, unknown> | undefined;
        if (
          typeof value === 'object' &&
          !Array.isArray(value) &&
          'data' in value
        ) {
          resolve(value.data);
          return;
        }

        resolve(undefined);
      };

      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
};

const getIndexedDbEncryptionStatus =
  async (): Promise<StorageEncryptionStatus> => {
    if (!checkIndexedDbAvailable()) {
      return 'unknown';
    }

    const db = await openExistingDb(DB_NAME);
    if (!db) {
      return 'unknown';
    }

    try {
      const firstData = await readFirstRecordData(db, RECORDS_STORE_NAME);
      if (firstData === undefined) {
        return 'unknown';
      }

      return isEncryptedStoragePayload(firstData)
        ? 'encrypted'
        : 'not_encrypted';
    } finally {
      db.close();
    }
  };

const getStorageEstimate = async (): Promise<
  StorageHealthInfo['storageEstimate']
> => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard for browsers lacking Storage API
  if (!navigator.storage?.estimate) {
    return { supported: false };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      supported: true,
      usage: estimate.usage,
      quota: estimate.quota,
    };
  } catch {
    return { supported: false };
  }
};

const resolveStatus = (
  idbAvailable: boolean,
  estimate: StorageHealthInfo['storageEstimate'],
): { status: StorageHealthStatus; message: string } => {
  if (!idbAvailable) {
    return {
      status: 'error',
      message: 'storageHealthGuidanceError',
    };
  }

  if (
    estimate.supported &&
    estimate.usage !== undefined &&
    estimate.quota !== undefined &&
    estimate.quota > 0
  ) {
    const ratio = estimate.usage / estimate.quota;
    if (ratio >= 1) {
      return {
        status: 'error',
        message: 'storageHealthGuidanceQuotaExceeded',
      };
    }
    if (ratio >= QUOTA_WARNING_THRESHOLD) {
      return {
        status: 'warning',
        message: 'storageHealthGuidanceWarning',
      };
    }
  }

  return {
    status: 'ok',
    message: '',
  };
};

/**
 * Collects local storage diagnostics used by the Help/Diagnostics UI.
 */
export const checkStorageHealth = async (): Promise<StorageHealthInfo> => {
  const idbAvailable = checkIndexedDbAvailable();
  const [storageEstimate, encryptionStatus] = await Promise.all([
    getStorageEstimate(),
    getIndexedDbEncryptionStatus(),
  ]);
  const cookieDiagnostics = getStorageEncryptionCookieDiagnostics();
  const { status, message } = resolveStatus(idbAvailable, storageEstimate);

  return {
    indexedDbAvailable: idbAvailable,
    storageEstimate,
    encryptionAtRest: {
      status: encryptionStatus,
      keyCookiePresent: cookieDiagnostics.keyCookiePresent,
      keyCookieContext: cookieDiagnostics.keyCookieContext,
      secureFlagVerifiable: cookieDiagnostics.secureFlagVerifiable,
    },
    status,
    message,
  };
};
