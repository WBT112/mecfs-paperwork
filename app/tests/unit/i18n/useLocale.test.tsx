import { useEffect } from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import i18n from '../../../src/i18n';
import { useLocale } from '../../../src/i18n/useLocale';
import { defaultLocale } from '../../../src/i18n/locale';

const renderLocaleHook = () => {
  let latest: ReturnType<typeof useLocale> | null = null;

  const TestComp = () => {
    const value = useLocale();
    useEffect(() => {
      latest = value;
    }, [value]);
    return null;
  };

  render(<TestComp />);
  return {
    getLatest: () => latest,
  };
};

describe('useLocale hook', () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    try {
      globalThis.localStorage.removeItem('mecfs-paperwork.locale');
    } catch {
      // ignore storage errors in test setup
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with i18n.language when supported', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const { getLatest } = renderLocaleHook();
    await act(async () => Promise.resolve());
    expect(getLatest()?.locale).toBe('en');
  });

  it('falls back to default locale when i18n.language unsupported', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    const { getLatest } = renderLocaleHook();
    await act(async () => Promise.resolve());
    expect(getLatest()?.locale).toBe(defaultLocale);
  });

  it('updates locale when i18n emits languageChanged', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const { getLatest } = renderLocaleHook();
    await act(async () => Promise.resolve());

    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    expect(getLatest()?.locale).toBe(defaultLocale);
  });

  it('setLocale no-ops when same as current language', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const spy = vi.spyOn(i18n, 'changeLanguage');
    const { getLatest } = renderLocaleHook();
    await act(async () => Promise.resolve());

    await act(async () => {
      await getLatest()?.setLocale('en');
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('setLocale calls changeLanguage and stores locale', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    const spy = vi.spyOn(i18n, 'changeLanguage');
    const { getLatest } = renderLocaleHook();
    await act(async () => Promise.resolve());

    await act(async () => {
      await getLatest()?.setLocale('de');
    });

    expect(spy).toHaveBeenCalledWith('de');
    expect(globalThis.localStorage.getItem('mecfs-paperwork.locale')).toBe(
      'de',
    );
    spy.mockRestore();
  });
});
