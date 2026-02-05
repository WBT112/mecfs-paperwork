import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PdfExportButton from '../../../src/export/pdf/PdfExportButton';

const runtimeRenderSpy = vi.fn();

vi.mock('../../../src/export/pdf/PdfExportRuntime', () => {
  const MockPdfExportRuntime = ({
    onSuccess,
    onDone,
  }: {
    onSuccess?: () => void;
    onDone: () => void;
  }) => {
    useEffect(() => {
      runtimeRenderSpy();
      onSuccess?.();
      onDone();
    }, [onDone, onSuccess]);
    return <div data-testid="pdf-runtime" />;
  };

  return {
    default: MockPdfExportRuntime,
  };
});

describe('PdfExportButton', () => {
  it('builds a payload and completes the export flow', async () => {
    const buildPayload = vi.fn().mockResolvedValue({
      document: <div />,
      filename: 'export.pdf',
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
    expect(runtimeRenderSpy).toHaveBeenCalled();
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
      filename: 'export.pdf',
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
