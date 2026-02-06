import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFormpackI18n } from '../../../src/i18n/formpack';
import { defaultLocale } from '../../../src/i18n/locale';

const i18nMocks = vi.hoisted(() => ({
  hasResourceBundle: vi.fn(),
  addResourceBundle: vi.fn(),
}));

vi.mock('../../../src/i18n/index', () => ({
  default: i18nMocks,
}));

const createResponse = (ok: boolean, payload: Record<string, string>) => ({
  ok,
  json: async () => payload,
});

const formpackId = 'doctor-letter';
const localeDe = 'de';
const localeEn = 'en';
const namespace = `formpack:${formpackId}`;
const i18nBasePath = `/formpacks/${formpackId}/i18n`;

describe('loadFormpackI18n', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('skips fetching when the bundle is already loaded', async () => {
    i18nMocks.hasResourceBundle.mockReturnValue(true);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await loadFormpackI18n(formpackId, localeDe);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(i18nMocks.addResourceBundle).not.toHaveBeenCalled();
  });

  it('loads translations for the requested locale', async () => {
    i18nMocks.hasResourceBundle.mockReturnValue(false);
    const payload = { hello: 'world' };
    const fetchSpy = vi.fn().mockResolvedValue(createResponse(true, payload));
    vi.stubGlobal('fetch', fetchSpy);

    await loadFormpackI18n(formpackId, localeDe);

    expect(fetchSpy).toHaveBeenCalledWith(`${i18nBasePath}/${localeDe}.json`);
    expect(i18nMocks.addResourceBundle).toHaveBeenCalledTimes(1);
    expect(i18nMocks.addResourceBundle).toHaveBeenCalledWith(
      localeDe,
      namespace,
      payload,
      true,
      true,
    );
  });

  it('falls back to the default locale and registers both bundles', async () => {
    i18nMocks.hasResourceBundle.mockReturnValue(false);
    const payload = { fallback: 'ok' };
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(createResponse(false, {}))
      .mockResolvedValueOnce(createResponse(true, payload));
    vi.stubGlobal('fetch', fetchSpy);

    await loadFormpackI18n(formpackId, localeEn);

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      `${i18nBasePath}/${localeEn}.json`,
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      `${i18nBasePath}/${defaultLocale}.json`,
    );
    expect(i18nMocks.addResourceBundle).toHaveBeenCalledTimes(2);
    expect(i18nMocks.addResourceBundle).toHaveBeenCalledWith(
      localeEn,
      namespace,
      payload,
      true,
      true,
    );
    expect(i18nMocks.addResourceBundle).toHaveBeenCalledWith(
      defaultLocale,
      namespace,
      payload,
      true,
      true,
    );
  });

  it('handles missing translations without registering resources', async () => {
    i18nMocks.hasResourceBundle.mockReturnValue(false);
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(createResponse(false, {}))
      .mockResolvedValueOnce(createResponse(false, {}));
    vi.stubGlobal('fetch', fetchSpy);

    await loadFormpackI18n(formpackId, localeDe);

    expect(i18nMocks.addResourceBundle).not.toHaveBeenCalled();
  });
});
