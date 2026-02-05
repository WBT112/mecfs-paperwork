import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { normalizePdfExportError } from './errors';

export type PdfExportPayload = {
  document: ReactElement<DocumentProps>;
  filename: string;
};

export type PdfExportButtonProps = {
  buildPayload: () => Promise<PdfExportPayload>;
  label: string;
  loadingLabel: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

const PdfExportButton = ({
  buildPayload,
  label,
  loadingLabel,
  disabled = false,
  onSuccess,
  onError,
}: PdfExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const payload = await buildPayload();

      const [rendererModule, { downloadPdfExport }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./download'),
      ]);

      const blob = await rendererModule.pdf(payload.document).toBlob();

      if (isMountedRef.current) {
        downloadPdfExport({ blob, filename: payload.filename });
        onSuccess?.();
      }
    } catch (error) {
      if (isMountedRef.current) {
        onError?.(normalizePdfExportError(error));
      }
    } finally {
      if (isMountedRef.current) {
        setIsExporting(false);
      }
    }
  }, [buildPayload, disabled, isExporting, onError, onSuccess]);

  const buttonLabel = isExporting ? loadingLabel : label;

  return (
    <button
      type="button"
      className="app__button"
      onClick={handleClick}
      disabled={disabled || isExporting}
    >
      {buttonLabel}
    </button>
  );
};

export default PdfExportButton;
