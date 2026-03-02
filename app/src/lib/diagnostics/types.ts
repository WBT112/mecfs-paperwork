export type StorageHealthStatus = 'ok' | 'warning' | 'error';

export type StorageEncryptionStatus = 'encrypted' | 'not_encrypted' | 'unknown';
export type StorageKeyCookieContext = 'https' | 'non-https' | 'unknown';

export type StorageHealthInfo = {
  indexedDbAvailable: boolean;
  storageEstimate: {
    supported: boolean;
    usage?: number;
    quota?: number;
  };
  encryptionAtRest?: {
    status: StorageEncryptionStatus;
    keyCookiePresent: boolean;
    keyCookieContext: StorageKeyCookieContext;
    secureFlagVerifiable: false;
  };
  status: StorageHealthStatus;
  message: string;
};

export type ServiceWorkerInfo = {
  supported: boolean;
  registered: boolean;
  scope?: string;
  state?: string;
};

export type CacheInfo = {
  name: string;
  entryCount: number;
};

export type IdbStoreInfo = {
  name: string;
  recordCount: number;
};

export type FormpackMetaInfo = {
  id: string;
  versionOrHash: string;
};

export type PerformanceMeasureInfo = {
  name: string;
  durationMs: number;
  startTimeMs: number;
};

export type PerformanceInfo = {
  supported: boolean;
  measures: PerformanceMeasureInfo[];
};

export type DiagnosticsBundle = {
  generatedAt: string;
  app: {
    version: string;
    buildDate: string;
    environment: string;
  };
  browser: {
    userAgent: string;
    platform: string;
    language: string;
    languages: string[];
    timezone: string;
    cookiesEnabled: boolean;
    onLine: boolean;
  };
  serviceWorker: ServiceWorkerInfo;
  caches: CacheInfo[];
  indexedDb: {
    available: boolean;
    databases: string[];
    stores: IdbStoreInfo[];
  };
  storageHealth: StorageHealthInfo;
  formpacks: FormpackMetaInfo[];
  performance: PerformanceInfo;
  errors: string[];
};
