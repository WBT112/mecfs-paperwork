import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PdfExportButton, {
  type PdfExportPayload,
} from '../../../src/export/pdf/PdfExportButton';

const runtimeRenderSpy = vi.fn();
const exportLabel = 'Export';
const loadingLabel = 'Loading';
const pdfFilename = 'export.pdf';
const setGlobalCrypto = (value: Crypto | undefined) => {
  Object.defineProperty(globalThis, 'crypto', {
    value,
    configurable: true,
  });
};

vi.mock('../../../src/export/pdf/PdfExportRuntime', () => {
  const MockPdfExportRuntime = ({
    onSuccess,
    onDone,
    ...props
  }: {
    onSuccess?: () => void;
    onDone: () => void;
  }) => {
    useEffect(() => {
      runtimeRenderSpy(props);
      onSuccess?.();
      onDone();
    }, [onDone, onSuccess, props]);
    return <div data-testid="pdf-runtime" />;
  };

  return {
    default: MockPdfExportRuntime,
  };
});

describe('PdfExportButton', () => {
  afterEach(() => {
    runtimeRenderSpy.mockReset();
  });

  const renderAndGetRequestKey = async (
    buildPayload: () => Promise<PdfExportPayload>,
  ) => {
    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: exportLabel }));
    await waitFor(() => expect(runtimeRenderSpy).toHaveBeenCalled());
    const props = runtimeRenderSpy.mock.calls[0][0] as {
      requestKey?: string;
    };
    return props.requestKey;
  };

  it('builds a payload and completes the export flow', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });
    const onSuccess = vi.fn();

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
        onSuccess={onSuccess}
      />,
    );

    const button = screen.getByRole('button', { name: exportLabel });
    await userEvent.click(button);

    await waitFor(() => expect(buildPayload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(runtimeRenderSpy).toHaveBeenCalled();
  });

  it('reuses the runtime component on subsequent exports', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
      />,
    );

    const button = screen.getByRole('button', { name: exportLabel });
    await userEvent.click(button);
    await waitFor(() => expect(runtimeRenderSpy).toHaveBeenCalledTimes(1));

    await userEvent.click(button);
    await waitFor(() => expect(runtimeRenderSpy).toHaveBeenCalledTimes(2));
    expect(buildPayload).toHaveBeenCalledTimes(2);
  });

  it('surfaces build errors', async () => {
    const buildPayload = vi.fn().mockRejectedValue(new Error('payload failed'));
    const onError = vi.fn();

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
        onError={onError}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: exportLabel }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'payload failed' }),
      ),
    );
  });

  it('times out when building the payload stalls', async () => {
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>(() => {
          // Intentionally unresolved to trigger timeout.
        }),
    );
    const onError = vi.fn();

    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const rafSpy = vi.fn(() => 1);
    const cancelSpy = vi.fn();
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      value: rafSpy,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      value: cancelSpy,
      configurable: true,
      writable: true,
    });
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((handler, timeout, ...args) => {
        if (timeout === 20_000) {
          if (typeof handler === 'function') {
            handler(...args);
          }
          return originalSetTimeout(() => undefined, 0);
        }
        return originalSetTimeout(handler, timeout, ...args);
      });

    try {
      render(
        <PdfExportButton
          buildPayload={buildPayload}
          label={exportLabel}
          loadingLabel={loadingLabel}
          onError={onError}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: exportLabel }));
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'PDF export timed out while preparing the document.',
        }),
      );
      expect(cancelSpy).toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        value: originalRaf,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'cancelAnimationFrame', {
        value: originalCancel,
        configurable: true,
        writable: true,
      });
    }
  });

  it('uses crypto.getRandomValues when randomUUID is unavailable', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });
    const originalCrypto = globalThis.crypto;
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      return bytes;
    });
    setGlobalCrypto({ getRandomValues } as unknown as Crypto);

    const requestKey = await renderAndGetRequestKey(buildPayload);
    expect(requestKey).toMatch(/^[0-9a-f]{32}$/i);

    setGlobalCrypto(originalCrypto);
  });

  it('falls back to Date.now when crypto is unavailable', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });
    const originalCrypto = globalThis.crypto;
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(12345);
    setGlobalCrypto(undefined);
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      value: undefined,
      configurable: true,
    });

    const requestKey = await renderAndGetRequestKey(buildPayload);
    expect(requestKey).toBe('12345');

    setGlobalCrypto(originalCrypto);
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      value: originalRaf,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      value: originalCancel,
      configurable: true,
    });
    dateSpy.mockRestore();
  });

  it('ignores clicks when disabled', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
        disabled
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: exportLabel }));

    expect(buildPayload).not.toHaveBeenCalled();
  });

  it('bails out in the click handler when disabled and events are dispatched programmatically', () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
        disabled
      />,
    );

    const button = screen.getByRole('button', { name: exportLabel });
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(buildPayload).not.toHaveBeenCalled();
  });

  it('ignores repeated clicks while an export is already running', async () => {
    let resolvePayload: ((payload: PdfExportPayload) => void) | null = null;
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>((resolve) => {
          resolvePayload = resolve;
        }),
    );

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
      />,
    );

    const button = screen.getByRole('button', { name: exportLabel });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(buildPayload).toHaveBeenCalledTimes(1);

    resolvePayload!({ document: <div />, filename: pdfFilename });
    await waitFor(() => expect(runtimeRenderSpy).toHaveBeenCalledTimes(1));
  });

  it('times out long-running export requests and resets state', async () => {
    const onError = vi.fn();
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>(() => {
          // Intentionally unresolved to trigger request timeout.
        }),
    );

    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((handler, timeout, ...args) => {
        if (timeout === 25_000 && typeof handler === 'function') {
          handler(...args);
          return originalSetTimeout(() => undefined, 0);
        }
        return originalSetTimeout(handler, timeout, ...args);
      });

    try {
      render(
        <PdfExportButton
          buildPayload={buildPayload}
          label={exportLabel}
          loadingLabel={loadingLabel}
          onError={onError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: exportLabel }));

      await waitFor(() =>
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'PDF export timed out. Please try again.',
          }),
        ),
      );
      expect(screen.getByRole('button', { name: exportLabel })).toBeEnabled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });

  it('does not update state or call handlers after unmount', async () => {
    let rejectPayload: ((error?: unknown) => void) | null = null;
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>((_, reject) => {
          rejectPayload = reject;
        }),
    );
    const onError = vi.fn();

    const view = render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: exportLabel }));
    view.unmount();

    rejectPayload!(new Error('late failure'));
    await Promise.resolve();

    expect(onError).not.toHaveBeenCalled();
  });

  it('supports requestAnimationFrame-based timeout progression', async () => {
    const onError = vi.fn();
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>(() => {
          // Keep pending so RAF timeout path decides the outcome.
        }),
    );

    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    const cancelSpy = vi.fn();
    globalThis.requestAnimationFrame = rafSpy;
    globalThis.cancelAnimationFrame = cancelSpy;
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => 0);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((handler, timeout, ...args) => {
        if (timeout === 20_000 || timeout === 25_000) {
          return 1 as unknown as ReturnType<typeof setTimeout>;
        }
        return originalSetTimeout(handler, timeout, ...args);
      });

    try {
      render(
        <PdfExportButton
          buildPayload={buildPayload}
          label={exportLabel}
          loadingLabel={loadingLabel}
          onError={onError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: exportLabel }));

      await waitFor(() => expect(rafCallbacks.length).toBeGreaterThan(0));
      const firstTick = rafCallbacks.shift();
      const secondTickPromise = Promise.resolve().then(() =>
        rafCallbacks.shift(),
      );
      firstTick?.(1);
      const secondTick = await secondTickPromise;
      secondTick?.(20_001);

      await waitFor(() =>
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'PDF export timed out while preparing the document.',
          }),
        ),
      );
      expect(cancelSpy).toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      nowSpy.mockRestore();
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });

  it('ignores stale requestAnimationFrame ticks after timeout cancellation', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: pdfFilename,
    });

    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    const cancelSpy = vi.fn();

    globalThis.requestAnimationFrame = rafSpy;
    globalThis.cancelAnimationFrame = cancelSpy;

    try {
      render(
        <PdfExportButton
          buildPayload={buildPayload}
          label={exportLabel}
          loadingLabel={loadingLabel}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: exportLabel }));
      await waitFor(() => expect(runtimeRenderSpy).toHaveBeenCalled());

      expect(rafCallbacks.length).toBeGreaterThan(0);
      const firstTick = rafCallbacks[0];
      const rafCallsBeforeTick = rafSpy.mock.calls.length;
      firstTick(1);

      expect(rafSpy.mock.calls.length).toBe(rafCallsBeforeTick);
      expect(cancelSpy).toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });

  it('does not update request state when unmounted before payload resolution', async () => {
    let resolvePayload: ((payload: PdfExportPayload) => void) | null = null;
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>((resolve) => {
          resolvePayload = resolve;
        }),
    );

    const view = render(
      <PdfExportButton
        buildPayload={buildPayload}
        label={exportLabel}
        loadingLabel={loadingLabel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: exportLabel }));
    view.unmount();

    resolvePayload!({ document: <div />, filename: pdfFilename });
    await Promise.resolve();

    expect(runtimeRenderSpy).not.toHaveBeenCalled();
  });

  it('stops request-timeout callbacks after unmount', async () => {
    let requestTimeoutHandler: (() => void) | null = null;
    const onError = vi.fn();
    const buildPayload = vi.fn(
      () =>
        new Promise<PdfExportPayload>(() => {
          // Keep pending until timeout callback fires.
        }),
    );
    const originalSetTimeout = globalThis.setTimeout.bind(globalThis);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((handler, timeout, ...args) => {
        if (timeout === 25_000 && typeof handler === 'function') {
          requestTimeoutHandler = () => {
            handler(...args);
          };
          return 1 as unknown as ReturnType<typeof setTimeout>;
        }
        return originalSetTimeout(handler, timeout, ...args);
      });

    try {
      const view = render(
        <PdfExportButton
          buildPayload={buildPayload}
          label={exportLabel}
          loadingLabel={loadingLabel}
          onError={onError}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: exportLabel }));
      view.unmount();
      requestTimeoutHandler!();

      expect(onError).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  });
});
