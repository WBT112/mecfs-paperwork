import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PdfExportButton from '../../../src/export/pdf/PdfExportButton';

const pdfToBlobSpy = vi
  .fn()
  .mockResolvedValue(new Blob(['test'], { type: 'application/pdf' }));
const pdfSpy = vi.fn().mockReturnValue({ toBlob: pdfToBlobSpy });
const downloadPdfExportSpy = vi.fn();

vi.mock('@react-pdf/renderer', () => ({
  pdf: (doc: unknown) => pdfSpy(doc) as unknown,
}));

vi.mock('../../../src/export/pdf/download', () => ({
  downloadPdfExport: (opts: unknown) => downloadPdfExportSpy(opts) as unknown,
}));

const EXPORT_FILENAME = 'export.pdf';

describe('PdfExportButton', () => {
  it('builds a payload and completes the export flow', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: EXPORT_FILENAME,
    });
    const onSuccess = vi.fn();

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label="Export"
        loadingLabel="Loading"
        onSuccess={onSuccess}
      />,
    );

    const button = screen.getByRole('button', { name: 'Export' });
    await userEvent.click(button);

    await waitFor(() => expect(buildPayload).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    expect(pdfSpy).toHaveBeenCalled();
    expect(pdfToBlobSpy).toHaveBeenCalled();
    expect(downloadPdfExportSpy).toHaveBeenCalledWith(
      expect.objectContaining({ filename: EXPORT_FILENAME }),
    );
  });

  it('surfaces build errors', async () => {
    const buildPayload = vi.fn().mockRejectedValue(new Error('payload failed'));
    const onError = vi.fn();

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label="Export"
        loadingLabel="Loading"
        onError={onError}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'payload failed' }),
      ),
    );
  });

  it('ignores clicks when disabled', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: EXPORT_FILENAME,
    });

    render(
      <PdfExportButton
        buildPayload={buildPayload}
        label="Export"
        loadingLabel="Loading"
        disabled
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(buildPayload).not.toHaveBeenCalled();
  });
});
