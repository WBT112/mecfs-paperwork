import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { collectDiagnosticsBundle } from '../../../src/lib/diagnostics/collectors';

// Mock the version module
vi.mock('../../../src/lib/diagnostics/errorRingBuffer', () => ({
  getErrors: vi.fn(() => ['[2024-01-01T00:00:00Z] (test) Test error']),
}));

vi.mock('../../../src/lib/diagnostics/storageHealth', () => ({
  checkStorageHealth: vi.fn().mockResolvedValue({
    indexedDbAvailable: true,
    storageEstimate: { supported: true, usage: 1000, quota: 50000 },
    status: 'ok',
    message: 'Storage is available and working normally.',
  }),
}));

/**
 * Helper: creates a fake IDBOpenDBRequest that resolves with the given db,
 * scheduling onsuccess in the next microtask.
 */
function fakeOpenRequest(db: unknown) {
  const request = {
    result: db,
    error: null as unknown,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  setTimeout(() => request.onsuccess?.(), 0);
  return request;
}

/**
 * Helper: creates a fake IDBOpenDBRequest that rejects via onerror.
 */
function fakeOpenRequestError(err: Error) {
  const request = {
    result: null,
    error: err,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  setTimeout(() => request.onerror?.(), 0);
  return request;
}

/**
 * Helper: builds a mock IDBDatabase with configurable stores.
 * storeContents maps store name -> record count (number) or Error to
 * simulate a count failure.
 */
function fakeDb(storeContents: Record<string, number | Error>) {
  const storeNames = Object.keys(storeContents);
  return {
    objectStoreNames: {
      contains: (name: string) => storeNames.includes(name),
    },
    transaction: (_storeName: string) => ({
      objectStore: (name: string) => {
        const value = storeContents[name];
        return {
          count: () => {
            const req = {
              result: typeof value === 'number' ? value : 0,
              error: value instanceof Error ? value : null,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            };
            setTimeout(() => {
              if (value instanceof Error) {
                req.onerror?.();
              } else {
                req.onsuccess?.();
              }
            }, 0);
            return req;
          },
          getAll: () => {
            const entries = storeContents[name];
            // getAll is only used for formpackMeta — return an array
            const req = {
              result: entries,
              error: null as unknown,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            };
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
        };
      },
    }),
    close: vi.fn(),
  };
}

/**
 * Helper: builds a formpackMeta-aware mock DB where getAll resolves with
 * entries and count resolves with entries.length for that store.
 */
function fakeDbWithFormpackMeta(
  storeContents: Record<string, number | Error>,
  formpackEntries: Array<{ id?: string; versionOrHash?: string }>,
) {
  const storeNames = Object.keys(storeContents);
  return {
    objectStoreNames: {
      contains: (name: string) => storeNames.includes(name),
    },
    transaction: (storeName: string) => ({
      objectStore: (_name?: string) => {
        const name = _name ?? storeName;
        const value = storeContents[name];
        return {
          count: () => {
            const req = {
              result: typeof value === 'number' ? value : 0,
              error: value instanceof Error ? value : null,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            };
            setTimeout(() => {
              if (value instanceof Error) {
                req.onerror?.();
              } else {
                req.onsuccess?.();
              }
            }, 0);
            return req;
          },
          getAll: () => {
            const req = {
              result: formpackEntries,
              error: null as unknown,
              onsuccess: null as (() => void) | null,
              onerror: null as (() => void) | null,
            };
            setTimeout(() => req.onsuccess?.(), 0);
            return req;
          },
        };
      },
    }),
    close: vi.fn(),
  };
}

const DB_NAME = 'mecfs-paperwork';
const TEST_USER_AGENT = 'TestAgent/1.0';
const TEST_PLATFORM = 'TestPlatform';
const TEST_SW_SCOPE = 'http://localhost:5173/';

const stubDefaultNavigator = () =>
  vi.stubGlobal('navigator', {
    userAgent: TEST_USER_AGENT,
    userAgentData: { platform: TEST_PLATFORM },
    language: 'de',
    languages: ['de', 'en'],
    cookieEnabled: true,
    onLine: true,
    serviceWorker: {
      getRegistration: vi.fn().mockResolvedValue(undefined),
    },
    storage: {
      estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 50000 }),
    },
  });

describe('collectDiagnosticsBundle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Stub browser APIs
    stubDefaultNavigator();

    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['test-cache']),
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([{}, {}]),
      }),
    });

    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi.fn().mockImplementation(() => {
        const request = {
          result: {
            objectStoreNames: {
              contains: () => false,
            },
            close: vi.fn(),
          },
          onsuccess: null as (() => void) | null,
          onerror: null as (() => void) | null,
        };
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      }),
    });

    vi.spyOn(globalThis.performance, 'getEntriesByType').mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a complete diagnostics bundle', async () => {
    const bundle = await collectDiagnosticsBundle();

    expect(bundle.generatedAt).toBeDefined();
    expect(bundle.app).toBeDefined();
    expect(bundle.app.version).toBeDefined();
    expect(bundle.app.buildDate).toBeDefined();
    expect(bundle.browser).toBeDefined();
    expect(bundle.browser.userAgent).toBe(TEST_USER_AGENT);
    expect(bundle.browser.platform).toBe(TEST_PLATFORM);
    expect(bundle.browser.language).toBe('de');
    expect(bundle.browser.languages).toEqual(['de', 'en']);
    expect(bundle.serviceWorker).toBeDefined();
    expect(bundle.serviceWorker.supported).toBe(true);
    expect(bundle.serviceWorker.registered).toBe(false);
    expect(bundle.caches).toBeDefined();
    expect(bundle.indexedDb).toBeDefined();
    expect(bundle.storageHealth).toBeDefined();
    expect(bundle.formpacks).toBeDefined();
    expect(bundle.performance.supported).toBe(true);
    expect(bundle.performance.measures).toEqual([]);
    expect(bundle.errors).toBeDefined();
  });

  it('collects cache info with entry counts', async () => {
    const bundle = await collectDiagnosticsBundle();
    expect(bundle.caches).toHaveLength(1);
    expect(bundle.caches[0].name).toBe('test-cache');
    expect(bundle.caches[0].entryCount).toBe(2);
  });

  it('collects error ring buffer entries', async () => {
    const bundle = await collectDiagnosticsBundle();
    expect(bundle.errors).toHaveLength(1);
    expect(bundle.errors[0]).toContain('Test error');
  });

  it('collects only mecfs.* performance measures and maps timing fields', async () => {
    vi.spyOn(globalThis.performance, 'getEntriesByType').mockReturnValue([
      {
        name: 'mecfs.app.boot.total',
        duration: 12.5,
        startTime: 100,
      } as PerformanceEntry,
      {
        name: 'third-party.measure',
        duration: 9.9,
        startTime: 80,
      } as PerformanceEntry,
      {
        name: 'mecfs.export.json.total',
        duration: 3.2,
        startTime: 220,
      } as PerformanceEntry,
    ]);

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.performance.supported).toBe(true);
    expect(bundle.performance.measures).toEqual([
      {
        name: 'mecfs.app.boot.total',
        durationMs: 12.5,
        startTimeMs: 100,
      },
      {
        name: 'mecfs.export.json.total',
        durationMs: 3.2,
        startTimeMs: 220,
      },
    ]);
  });

  it('returns unsupported performance info when Performance API is missing', async () => {
    vi.stubGlobal('performance', undefined);

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.performance).toEqual({ supported: false, measures: [] });
  });

  it('handles missing serviceWorker API', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'TestAgent',
      userAgentData: { platform: 'Test' },
      language: 'en',
      languages: ['en'],
      cookieEnabled: true,
      onLine: true,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
      },
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.serviceWorker.supported).toBe(false);
    expect(bundle.serviceWorker.registered).toBe(false);
  });

  it('handles missing caches API', async () => {
    vi.stubGlobal('caches', undefined);

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.caches).toEqual([]);
  });

  it('does not include any draft data, content, or personal info', async () => {
    const bundle = await collectDiagnosticsBundle();
    const json = JSON.stringify(bundle);

    // Verify no keys that could contain user data are present
    expect(json).not.toContain('"data"');
    expect(json).not.toContain('"payload"');
    expect(json).not.toContain('"patient"');
    expect(json).not.toContain('"diagnosis"');
  });

  it('includes generatedAt as valid ISO date', async () => {
    const bundle = await collectDiagnosticsBundle();
    const date = new Date(bundle.generatedAt);
    expect(date.getTime()).not.toBeNaN();
  });

  it('includes storageHealth from the health checker', async () => {
    const bundle = await collectDiagnosticsBundle();
    expect(bundle.storageHealth.status).toBe('ok');
    expect(bundle.storageHealth.indexedDbAvailable).toBe(true);
  });

  // ── Service Worker: active registration with scope and state ──

  it('reports service worker scope and state when registration is active', async () => {
    vi.stubGlobal('navigator', {
      userAgent: TEST_USER_AGENT,
      userAgentData: { platform: TEST_PLATFORM },
      language: 'de',
      languages: ['de', 'en'],
      cookieEnabled: true,
      onLine: true,
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          scope: TEST_SW_SCOPE,
          active: { state: 'activated' },
          waiting: null,
          installing: null,
        }),
      },
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 50000 }),
      },
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.serviceWorker.supported).toBe(true);
    expect(bundle.serviceWorker.registered).toBe(true);
    expect(bundle.serviceWorker.scope).toBe(TEST_SW_SCOPE);
    expect(bundle.serviceWorker.state).toBe('activated');
  });

  it('falls back to waiting worker state when active is null', async () => {
    vi.stubGlobal('navigator', {
      userAgent: TEST_USER_AGENT,
      userAgentData: { platform: TEST_PLATFORM },
      language: 'de',
      languages: ['de', 'en'],
      cookieEnabled: true,
      onLine: true,
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          scope: TEST_SW_SCOPE,
          active: null,
          waiting: { state: 'installed' },
          installing: null,
        }),
      },
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 50000 }),
      },
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.serviceWorker.registered).toBe(true);
    expect(bundle.serviceWorker.state).toBe('installed');
  });

  // ── Service Worker: getRegistration throwing ──

  it('handles serviceWorker.getRegistration throwing', async () => {
    vi.stubGlobal('navigator', {
      userAgent: TEST_USER_AGENT,
      userAgentData: { platform: TEST_PLATFORM },
      language: 'de',
      languages: ['de', 'en'],
      cookieEnabled: true,
      onLine: true,
      serviceWorker: {
        getRegistration: vi.fn().mockRejectedValue(new Error('SW error')),
      },
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 50000 }),
      },
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.serviceWorker.supported).toBe(true);
    expect(bundle.serviceWorker.registered).toBe(false);
  });

  // ── IndexedDB: stores with record counts ──

  it('collects IDB store record counts when stores exist', async () => {
    const db = fakeDb({ records: 5, snapshots: 3 });
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.indexedDb.available).toBe(true);
    expect(bundle.indexedDb.databases).toEqual([DB_NAME]);
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'records',
      recordCount: 5,
    });
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'snapshots',
      recordCount: 3,
    });
  });

  // ── IndexedDB: databases() not supported ──

  it('handles indexedDB.databases not being a function', async () => {
    const db = fakeDb({});
    vi.stubGlobal('indexedDB', {
      // no databases property at all
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.indexedDb.available).toBe(true);
    expect(bundle.indexedDb.databases).toEqual([]);
    expect(bundle.indexedDb.stores).toEqual([]);
  });

  // ── IndexedDB: store count failure ──

  it('reports recordCount -1 when store.count() fails', async () => {
    const db = fakeDb({ records: new Error('count failed'), snapshots: 10 });
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'records',
      recordCount: -1,
    });
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'snapshots',
      recordCount: 10,
    });
  });

  // ── IndexedDB: open DB fails ──

  it('handles indexedDB.open failure gracefully', async () => {
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi
        .fn()
        .mockImplementation(() =>
          fakeOpenRequestError(new Error('open failed')),
        ),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.indexedDb.available).toBe(true);
    expect(bundle.indexedDb.databases).toEqual([DB_NAME]);
    expect(bundle.indexedDb.stores).toEqual([]);
  });

  // ── FormpackMeta: store with entries ──

  it('collects formpackMeta entries when the store exists', async () => {
    const entries = [
      { id: 'pack-1', versionOrHash: 'v1.0' },
      { id: 'pack-2', versionOrHash: 'abc123' },
    ];
    const db = fakeDbWithFormpackMeta(
      { records: 5, snapshots: 3, formpackMeta: 2 },
      entries,
    );
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: DB_NAME }]),
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.formpacks).toEqual([
      { id: 'pack-1', versionOrHash: 'v1.0' },
      { id: 'pack-2', versionOrHash: 'abc123' },
    ]);
  });

  it('uses "unknown" defaults for formpackMeta entries with missing fields', async () => {
    const entries = [{}, { id: 'pack-only-id' }];
    const db = fakeDbWithFormpackMeta({ formpackMeta: 2 }, entries);
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.formpacks).toEqual([
      { id: 'unknown', versionOrHash: 'unknown' },
      { id: 'pack-only-id', versionOrHash: 'unknown' },
    ]);
  });

  // ── FormpackMeta: store not existing ──

  it('returns empty formpacks when formpackMeta store does not exist', async () => {
    // DB has records and snapshots but no formpackMeta
    const db = fakeDb({ records: 1, snapshots: 0 });
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([]),
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.formpacks).toEqual([]);
  });

  // ── FormpackMeta: DB open failure ──

  it('returns empty formpacks when DB open fails for formpackMeta', async () => {
    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([]),
      open: vi
        .fn()
        .mockImplementation(() =>
          fakeOpenRequestError(new Error('db open fail')),
        ),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.formpacks).toEqual([]);
  });

  // ── FormpackMeta: indexedDB undefined ──

  it('returns empty formpacks when indexedDB is undefined', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.indexedDb.available).toBe(false);
    expect(bundle.indexedDb.stores).toEqual([]);
    expect(bundle.formpacks).toEqual([]);
  });

  // ── Caches: open throws for a specific cache ──

  it('reports entryCount -1 when caches.open throws for a cache', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['good-cache', 'bad-cache']),
      open: vi.fn().mockImplementation((name: string) => {
        if (name === 'bad-cache') {
          return Promise.reject(new Error('cache corrupt'));
        }
        return Promise.resolve({
          keys: vi.fn().mockResolvedValue([{}, {}, {}]),
        });
      }),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.caches).toHaveLength(2);
    expect(bundle.caches).toContainEqual({ name: 'good-cache', entryCount: 3 });
    expect(bundle.caches).toContainEqual({ name: 'bad-cache', entryCount: -1 });
  });

  it('returns empty caches when caches.keys() throws', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn().mockRejectedValue(new Error('keys failed')),
      open: vi.fn(),
    });

    const bundle = await collectDiagnosticsBundle();
    expect(bundle.caches).toEqual([]);
  });

  // ── Full bundle with all subsystems populated ──

  it('returns a fully populated bundle with all subsystems', async () => {
    // Service worker: active
    vi.stubGlobal('navigator', {
      userAgent: 'IntegrationAgent/2.0',
      userAgentData: { platform: 'IntegrationPlatform' },
      language: 'en',
      languages: ['en', 'fr'],
      cookieEnabled: true,
      onLine: true,
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({
          scope: 'http://localhost:4000/',
          active: { state: 'activated' },
          waiting: null,
          installing: null,
        }),
      },
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 2000, quota: 100000 }),
      },
    });

    // Caches: two caches
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['cache-a', 'cache-b']),
      open: vi.fn().mockImplementation((name: string) => {
        const counts: Record<string, number> = { 'cache-a': 10, 'cache-b': 5 };
        return Promise.resolve({
          keys: vi.fn().mockResolvedValue(Array(counts[name] ?? 0).fill({})),
        });
      }),
    });

    // IndexedDB: stores with records + formpackMeta with entries
    const formpackEntries = [
      { id: 'form-a', versionOrHash: 'hash-a' },
      { id: 'form-b', versionOrHash: 'hash-b' },
    ];
    const db = fakeDbWithFormpackMeta(
      { records: 42, snapshots: 7, formpackMeta: 2 },
      formpackEntries,
    );
    vi.stubGlobal('indexedDB', {
      databases: vi
        .fn()
        .mockResolvedValue([{ name: DB_NAME }, { name: 'another-db' }]),
      open: vi.fn().mockImplementation(() => fakeOpenRequest(db)),
    });

    const bundle = await collectDiagnosticsBundle();

    // App info
    expect(bundle.app.version).toBeDefined();
    expect(bundle.app.buildDate).toBeDefined();
    expect(bundle.app.environment).toBeDefined();

    // Browser info
    expect(bundle.browser.userAgent).toBe('IntegrationAgent/2.0');
    expect(bundle.browser.platform).toBe('IntegrationPlatform');
    expect(bundle.browser.language).toBe('en');
    expect(bundle.browser.languages).toEqual(['en', 'fr']);
    expect(bundle.browser.cookiesEnabled).toBe(true);
    expect(bundle.browser.onLine).toBe(true);
    expect(bundle.browser.timezone).toBeDefined();

    // Service worker
    expect(bundle.serviceWorker.supported).toBe(true);
    expect(bundle.serviceWorker.registered).toBe(true);
    expect(bundle.serviceWorker.scope).toBe('http://localhost:4000/');
    expect(bundle.serviceWorker.state).toBe('activated');

    // Caches
    expect(bundle.caches).toHaveLength(2);
    expect(bundle.caches).toContainEqual({ name: 'cache-a', entryCount: 10 });
    expect(bundle.caches).toContainEqual({ name: 'cache-b', entryCount: 5 });

    // IndexedDB
    expect(bundle.indexedDb.available).toBe(true);
    expect(bundle.indexedDb.databases).toEqual([DB_NAME, 'another-db']);
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'records',
      recordCount: 42,
    });
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'snapshots',
      recordCount: 7,
    });
    expect(bundle.indexedDb.stores).toContainEqual({
      name: 'formpackMeta',
      recordCount: 2,
    });

    // Formpacks
    expect(bundle.formpacks).toEqual([
      { id: 'form-a', versionOrHash: 'hash-a' },
      { id: 'form-b', versionOrHash: 'hash-b' },
    ]);

    // Storage health (from mock)
    expect(bundle.storageHealth.status).toBe('ok');

    // Errors (from mock)
    expect(bundle.errors).toHaveLength(1);

    // Performance
    expect(bundle.performance.supported).toBe(true);
    expect(bundle.performance.measures).toEqual([]);

    // Generated timestamp
    expect(new Date(bundle.generatedAt).getTime()).not.toBeNaN();
  });
});
