import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { FORMPACK_ID } = vi.hoisted(() => ({ FORMPACK_ID: 'doctor-letter' }));

const getFormpackMeta = vi.hoisted(() => vi.fn());
const upsertFormpackMeta = vi.hoisted(() => vi.fn());
const clearFormpackCaches = vi.hoisted(() => vi.fn());
const clearFormpackI18nCache = vi.hoisted(() => vi.fn());
const parseManifest = vi.hoisted(() => vi.fn());
const deriveFormpackRevisionSignature = vi.hoisted(() => vi.fn());

vi.mock('../../../src/formpacks/registry', () => ({
  FORMPACK_IDS: [FORMPACK_ID],
}));

vi.mock('../../../src/storage/formpackMeta', () => ({
  getFormpackMeta,
  upsertFormpackMeta,
}));

vi.mock('../../../src/formpacks/loader', () => ({
  parseManifest,
  clearFormpackCaches,
}));

vi.mock('../../../src/i18n/formpack', () => ({
  clearFormpackI18nCache,
}));

vi.mock('../../../src/formpacks/metadata', () => ({
  deriveFormpackRevisionSignature,
}));

import {
  runFormpackBackgroundRefresh,
  FORMPACKS_UPDATED_EVENT,
  startFormpackBackgroundRefresh,
} from '../../../src/formpacks/backgroundRefresh';

const manifestPayload = {
  id: FORMPACK_ID,
  version: '1.0.0',
  locales: ['de', 'en'],
};

const parsedManifest = {
  id: FORMPACK_ID,
  version: '1.0.0',
  locales: ['de', 'en'],
  defaultLocale: 'de',
  titleKey: 'title',
  descriptionKey: 'description',
  exports: ['docx', 'json'],
  visibility: 'public',
  docx: {
    templates: { a4: 'docx/a4.docx' },
    mapping: 'docx/mapping.json',
  },
};
const UPDATED_AT = '2026-02-01T00:00:00.000Z';

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

const createResponse = (
  ok: boolean,
  status: number,
  payload: unknown = {},
): MockResponse => ({
  ok,
  status,
  json: async () => payload,
  arrayBuffer: async () => new ArrayBuffer(0),
});

const installFetchMock = (options?: {
  manifestResponse?: MockResponse | Promise<MockResponse>;
  resourceResponse?: MockResponse;
  failResourcePath?: string;
}) => {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/manifest.json')) {
      return Promise.resolve(
        options?.manifestResponse ?? createResponse(true, 200, manifestPayload),
      );
    }

    if (options?.failResourcePath && url.endsWith(options.failResourcePath)) {
      return Promise.resolve(createResponse(false, 500));
    }

    return Promise.resolve({
      ...(options?.resourceResponse ?? createResponse(true, 200)),
    });
  });

  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  return fetchMock;
};

