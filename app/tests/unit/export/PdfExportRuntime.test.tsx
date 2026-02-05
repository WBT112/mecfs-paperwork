import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdfExportPayload } from '../../../src/export/pdf/PdfExportButton';

const runtimeMocks = vi.hoisted(() => ({
  blobProviderState: {
    blob: null as Blob | null,
    url: null as string | null,
    loading: false,
    error: null as Error | null,
  },
  pdfToBlob: vi.fn(),
  pdfMock: vi.fn(),
  downloadPdfExport: vi.fn(),
}));

vi.mock('@react-pdf/renderer', () => ({
  BlobProvider: ({
    children,
  }: {
    children: (state: typeof runtimeMocks.blobProviderState) => ReactNode;
  }) => <>{children(runtimeMocks.blobProviderState)}</>,
  pdf: (...args: unknown[]) => runtimeMocks.pdfMock(...args),
}));

vi.mock('../../../src/export/pdf/download', () => ({
  downloadPdfExport: runtimeMocks.downloadPdfExport,
}));

import PdfExportRuntime from '../../../src/export/pdf/PdfExportRuntime';

const payload: PdfExportPayload = {
  document: <div />,
  filename: 'export.pdf',
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
      url: 'blob:ready',
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
        url: 'blob:ready',
        filename: 'export.pdf',
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('reports download errors', async () => {
    runtimeMocks.blobProviderState = {
      blob: null,
      url: 'blob:ready',
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
      new Blob(['pdf'], { type: 'application/pdf' }),
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

    expect(runtimeMocks.downloadPdfExport).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: 'export.pdf',
    });
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
});
