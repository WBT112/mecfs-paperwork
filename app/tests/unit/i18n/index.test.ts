import { afterEach, describe, expect, it, vi } from 'vitest';

const i18nextState = vi.hoisted(() => ({
  use: vi.fn(),
  init: vi.fn(),
}));

const reactI18nextState = vi.hoisted(() => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const localeState = vi.hoisted(() => ({
  getStoredLocale: vi.fn(),
}));

vi.mock('i18next', () => ({
  default: {
    use: i18nextState.use,
    init: i18nextState.init,
  },
}));

vi.mock('react-i18next', () => reactI18nextState);

vi.mock('../../../src/i18n/resources/de.json', () => ({
  default: { appTitle: 'Titel' },
}));

vi.mock('../../../src/i18n/resources/en.json', () => ({
  default: { appTitle: 'Title' },
}));

vi.mock('../../../src/i18n/locale', () => ({
  defaultLocale: 'de',
  fallbackLocale: 'en',
  supportedLocales: ['de', 'en'],
  getStoredLocale: localeState.getStoredLocale,
}));

describe('i18n initialization', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('binds react to i18n store updates so dynamic bundles rerender', async () => {
    i18nextState.use.mockReturnValue({
      init: i18nextState.init,
    });
    i18nextState.init.mockResolvedValue(undefined);
    localeState.getStoredLocale.mockReturnValue('en');

    await import('../../../src/i18n/index');

    expect(i18nextState.use).toHaveBeenCalledWith(
      reactI18nextState.initReactI18next,
    );
    expect(i18nextState.init).toHaveBeenCalledWith(
      expect.objectContaining({
        lng: 'en',
        react: {
          bindI18nStore: 'added removed',
        },
      }),
    );
  });

  it('keeps module import stable when i18n init fails', async () => {
    i18nextState.use.mockReturnValue({
      init: i18nextState.init,
    });
    i18nextState.init.mockRejectedValue(new Error('init failed'));
    localeState.getStoredLocale.mockReturnValue('de');

    await expect(import('../../../src/i18n/index')).resolves.toBeDefined();
  });
});
