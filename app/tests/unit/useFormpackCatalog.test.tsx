import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  listFormpacks: vi.fn(),
  filterVisibleFormpacks: vi.fn(),
  loadFormpackI18n: vi.fn(),
}));

vi.mock('../../src/formpacks/loader', () => ({
  listFormpacks: mocked.listFormpacks,
}));

vi.mock('../../src/formpacks/visibility', () => ({
  filterVisibleFormpacks: mocked.filterVisibleFormpacks,
}));

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: mocked.loadFormpackI18n,
}));

import { useFormpackCatalog } from '../../src/pages/formpack-list/useFormpackCatalog';
import type { FormpackManifest } from '../../src/formpacks/types';

const MANIFEST: FormpackManifest = {
  id: 'formpack-insurer',
  version: '1.0.0',
  defaultLocale: 'de',
  locales: ['de'],
  titleKey: 'Insurer Pack',
  descriptionKey: 'Insurer description',
  exports: ['json'],
  visibility: 'public',
};

const renderCatalog = (
  options: {
    locale?: 'de' | 'en';
    translate?: (key: string) => string;
  } = {},
) =>
  renderHook(() =>
    useFormpackCatalog({
      locale: options.locale ?? 'de',
      translate: options.translate ?? ((key: string) => key),
    }),
  );

const waitForCatalog = async (
  result: {
    current: {
      isLoading: boolean;
      isI18nReady: boolean;
    };
  },
  expectedReady: boolean,
) => {
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isI18nReady).toBe(expectedReady);
  });
};

describe('useFormpackCatalog', () => {
  beforeEach(() => {
    mocked.listFormpacks.mockReset();
    mocked.filterVisibleFormpacks.mockReset();
    mocked.loadFormpackI18n.mockReset();
    mocked.filterVisibleFormpacks.mockImplementation(
      (items: FormpackManifest[]) => items,
    );
  });

  it('loads visible manifests and translation namespaces', async () => {
    mocked.listFormpacks.mockResolvedValue([MANIFEST]);
    mocked.loadFormpackI18n.mockResolvedValue(undefined);

    const { result } = renderCatalog();

    await waitForCatalog(result, true);

    expect(result.current.manifests).toEqual([MANIFEST]);
    expect(result.current.errorMessage).toBeNull();
    expect(mocked.filterVisibleFormpacks).toHaveBeenCalledWith([MANIFEST]);
    expect(mocked.loadFormpackI18n).toHaveBeenCalledWith(MANIFEST.id, 'de');
  });

  it('surfaces the translated fallback when manifest loading fails', async () => {
    mocked.listFormpacks.mockRejectedValue(new Error('boom'));

    const { result } = renderCatalog();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBe('formpackListErrorFallback');
    expect(result.current.manifests).toEqual([]);
    expect(mocked.loadFormpackI18n).not.toHaveBeenCalled();
  });

  it('marks i18n as ready immediately when no visible manifests remain', async () => {
    mocked.listFormpacks.mockResolvedValue([MANIFEST]);
    mocked.filterVisibleFormpacks.mockReturnValue([]);

    const { result } = renderCatalog();

    await waitForCatalog(result, true);

    expect(result.current.manifests).toEqual([]);
    expect(mocked.loadFormpackI18n).not.toHaveBeenCalled();
  });

  it('ignores late translation completion after unmount', async () => {
    let resolveTranslations: (() => void) | undefined;
    mocked.listFormpacks.mockResolvedValue([MANIFEST]);
    mocked.loadFormpackI18n.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveTranslations = resolve;
      }),
    );

    const { result, unmount } = renderCatalog();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isI18nReady).toBe(false);
    });

    unmount();
    resolveTranslations?.();

    await waitFor(() => {
      expect(mocked.loadFormpackI18n).toHaveBeenCalledWith(MANIFEST.id, 'de');
    });
  });

  it('swallows translation namespace loading failures', async () => {
    mocked.listFormpacks.mockResolvedValue([MANIFEST]);
    mocked.loadFormpackI18n.mockRejectedValue(new Error('i18n failed'));

    const { result } = renderCatalog();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.manifests).toEqual([MANIFEST]);
    expect(result.current.isI18nReady).toBe(false);
  });

  it('swallows fallback translation errors during manifest loading failures', async () => {
    mocked.listFormpacks.mockRejectedValue(new Error('boom'));

    const { result } = renderCatalog({
      translate: () => {
        throw new Error('translate failed');
      },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.manifests).toEqual([]);
  });
});
