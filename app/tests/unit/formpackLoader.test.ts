// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  parseManifest,
  FormpackLoaderError,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
  listFormpacks,
  clearFormpackCaches,
} from '../../src/formpacks/loader';
import type { FormpackManifestPayload } from '../../src/formpacks/types';

const TEST_FORMPACK_ID = 'test-formpack';
const DOCTOR_LETTER_ID = 'doctor-letter';
const NOTFALLPASS_ID = 'notfallpass';
const OFFLABEL_ANTRAG_ID = 'offlabel-antrag';
const DOCX_A4_PATH = 'docx/a4.docx';
const DOCX_WALLET_PATH = 'docx/wallet.docx';
const DOCX_MAPPING_PATH = 'docx/mapping.json';
const MANIFEST_PATH_DOCTOR = `/formpacks/${DOCTOR_LETTER_ID}/manifest.json`;
const MANIFEST_PATH_NOTFALLPASS = `/formpacks/${NOTFALLPASS_ID}/manifest.json`;
const MANIFEST_PATH_OFFLABEL = `/formpacks/${OFFLABEL_ANTRAG_ID}/manifest.json`;
const SCHEMA_PATH_DOCTOR = `/formpacks/${DOCTOR_LETTER_ID}/schema.json`;
const UI_SCHEMA_PATH_DOCTOR = `/formpacks/${DOCTOR_LETTER_ID}/ui.schema.json`;
const UNKNOWN_FORMPACK_ID = 'unknown-formpack';
const UNKNOWN_FORMPACK_MESSAGE = 'The requested formpack id is not registered.';
const DOCX_ASSETS_ERROR_MESSAGE =
  'The formpack manifest declares DOCX exports without valid DOCX assets.';

