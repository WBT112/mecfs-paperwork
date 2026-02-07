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

import { runFormpackBackgroundRefresh } from '../../../src/formpacks/backgroundRefresh';

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

const installFetchMock = () => {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/manifest.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => manifestPayload,
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(0),
      json: async () => ({}),
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
      updatedAt: '2026-02-01T00:00:00.000Z',
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
      updatedAt: '2026-02-01T00:00:00.000Z',
    });

    const result = await runFormpackBackgroundRefresh();

    expect(result.updatedIds).toEqual([]);
    expect(upsertFormpackMeta).not.toHaveBeenCalled();
    expect(clearFormpackCaches).not.toHaveBeenCalled();
  });
});
