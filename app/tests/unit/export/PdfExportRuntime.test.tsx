import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdfExportPayload } from '../../../src/export/pdf/PdfExportButton';

type PdfInstance = {
  toBlob: () => Promise<Blob>;
};

type PdfFactory = (...args: unknown[]) => PdfInstance;
type DownloadOptions = {
  blob?: Blob | null;
  url?: string | null;
  filename: string;
};
type PdfToBlobFactory = () => Promise<Blob>;
type DownloadHandler = (options: DownloadOptions) => void;

const readyUrl = 'blob:ready';
const exportFilename = 'export.pdf';
const pdfMimeType = 'application/pdf';

const runtimeMocks = vi.hoisted(() => ({
  blobProviderState: {
    blob: null as Blob | null,
    url: null as string | null,
    loading: false,
    error: null as Error | null,
  },
  pdfToBlob: vi.fn<PdfToBlobFactory>(),
  pdfMock: vi.fn<PdfFactory>(),
  downloadPdfExport: vi.fn<DownloadHandler>(),
}));

vi.mock('@react-pdf/renderer', () => ({
  BlobProvider: ({
    children,
  }: {
    children: (state: typeof runtimeMocks.blobProviderState) => ReactNode;
  }) => <>{children(runtimeMocks.blobProviderState)}</>,
  pdf: (...args: Parameters<PdfFactory>) => runtimeMocks.pdfMock(...args),
}));

vi.mock('../../../src/export/pdf/download', () => ({
  downloadPdfExport: runtimeMocks.downloadPdfExport,
}));

import PdfExportRuntime from '../../../src/export/pdf/PdfExportRuntime';

const payload: PdfExportPayload = {
  document: <div />,
  filename: exportFilename,
};

describe('PdfExportRuntime', () => {
  beforeEach(() => {
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: false,
      error: null,
    };
    runtimeMocks.downloadPdfExport.mockReset();
    runtimeMocks.pdfMock.mockReset();
    runtimeMocks.pdfMock.mockImplementation(() => ({
      toBlob: runtimeMocks.pdfToBlob,
    }));
    runtimeMocks.pdfToBlob.mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads immediately when a url is available', async () => {
    runtimeMocks.blobProviderState = {
      blob: null,
      url: readyUrl,
      loading: false,
      error: null,
    };

    const onSuccess = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="a"
        onSuccess={onSuccess}
        onDone={onDone}
      />,
    );

    await waitFor(() =>
      expect(runtimeMocks.downloadPdfExport).toHaveBeenCalledWith({
        blob: null,
        url: readyUrl,
        filename: exportFilename,
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports download errors', async () => {
    runtimeMocks.blobProviderState = {
      blob: null,
      url: readyUrl,
      loading: false,
      error: null,
    };
    runtimeMocks.downloadPdfExport.mockImplementation(() => {
      throw new Error('download failed');
    });

    const onError = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="b"
        onError={onError}
        onDone={onDone}
      />,
    );

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'download failed' }),
      ),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports provider errors', async () => {
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: false,
      error: new Error('provider failed'),
    };

    const onError = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="c"
        onError={onError}
        onDone={onDone}
      />,
    );

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'provider failed' }),
      ),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('falls back to pdf().toBlob when no url is available', async () => {
    vi.useFakeTimers();
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: true,
      error: null,
    };
    runtimeMocks.pdfToBlob.mockResolvedValue(
      new Blob(['pdf'], { type: pdfMimeType }),
    );

    const onSuccess = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="d"
        onSuccess={onSuccess}
        onDone={onDone}
      />,
    );

    await vi.advanceTimersByTimeAsync(4_000);
    await Promise.resolve();

    expect(runtimeMocks.downloadPdfExport).toHaveBeenCalled();
    const [options] = runtimeMocks.downloadPdfExport.mock.calls[0];
    expect(options.filename).toBe(exportFilename);
    expect(options.blob).toBeInstanceOf(Blob);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports fallback errors when pdf generation fails', async () => {
    vi.useFakeTimers();
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: true,
      error: null,
    };
    runtimeMocks.pdfMock.mockImplementation(() => {
      throw new Error('pdf failed');
    });

    const onError = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="e"
        onError={onError}
        onDone={onDone}
      />,
    );

    await vi.advanceTimersByTimeAsync(4_000);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'pdf failed' }),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('downloads immediately when only a blob is available', async () => {
    const readyBlob = new Blob(['pdf'], { type: pdfMimeType });
    runtimeMocks.blobProviderState = {
      blob: readyBlob,
      url: null,
      loading: false,
      error: null,
    };

    const onSuccess = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="f"
        onSuccess={onSuccess}
        onDone={onDone}
      />,
    );

    await waitFor(() =>
      expect(runtimeMocks.downloadPdfExport).toHaveBeenCalledWith({
        blob: readyBlob,
        url: null,
        filename: exportFilename,
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('normalizes fallback blob errors when pdf().toBlob rejects with non-error', async () => {
    vi.useFakeTimers();
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: true,
      error: null,
    };
    runtimeMocks.pdfToBlob.mockRejectedValue('blob failed');

    const onError = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="g"
        onError={onError}
        onDone={onDone}
      />,
    );

    await vi.advanceTimersByTimeAsync(4_000);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'PDF export blob generation failed.',
      }),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports timeout when fallback blob generation never resolves', async () => {
    vi.useFakeTimers();
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: true,
      error: null,
    };
    runtimeMocks.pdfToBlob.mockImplementation(
      () => new Promise<Blob>(() => undefined),
    );

    const onError = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="h"
        onError={onError}
        onDone={onDone}
      />,
    );

    await vi.advanceTimersByTimeAsync(24_000);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'PDF export timed out. Please try again.',
      }),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports fallback download errors and still finalizes', async () => {
    vi.useFakeTimers();
    runtimeMocks.blobProviderState = {
      blob: null,
      url: null,
      loading: true,
      error: null,
    };
    runtimeMocks.pdfToBlob.mockResolvedValue(
      new Blob(['pdf'], { type: pdfMimeType }),
    );
    runtimeMocks.downloadPdfExport.mockImplementation(() => {
      throw new Error('fallback download failed');
    });

    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onDone = vi.fn();

    render(
      <PdfExportRuntime
        payload={payload}
        requestKey="i"
        onSuccess={onSuccess}
        onError={onError}
        onDone={onDone}
      />,
    );

    await vi.advanceTimersByTimeAsync(4_000);
    await Promise.resolve();

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'fallback download failed' }),
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