describe('formpacks/backgroundRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseManifest.mockReturnValue(parsedManifest);
    deriveFormpackRevisionSignature.mockResolvedValue({
      versionOrHash: '1.0.1',
      version: '1.0.1',
      hash: 'new-hash',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('skips refresh while offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    const result = await runFormpackBackgroundRefresh();

    expect(result.skippedOffline).toBe(true);
    expect(result.updatedIds).toEqual([]);
    expect(getFormpackMeta).not.toHaveBeenCalled();
  });

  it('updates metadata and invalidates caches when formpack content changed', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    const fetchMock = installFetchMock();

    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'old-hash',
      updatedAt: UPDATED_AT,
    });

    const result = await runFormpackBackgroundRefresh();

    expect(result.skippedOffline).toBe(false);
    expect(result.updatedIds).toEqual([FORMPACK_ID]);
    expect(upsertFormpackMeta).toHaveBeenCalledWith({
      id: FORMPACK_ID,
      versionOrHash: '1.0.1',
      version: '1.0.1',
      hash: 'new-hash',
    });
    expect(clearFormpackCaches).toHaveBeenCalledTimes(1);
    expect(clearFormpackI18nCache).toHaveBeenCalledWith(FORMPACK_ID);

    const firstCall = fetchMock.mock.calls.at(0);
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error('Expected fetch call');
    }

    const firstRequestOptions = firstCall[1] as RequestInit;
    const headers = new Headers(firstRequestOptions.headers);
    expect(headers.get('x-formpack-refresh')).toBe('1');
  });

  it('bootstraps metadata without invalidating caches when no baseline exists', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock();
    getFormpackMeta.mockResolvedValue(null);

    const result = await runFormpackBackgroundRefresh();

    expect(result.skippedOffline).toBe(false);
    expect(result.updatedIds).toEqual([]);
    expect(upsertFormpackMeta).toHaveBeenCalledWith({
      id: FORMPACK_ID,
      versionOrHash: '1.0.1',
      version: '1.0.1',
      hash: 'new-hash',
    });
    expect(clearFormpackCaches).not.toHaveBeenCalled();
    expect(clearFormpackI18nCache).not.toHaveBeenCalled();
  });

  it('does not refresh unchanged revisions', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock();

    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.1',
      version: '1.0.1',
      hash: 'new-hash',
      updatedAt: UPDATED_AT,
    });

    const result = await runFormpackBackgroundRefresh();

    expect(result.updatedIds).toEqual([]);
    expect(upsertFormpackMeta).not.toHaveBeenCalled();
    expect(clearFormpackCaches).not.toHaveBeenCalled();
  });

  it('reuses the in-flight refresh promise for concurrent calls', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    let resolveManifest: ((value: MockResponse) => void) | null = null;
    const manifestResponse = new Promise<MockResponse>((resolve) => {
      resolveManifest = resolve;
    });
    const fetchMock = installFetchMock({ manifestResponse });

    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'old-hash',
      updatedAt: UPDATED_AT,
    });

    const firstRun = runFormpackBackgroundRefresh();
    const secondRun = runFormpackBackgroundRefresh();

    expect(resolveManifest).toBeTypeOf('function');
    resolveManifest!(createResponse(true, 200, manifestPayload));

    const [firstResult, secondResult] = await Promise.all([
      firstRun,
      secondRun,
    ]);
    expect(firstResult).toEqual(secondResult);
    expect(getFormpackMeta).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('keeps refresh best-effort when manifest fetch returns an HTTP error', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock({
      manifestResponse: createResponse(false, 503),
    });

    const result = await runFormpackBackgroundRefresh();

    expect(result.skippedOffline).toBe(false);
    expect(result.updatedIds).toEqual([]);
    expect(parseManifest).not.toHaveBeenCalled();
    expect(upsertFormpackMeta).not.toHaveBeenCalled();
  });

  it('skips updates when downloading changed resources fails', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock({ failResourcePath: '/schema.json' });
    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'old-hash',
      updatedAt: UPDATED_AT,
    });

    const result = await runFormpackBackgroundRefresh();

    expect(result.updatedIds).toEqual([]);
    expect(upsertFormpackMeta).not.toHaveBeenCalled();
    expect(clearFormpackCaches).not.toHaveBeenCalled();
  });

  it('runs scheduled refreshes via requestIdleCallback and emits update events', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock();
    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'old-hash',
      updatedAt: UPDATED_AT,
    });

    let idleCallback:
      | ((deadline: {
          didTimeout: boolean;
          timeRemaining: () => number;
        }) => void)
      | null = null;
    const requestIdleCallback = vi.fn((callback: typeof idleCallback) => {
      idleCallback = callback;
      return 123;
    });
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    vi.stubGlobal('cancelIdleCallback', cancelIdleCallback);

    const onUpdated = vi.fn();
    const eventListener = vi.fn();
    globalThis.addEventListener(
      FORMPACKS_UPDATED_EVENT,
      eventListener as EventListener,
    );

    const stop = startFormpackBackgroundRefresh({
      onUpdated,
      intervalMs: 60_000,
    });

    expect(idleCallback).toBeTypeOf('function');
    idleCallback!({
      didTimeout: false,
      timeRemaining: () => 10,
    });

    await vi.waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith([FORMPACK_ID]);
    });
    expect(eventListener).toHaveBeenCalledTimes(1);

    stop();

    expect(cancelIdleCallback).toHaveBeenCalledWith(123);
    globalThis.removeEventListener(
      FORMPACKS_UPDATED_EVENT,
      eventListener as EventListener,
    );
  });

  it('uses setTimeout fallback and reruns refresh when going online', async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock();
    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'old-hash',
      updatedAt: UPDATED_AT,
    });

    vi.stubGlobal('requestIdleCallback', undefined as unknown as never);
    vi.stubGlobal('cancelIdleCallback', undefined as unknown as never);

    const onUpdated = vi.fn();
    const stop = startFormpackBackgroundRefresh({
      onUpdated,
      intervalMs: 60_000,
    });

    await vi.advanceTimersByTimeAsync(1_600);
    await vi.waitFor(() => {
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    globalThis.dispatchEvent(new Event('online'));
    await vi.waitFor(() => {
      expect(onUpdated).toHaveBeenCalledTimes(2);
    });

    stop();
  });

  it('ignores a queued idle callback after refresh has been stopped', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    const fetchMock = installFetchMock();

    let idleCallback:
      | ((deadline: {
          didTimeout: boolean;
          timeRemaining: () => number;
        }) => void)
      | null = null;
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: typeof idleCallback) => {
        idleCallback = callback;
        return 99;
      }),
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    const stop = startFormpackBackgroundRefresh({ intervalMs: 60_000 });
    stop();

    expect(idleCallback).toBeTypeOf('function');
    idleCallback!({
      didTimeout: false,
      timeRemaining: () => 0,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swallows callback errors from onUpdated during scheduled refresh', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    installFetchMock();
    getFormpackMeta.mockResolvedValue({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'old-hash',
      updatedAt: UPDATED_AT,
    });

    let idleCallback:
      | ((deadline: {
          didTimeout: boolean;
          timeRemaining: () => number;
        }) => void)
      | null = null;
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: typeof idleCallback) => {
        idleCallback = callback;
        return 77;
      }),
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    const eventListener = vi.fn();
    globalThis.addEventListener(
      FORMPACKS_UPDATED_EVENT,
      eventListener as EventListener,
    );

    const stop = startFormpackBackgroundRefresh({
      onUpdated: () => {
        throw new Error('boom');
      },
      intervalMs: 60_000,
    });

    expect(idleCallback).toBeTypeOf('function');
    idleCallback!({
      didTimeout: false,
      timeRemaining: () => 10,
    });
    await Promise.resolve();

    expect(eventListener).not.toHaveBeenCalled();

    stop();
    globalThis.removeEventListener(
      FORMPACKS_UPDATED_EVENT,
      eventListener as EventListener,
    );
  });
});
