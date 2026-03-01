import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdfExportButtonProps } from '../../../src/export/pdf/PdfExportButton';
import type { DocumentModel } from '../../../src/export/pdf/types';

let capturedProps: PdfExportButtonProps | null = null;
const FORMPACK_DOCTOR_LETTER = 'doctor-letter';
const PDF_EXPORT_BUTTON_MODULE = '../../../src/export/pdf/PdfExportButton';
const PDF_EXPORT_RUNTIME_MODULE = '../../../src/export/pdf/PdfExportRuntime';
const PDF_EXPORT_CONTROLS_MODULE = '../../../src/export/pdf/PdfExportControls';

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
        formpackId={FORMPACK_DOCTOR_LETTER}
        formData={{}}
        locale="en"
        label="Export"
        loadingLabel="Loading"
      />,
    );

    expect(capturedProps).not.toBeNull();

    const payload = await capturedProps!.buildPayload();
    const element = payload.document as ReactElement<{ model: DocumentModel }>;
    const model = element.props.model;

    expect(model.meta?.locale).toBe('en');
    expect(model.meta?.createdAtIso).toBe('2026-02-02T00:00:00.000Z');
    expect(payload.filename).toBe(`${FORMPACK_DOCTOR_LETTER}-pdf-20260202.pdf`);
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

  it('swallows preload import failures in the lazy prefetch effect', async () => {
    vi.resetModules();

    const freshCaptured: { props: PdfExportButtonProps | null } = {
      props: null,
    };

    vi.doMock(PDF_EXPORT_BUTTON_MODULE, () => ({
      default: (props: PdfExportButtonProps) => {
        freshCaptured.props = props;
        return <div data-testid="pdf-export-button-fresh" />;
      },
    }));

    vi.doMock(PDF_EXPORT_RUNTIME_MODULE, () => {
      throw new Error('runtime preload failed');
    });

    try {
      const freshModule = (await import(PDF_EXPORT_CONTROLS_MODULE)) as {
        default: typeof PdfExportControls;
      };
      const FreshPdfExportControls = freshModule.default;

      expect(() => {
        render(
          <FreshPdfExportControls
            formpackId={FORMPACK_DOCTOR_LETTER}
            formData={{}}
            locale="en"
            label="Export"
            loadingLabel="Loading"
          />,
        );
      }).not.toThrow();

      await Promise.resolve();
      await Promise.resolve();

      expect(freshCaptured.props).not.toBeNull();
    } finally {
      vi.doUnmock(PDF_EXPORT_BUTTON_MODULE);
      vi.doUnmock(PDF_EXPORT_RUNTIME_MODULE);
    }
  });
});
