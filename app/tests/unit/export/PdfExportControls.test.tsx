import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdfExportButtonProps } from '../../../src/export/pdf/PdfExportButton';

let capturedProps: PdfExportButtonProps | null = null;

vi.mock('../../../src/export/pdf/PdfExportButton', () => ({
  default: (props: PdfExportButtonProps) => {
    capturedProps = props;
    return <div data-testid="pdf-export-button" />;
  },
}));

import PdfExportControls from '../../../src/export/pdf/PdfExportControls';

describe('PdfExportControls', () => {
  beforeEach(() => {
    capturedProps = null;
    vi.useRealTimers();
  });

  it('builds a payload via the configured model builder', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T00:00:00.000Z'));

    render(
      <PdfExportControls
        formpackId="doctor-letter"
        formData={{}}
        locale="en"
        label="Export"
        loadingLabel="Loading"
      />,
    );

    expect(capturedProps).not.toBeNull();

    const payload = await capturedProps!.buildPayload();

    expect(payload.document.props.model.meta?.locale).toBe('en');
    expect(payload.document.props.model.meta?.createdAtIso).toBe(
      '2026-02-02T00:00:00.000Z',
    );
    expect(payload.filename).toBe('doctor-letter-pdf-20260202.pdf');
  });

  it('throws when no PDF config is available', async () => {
    render(
      <PdfExportControls
        formpackId="unknown"
        formData={{}}
        locale="en"
        label="Export"
        loadingLabel="Loading"
      />,
    );

    expect(capturedProps).not.toBeNull();

    await expect(capturedProps!.buildPayload()).rejects.toThrow(
      'PDF export is not configured for this formpack.',
    );
  });
});
