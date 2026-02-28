import { APP_VERSION, BUILD_DATE_ISO } from '../version';
import { toError } from '../errors';
import type {
  CacheInfo,
  DiagnosticsBundle,
  FormpackMetaInfo,
  IdbStoreInfo,
  ServiceWorkerInfo,
} from './types';
import { getErrors } from './errorRingBuffer';
import { checkStorageHealth } from './storageHealth';

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string;
  };
};

const collectPlatform = (): string => {
  const platform = (navigator as NavigatorWithUserAgentData).userAgentData
    ?.platform;
  if (typeof platform === 'string' && platform.trim().length > 0) {
    return platform;
  }

  return 'unknown';
};

const collectAppInfo = (): DiagnosticsBundle['app'] => ({
  version: APP_VERSION,
  buildDate: BUILD_DATE_ISO,
  environment: import.meta.env.MODE,
});

const collectBrowserInfo = (): DiagnosticsBundle['browser'] => ({
  userAgent: navigator.userAgent,
  platform: collectPlatform(),
  language: navigator.language,
  languages: [...navigator.languages],
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  cookiesEnabled: navigator.cookieEnabled,
  onLine: navigator.onLine,
});

const USER_TIMING_PREFIX = 'mecfs.';
const USER_TIMING_LIMIT = 200;

const collectPerformanceInfo = (): DiagnosticsBundle['performance'] => {
  const perf = globalThis.performance as Performance | undefined;
  if (perf === undefined || typeof perf.getEntriesByType !== 'function') {
    return { supported: false, measures: [] };
  }

  try {
    const entries = perf.getEntriesByType('measure');
    const measures = entries
      .filter(
        (entry) =>
          entry.name.startsWith(USER_TIMING_PREFIX) &&
          Number.isFinite(entry.duration) &&
          Number.isFinite(entry.startTime),
      )
      .slice(-USER_TIMING_LIMIT)
      .map((entry) => ({
        name: entry.name,
        durationMs: entry.duration,
        startTimeMs: entry.startTime,
      }));

    return { supported: true, measures };
  } catch {
    return { supported: true, measures: [] };
  }
};

const collectServiceWorkerInfo = async (): Promise<ServiceWorkerInfo> => {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, registered: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return { supported: true, registered: false };
    }

    const activeWorker =
      registration.active ?? registration.waiting ?? registration.installing;
    return {
      supported: true,
      registered: true,
      scope: registration.scope,
      state: activeWorker?.state,
    };
  } catch {
    return { supported: true, registered: false };
  }
};

const collectCacheInfo = async (): Promise<CacheInfo[]> => {
  if (!('caches' in globalThis)) {
    return [];
  }

  try {
    const cacheNames = await caches.keys();
    const result: CacheInfo[] = [];

    for (const name of cacheNames) {
      try {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        result.push({ name, entryCount: keys.length });
      } catch {
        result.push({ name, entryCount: -1 });
      }
    }

    return result;
  } catch {
    return [];
  }
};

const DB_NAME = 'mecfs-paperwork';
const STORE_NAMES = ['records', 'snapshots', 'formpackMeta'] as const;

const collectIdbInfo = async (): Promise<DiagnosticsBundle['indexedDb']> => {
  if (typeof indexedDB === 'undefined') {
    return { available: false, databases: [], stores: [] };
  }

  let databases: string[] = [];
  try {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      databases = dbs.map((db) => db.name).filter(Boolean) as string[];
    }
  } catch {
    // indexedDB.databases() not supported in all browsers
  }

  const stores: IdbStoreInfo[] = [];

  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = () =>
        reject(
          toError(request.error, `Failed to open IndexedDB "${DB_NAME}".`),
        );
      request.onsuccess = () => resolve(request.result);
    });

    for (const storeName of STORE_NAMES) {
      try {
        if (db.objectStoreNames.contains(storeName)) {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const count = await new Promise<number>((resolve, reject) => {
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () =>
              reject(
                toError(
                  req.error,
                  `Failed to count records in "${storeName}" store.`,
                ),
              );
          });
          stores.push({ name: storeName, recordCount: count });
        }
      } catch {
        stores.push({ name: storeName, recordCount: -1 });
      }
    }

    db.close();
  } catch {
    // DB open failed — already captured via available flag
  }

  return {
    available: true,
    databases,
    stores,
  };
};

const collectFormpackMeta = async (): Promise<FormpackMetaInfo[]> => {
  if (typeof indexedDB === 'undefined') {
    return [];
  }

  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onerror = () =>
        reject(
          toError(request.error, `Failed to open IndexedDB "${DB_NAME}".`),
        );
      request.onsuccess = () => resolve(request.result);
    });

    if (!db.objectStoreNames.contains('formpackMeta')) {
      db.close();
      return [];
    }

    const tx = db.transaction('formpackMeta', 'readonly');
    const store = tx.objectStore('formpackMeta');
    const entries = await new Promise<FormpackMetaInfo[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const raw = req.result as Array<{
          id?: string;
          versionOrHash?: string;
        }>;
        resolve(
          raw.map((entry) => ({
            id: entry.id ?? 'unknown',
            versionOrHash: entry.versionOrHash ?? 'unknown',
          })),
        );
      };
      req.onerror = () =>
        reject(
          toError(
            req.error,
            'Failed to read formpack metadata from IndexedDB.',
          ),
        );
    });

    db.close();
    return entries;
  } catch {
    return [];
  }
};

export const collectDiagnosticsBundle =
  async (): Promise<DiagnosticsBundle> => {
    const performanceInfo = collectPerformanceInfo();
    const [serviceWorker, cachesList, indexedDb, storageHealth, formpacks] =
      await Promise.all([
        collectServiceWorkerInfo(),
        collectCacheInfo(),
        collectIdbInfo(),
        checkStorageHealth(),
        collectFormpackMeta(),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      app: collectAppInfo(),
      browser: collectBrowserInfo(),
      serviceWorker,
      caches: cachesList,
      indexedDb,
      storageHealth,
      formpacks,
      performance: performanceInfo,
      errors: getErrors(),
    };
  };
