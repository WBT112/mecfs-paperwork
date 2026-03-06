import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  buildErrorMessage: vi.fn(),
  loadFormpackAssets: vi.fn(),
  startUserTiming: vi.fn(),
}));

vi.mock('../../../src/pages/formpack-detail/formpackDetailHelpers', () => ({
  formpackDetailHelpers: {
    buildErrorMessage: mocked.buildErrorMessage,
    loadFormpackAssets: mocked.loadFormpackAssets,
  },
}));

vi.mock('../../../src/lib/performance/userTiming', async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import('../../../src/lib/performance/userTiming')
    >();
  return {
    ...original,
    startUserTiming: mocked.startUserTiming,
  };
});

import { useFormpackLoader } from '../../../src/pages/formpack-detail/useFormpackLoader';

const DEFAULT_FORMPACK_ID = 'doctor-letter';

describe('useFormpackLoader', () => {
  beforeEach(() => {
    mocked.buildErrorMessage.mockReset();
    mocked.loadFormpackAssets.mockReset();
    mocked.startUserTiming.mockReset();
    mocked.startUserTiming.mockReturnValue({
      end: vi.fn(),
    });
  });

  it('loads manifest assets for the active route and resets form state on id changes', async () => {
    const onFormpackChanged = vi.fn();
    mocked.loadFormpackAssets.mockResolvedValue({
      manifest: { id: DEFAULT_FORMPACK_ID, titleKey: 'title' },
      schema: { type: 'object' },
      uiSchema: {},
      errorMessage: null,
    });

    const { result } = renderHook(() =>
      useFormpackLoader({
        formpackId: DEFAULT_FORMPACK_ID,
        locale: 'de',
        onFormpackChanged,
        t: (key) => key,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.manifest).toMatchObject({ id: DEFAULT_FORMPACK_ID });
    expect(result.current.schema).toMatchObject({ type: 'object' });
    expect(result.current.uiSchema).toEqual({});
    expect(onFormpackChanged).toHaveBeenCalledOnce();
    expect(mocked.loadFormpackAssets).toHaveBeenCalledWith(
      DEFAULT_FORMPACK_ID,
      'de',
      expect.any(Function),
    );
    expect(mocked.startUserTiming).toHaveBeenCalled();
  });

  it('returns a translated missing-id error without loading assets', async () => {
    const { result } = renderHook(() =>
      useFormpackLoader({
        formpackId: undefined,
        locale: 'de',
        onFormpackChanged: vi.fn(),
        t: (key) => key,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBe('formpackMissingId');
    expect(result.current.manifest).toBeNull();
    expect(mocked.loadFormpackAssets).not.toHaveBeenCalled();
  });

  it('surfaces logical loader errors returned by the asset helper', async () => {
    mocked.loadFormpackAssets.mockResolvedValue({
      manifest: null,
      schema: null,
      uiSchema: null,
      errorMessage: 'formpackNotFound',
    });

    const { result } = renderHook(() =>
      useFormpackLoader({
        formpackId: 'missing-pack',
        locale: 'de',
        onFormpackChanged: vi.fn(),
        t: (key) => key,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBe('formpackNotFound');
    expect(result.current.manifest).toBeNull();
  });

  it('maps thrown loader errors through the shared error helper', async () => {
    mocked.loadFormpackAssets.mockRejectedValue(new Error('boom'));
    mocked.buildErrorMessage.mockReturnValue('formpackLoadError');

    const { result } = renderHook(() =>
      useFormpackLoader({
        formpackId: DEFAULT_FORMPACK_ID,
        locale: 'de',
        onFormpackChanged: vi.fn(),
        t: (key) => key,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.errorMessage).toBe('formpackLoadError');
    expect(mocked.buildErrorMessage).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Function),
    );
  });

  it('reloads assets when the refresh token changes', async () => {
    const onFormpackChanged = vi.fn();
    const t = (key: string) => key;
    mocked.loadFormpackAssets.mockResolvedValue({
      manifest: { id: DEFAULT_FORMPACK_ID, titleKey: 'title' },
      schema: { type: 'object' },
      uiSchema: {},
      errorMessage: null,
    });

    const { rerender } = renderHook(
      ({ refreshToken }) =>
        useFormpackLoader({
          formpackId: DEFAULT_FORMPACK_ID,
          locale: 'de',
          onFormpackChanged,
          refreshToken,
          t,
        }),
      {
        initialProps: { refreshToken: 0 },
      },
    );

    await waitFor(() => {
      expect(mocked.loadFormpackAssets).toHaveBeenCalled();
    });
    const initialCallCount = mocked.loadFormpackAssets.mock.calls.length;

    rerender({ refreshToken: 1 });

    await waitFor(() => {
      expect(mocked.loadFormpackAssets.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );
    });
  });

  it('ignores successful loader results that arrive after unmount', async () => {
    let resolveLoad:
      | ((value: {
          manifest: { id: string; titleKey: string };
          schema: { type: string };
          uiSchema: Record<string, never>;
          errorMessage: null;
        }) => void)
      | undefined;
    mocked.loadFormpackAssets.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve as typeof resolveLoad;
      }),
    );

    const onFormpackChanged = vi.fn();
    const { result, unmount } = renderHook(() =>
      useFormpackLoader({
        formpackId: DEFAULT_FORMPACK_ID,
        locale: 'de',
        onFormpackChanged,
        t: (key) => key,
      }),
    );

    unmount();
    resolveLoad?.({
      manifest: { id: DEFAULT_FORMPACK_ID, titleKey: 'title' },
      schema: { type: 'object' },
      uiSchema: {},
      errorMessage: null,
    });

    await waitFor(() => {
      expect(onFormpackChanged).not.toHaveBeenCalled();
    });
    expect(result.current.manifest).toBeNull();
  });

  it('ignores rejected loader results that arrive after unmount', async () => {
    let rejectLoad: ((error: Error) => void) | undefined;
    mocked.loadFormpackAssets.mockReturnValue(
      new Promise((_, reject) => {
        rejectLoad = reject as typeof rejectLoad;
      }),
    );

    const { result, unmount } = renderHook(() =>
      useFormpackLoader({
        formpackId: DEFAULT_FORMPACK_ID,
        locale: 'de',
        onFormpackChanged: vi.fn(),
        t: (key) => key,
      }),
    );

    unmount();
    rejectLoad?.(new Error('late failure'));

    await waitFor(() => {
      expect(mocked.buildErrorMessage).not.toHaveBeenCalled();
    });
    expect(result.current.errorMessage).toBeNull();
  });
});
