import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('collectDiagnosticsBundle', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    // Stub browser APIs
    vi.stubGlobal('navigator', {
      userAgent: 'TestAgent/1.0',
      platform: 'TestPlatform',
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

    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['test-cache']),
      open: vi.fn().mockResolvedValue({
        keys: vi.fn().mockResolvedValue([{}, {}]),
      }),
    });

    vi.stubGlobal('indexedDB', {
      databases: vi.fn().mockResolvedValue([{ name: 'mecfs-paperwork' }]),
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
  });

  it('returns a complete diagnostics bundle', async () => {
    const bundle = await collectDiagnosticsBundle();

    expect(bundle.generatedAt).toBeDefined();
    expect(bundle.app).toBeDefined();
    expect(bundle.app.version).toBeDefined();
    expect(bundle.app.buildDate).toBeDefined();
    expect(bundle.browser).toBeDefined();
    expect(bundle.browser.userAgent).toBe('TestAgent/1.0');
    expect(bundle.browser.platform).toBe('TestPlatform');
    expect(bundle.browser.language).toBe('de');
    expect(bundle.browser.languages).toEqual(['de', 'en']);
    expect(bundle.serviceWorker).toBeDefined();
    expect(bundle.serviceWorker.supported).toBe(true);
    expect(bundle.serviceWorker.registered).toBe(false);
    expect(bundle.caches).toBeDefined();
    expect(bundle.indexedDb).toBeDefined();
    expect(bundle.storageHealth).toBeDefined();
    expect(bundle.formpacks).toBeDefined();
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

  it('handles missing serviceWorker API', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'TestAgent',
      platform: 'Test',
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
});
