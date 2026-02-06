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
    globalThis.requestAnimationFrame = rafSpy;
    globalThis.cancelAnimationFrame = cancelSpy;
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
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
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
    expect(props.requestKey).toMatch(/^[0-9a-f]{32}$/i);

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
    expect(props.requestKey).toBe('12345');

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
});