describe('parseManifest', () => {
  const validPayload: FormpackManifestPayload = {
    id: TEST_FORMPACK_ID,
    version: '1.0.0',
    titleKey: 'title',
    descriptionKey: 'description',
    locales: ['en'],
    defaultLocale: 'en',
    exports: ['json'],
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearFormpackCaches();
  });

  it('throws an error if the formpack ID does not match', () => {
    expect(() => parseManifest(validPayload, 'different-formpack-id')).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest id does not match the requested pack.',
      ),
    );
  });

  it('defaults visibility to public when missing', () => {
    const manifest = parseManifest(validPayload, TEST_FORMPACK_ID);
    expect(manifest.visibility).toBe('public');
  });

  it('throws when required fields are missing', () => {
    const payload = { ...validPayload, titleKey: undefined } as unknown as
      | FormpackManifestPayload
      | undefined;
    expect(() =>
      parseManifest(payload as FormpackManifestPayload, TEST_FORMPACK_ID),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest is missing required fields.',
      ),
    );
  });

  it('throws when locales are missing or unsupported', () => {
    const missingLocales = { ...validPayload, locales: undefined };
    expect(() =>
      parseManifest(
        missingLocales as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest must declare supported locales.',
      ),
    );

    const unsupportedLocales = { ...validPayload, locales: ['fr'] };
    expect(() =>
      parseManifest(
        unsupportedLocales as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(
      new FormpackLoaderError(
        'unsupported',
        'The formpack manifest declares an unsupported locale.',
      ),
    );
  });

  it('throws when default locale is missing or unsupported', () => {
    const missingDefault = { ...validPayload, defaultLocale: undefined };
    expect(() =>
      parseManifest(
        missingDefault as unknown as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest must declare a default locale.',
      ),
    );

    const unsupportedDefault = { ...validPayload, defaultLocale: 'fr' };
    expect(() =>
      parseManifest(
        unsupportedDefault as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(
      new FormpackLoaderError(
        'unsupported',
        'The formpack manifest declares an unsupported default locale.',
      ),
    );
  });

  it('throws when exports are missing or unsupported', () => {
    const missingExports = { ...validPayload, exports: undefined };
    expect(() =>
      parseManifest(
        missingExports as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest must declare export formats.',
      ),
    );

    const unsupportedExports = { ...validPayload, exports: ['xml'] };
    expect(() =>
      parseManifest(
        unsupportedExports as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(
      new FormpackLoaderError(
        'unsupported',
        'The formpack manifest declares an unsupported export type.',
      ),
    );
  });

  it('throws when visibility is invalid', () => {
    const payload = { ...validPayload, visibility: 'hidden' };
    expect(() =>
      parseManifest(payload as FormpackManifestPayload, TEST_FORMPACK_ID),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest declares an unsupported visibility.',
      ),
    );
  });

  it('throws when DOCX exports are declared without valid assets', () => {
    const payload = {
      ...validPayload,
      exports: ['docx'],
      docx: { templates: { a4: 123 }, mapping: DOCX_MAPPING_PATH },
    };
    expect(() =>
      parseManifest(payload as FormpackManifestPayload, TEST_FORMPACK_ID),
    ).toThrow(new FormpackLoaderError('invalid', DOCX_ASSETS_ERROR_MESSAGE));
  });

  it('rejects wallet templates outside notfallpass', () => {
    const payload = {
      ...validPayload,
      exports: ['docx'],
      docx: {
        templates: { a4: DOCX_A4_PATH, wallet: DOCX_WALLET_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };
    expect(() =>
      parseManifest(payload as FormpackManifestPayload, TEST_FORMPACK_ID),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'Wallet templates are only supported for the notfallpass formpack.',
      ),
    );
  });

  it('accepts valid DOCX assets for notfallpass', () => {
    const payload = {
      ...validPayload,
      id: NOTFALLPASS_ID,
      exports: ['docx'],
      docx: {
        templates: { a4: DOCX_A4_PATH, wallet: DOCX_WALLET_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };
    const manifest = parseManifest(
      payload as FormpackManifestPayload,
      NOTFALLPASS_ID,
    );
    expect(manifest.docx?.templates.wallet).toBe(DOCX_WALLET_PATH);
  });

  it('throws when DOCX templates are invalid or mapping is not a string', () => {
    const invalidTemplatesPayload = {
      ...validPayload,
      exports: ['docx'],
      docx: {
        templates: 'invalid',
        mapping: DOCX_MAPPING_PATH,
      },
    };
    expect(() =>
      parseManifest(
        invalidTemplatesPayload as unknown as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(new FormpackLoaderError('invalid', DOCX_ASSETS_ERROR_MESSAGE));

    const invalidWalletTypePayload = {
      ...validPayload,
      exports: ['docx'],
      docx: {
        templates: { a4: DOCX_A4_PATH, wallet: 123 },
        mapping: DOCX_MAPPING_PATH,
      },
    };
    expect(() =>
      parseManifest(
        invalidWalletTypePayload as unknown as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(new FormpackLoaderError('invalid', DOCX_ASSETS_ERROR_MESSAGE));

    const invalidMappingPayload = {
      ...validPayload,
      exports: ['docx'],
      docx: {
        templates: { a4: DOCX_A4_PATH },
        mapping: 123,
      },
    };
    expect(() =>
      parseManifest(
        invalidMappingPayload as unknown as FormpackManifestPayload,
        TEST_FORMPACK_ID,
      ),
    ).toThrow(new FormpackLoaderError('invalid', DOCX_ASSETS_ERROR_MESSAGE));
  });

  it('accepts a DOCX manifest with only an a4 template', () => {
    const payload = {
      ...validPayload,
      exports: ['docx'],
      docx: {
        templates: { a4: DOCX_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const manifest = parseManifest(
      payload as FormpackManifestPayload,
      TEST_FORMPACK_ID,
    );

    expect(manifest.docx).toEqual({
      templates: { a4: DOCX_A4_PATH },
      mapping: DOCX_MAPPING_PATH,
    });
  });

  it('parses optional meta with category/keywords and drops invalid meta values', () => {
    const withBoth = parseManifest(
      {
        ...validPayload,
        meta: {
          category: 'general',
          keywords: ['foo', 'bar'],
        },
      } as FormpackManifestPayload,
      TEST_FORMPACK_ID,
    );
    expect(withBoth.meta).toEqual({
      category: 'general',
      keywords: ['foo', 'bar'],
    });

    const withCategoryOnly = parseManifest(
      {
        ...validPayload,
        meta: {
          category: 'doctor',
          keywords: 123,
        },
      } as unknown as FormpackManifestPayload,
      TEST_FORMPACK_ID,
    );
    expect(withCategoryOnly.meta).toEqual({ category: 'doctor' });

    const withKeywordsOnly = parseManifest(
      {
        ...validPayload,
        meta: {
          category: 'invalid-category',
          keywords: ['only-keywords'],
        },
      } as unknown as FormpackManifestPayload,
      TEST_FORMPACK_ID,
    );
    expect(withKeywordsOnly.meta).toEqual({ keywords: ['only-keywords'] });

    const withInvalidMeta = parseManifest(
      {
        ...validPayload,
        meta: {
          category: 'invalid-category',
          keywords: 123,
        },
      } as unknown as FormpackManifestPayload,
      TEST_FORMPACK_ID,
    );
    expect(withInvalidMeta.meta).toBeUndefined();
  });

  it('keeps ui configuration when manifest ui payload is an object', () => {
    const payload = {
      ...validPayload,
      ui: {
        showValidityBanner: true,
        sectionMode: 'tabs',
      },
    };

    const manifest = parseManifest(
      payload as FormpackManifestPayload,
      TEST_FORMPACK_ID,
    );

    expect(manifest.ui).toEqual({
      showValidityBanner: true,
      sectionMode: 'tabs',
    });
  });
});

type FetchHandler =
  | { ok: boolean; status?: number; json?: () => Promise<unknown> }
  | { error: Error };

const buildFetchMock = (handlers: Record<string, FetchHandler | undefined>) =>
  vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const handler = handlers[url];
    if (!handler) {
      return Promise.resolve({ ok: false, status: 404 });
    }
    if ('error' in handler) {
      return Promise.reject(handler.error);
    }
    return Promise.resolve({
      ok: handler.ok,
      status: handler.status ?? (handler.ok ? 200 : 500),
      json: handler.json,
    });
  });

describe('formpack loader fetches', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearFormpackCaches();
  });

  const manifestFor = (id: string): FormpackManifestPayload => ({
    id,
    version: '1.0.0',
    titleKey: 'title',
    descriptionKey: 'description',
    locales: ['en'],
    defaultLocale: 'en',
    exports: ['json'],
  });

  it('loads a manifest successfully', async () => {
    const fetchMock = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        ok: true,
        json: async () => manifestFor(DOCTOR_LETTER_ID),
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const manifest = await loadFormpackManifest(DOCTOR_LETTER_ID);
    expect(manifest.id).toBe(DOCTOR_LETTER_ID);
  });

  it('rejects unknown formpack ids before fetching resources', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(
      loadFormpackManifest(UNKNOWN_FORMPACK_ID),
    ).rejects.toMatchObject({
      code: 'not_found',
      message: UNKNOWN_FORMPACK_MESSAGE,
    });
    await expect(loadFormpackSchema(UNKNOWN_FORMPACK_ID)).rejects.toMatchObject(
      {
        code: 'schema_not_found',
        message: UNKNOWN_FORMPACK_MESSAGE,
      },
    );
    await expect(
      loadFormpackUiSchema(UNKNOWN_FORMPACK_ID),
    ).rejects.toMatchObject({
      code: 'ui_schema_not_found',
      message: UNKNOWN_FORMPACK_MESSAGE,
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reuses the cached manifest for repeated requests', async () => {
    const fetchMock = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        ok: true,
        json: async () => manifestFor(DOCTOR_LETTER_ID),
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const first = await loadFormpackManifest(DOCTOR_LETTER_ID);
    const second = await loadFormpackManifest(DOCTOR_LETTER_ID);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces network failures for manifest requests', async () => {
    const fetchMock = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        error: new Error('offline'),
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(loadFormpackManifest(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'network',
      message: 'Unable to reach the formpack manifest.',
    });
  });

  it('handles missing and invalid manifest responses', async () => {
    const fetchMock = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        ok: false,
        status: 404,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(loadFormpackManifest(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'not_found',
    });

    const invalidJsonFetch = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        ok: true,
        json: async () => {
          throw new Error('bad json');
        },
      },
    });
    vi.stubGlobal('fetch', invalidJsonFetch as unknown as typeof fetch);

    await expect(loadFormpackManifest(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'invalid',
      message: 'The formpack manifest could not be parsed.',
    });
  });

  it('handles non-ok manifest responses', async () => {
    const fetchMock = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        ok: false,
        status: 500,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(loadFormpackManifest(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'network',
      message: 'Unable to load the formpack manifest.',
    });
  });

  it('loads schemas and handles error branches', async () => {
    const fetchMock = buildFetchMock({
      [SCHEMA_PATH_DOCTOR]: {
        ok: true,
        json: async () => ({ type: 'object' }),
      },
      [UI_SCHEMA_PATH_DOCTOR]: {
        ok: false,
        status: 404,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(loadFormpackSchema(DOCTOR_LETTER_ID)).resolves.toEqual({
      type: 'object',
    });
    await expect(loadFormpackUiSchema(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'ui_schema_not_found',
    });
  });

  it('handles invalid schema payloads and network errors', async () => {
    const invalidJsonFetch = buildFetchMock({
      [SCHEMA_PATH_DOCTOR]: {
        ok: true,
        json: async () => {
          throw new Error('bad json');
        },
      },
    });
    vi.stubGlobal('fetch', invalidJsonFetch as unknown as typeof fetch);

    await expect(loadFormpackSchema(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'schema_invalid',
    });

    const invalidShapeFetch = buildFetchMock({
      [SCHEMA_PATH_DOCTOR]: {
        ok: true,
        json: async () => 'not-an-object',
      },
    });
    vi.stubGlobal('fetch', invalidShapeFetch as unknown as typeof fetch);

    await expect(loadFormpackSchema(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'schema_invalid',
    });

    const offlineFetch = buildFetchMock({
      [SCHEMA_PATH_DOCTOR]: {
        error: new Error('offline'),
      },
    });
    vi.stubGlobal('fetch', offlineFetch as unknown as typeof fetch);

    await expect(loadFormpackSchema(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'schema_unavailable',
    });
  });

  it('handles non-ok schema responses and reuses cached schema resources', async () => {
    const nonOkFetch = buildFetchMock({
      [SCHEMA_PATH_DOCTOR]: {
        ok: false,
        status: 500,
      },
    });
    vi.stubGlobal('fetch', nonOkFetch as unknown as typeof fetch);

    await expect(loadFormpackSchema(DOCTOR_LETTER_ID)).rejects.toMatchObject({
      code: 'schema_unavailable',
    });

    clearFormpackCaches();

    const cachedSchemaFetch = buildFetchMock({
      [SCHEMA_PATH_DOCTOR]: {
        ok: true,
        json: async () => ({ type: 'object', title: 'Schema' }),
      },
    });
    vi.stubGlobal('fetch', cachedSchemaFetch as unknown as typeof fetch);

    const first = await loadFormpackSchema(DOCTOR_LETTER_ID);
    const second = await loadFormpackSchema(DOCTOR_LETTER_ID);

    expect(first).toEqual(second);
    expect(cachedSchemaFetch).toHaveBeenCalledTimes(1);
  });

  it('lists all registered formpacks', async () => {
    const fetchMock = buildFetchMock({
      [MANIFEST_PATH_DOCTOR]: {
        ok: true,
        json: async () => manifestFor(DOCTOR_LETTER_ID),
      },
      [MANIFEST_PATH_NOTFALLPASS]: {
        ok: true,
        json: async () => manifestFor(NOTFALLPASS_ID),
      },
      [MANIFEST_PATH_OFFLABEL]: {
        ok: true,
        json: async () => manifestFor(OFFLABEL_ANTRAG_ID),
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const manifests = await listFormpacks();
    expect(manifests.map((manifest) => manifest.id)).toEqual([
      DOCTOR_LETTER_ID,
      NOTFALLPASS_ID,
      OFFLABEL_ANTRAG_ID,
    ]);
  });
});
