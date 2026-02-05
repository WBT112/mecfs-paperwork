import { BlobProvider, pdf } from '@react-pdf/renderer';
import { useEffect, useRef } from 'react';
import type { PdfExportPayload } from './PdfExportButton';
import { downloadPdfExport } from './download';
import { normalizePdfExportError } from './errors';

export type PdfExportRuntimeProps = {
  payload: PdfExportPayload;
  requestKey: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onDone: () => void;
};

type DownloadHandlerProps = {
  blob: Blob | null;
  url: string | null;
  loading: boolean;
  error: Error | null;
  payload: PdfExportPayload;
  requestKey: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onDone: () => void;
};

const FALLBACK_TIMEOUT_MS = 4_000;

const PdfExportDownloadHandler = ({
  blob,
  url,
  loading,
  error,
  payload,
  requestKey,
  onSuccess,
  onError,
  onDone,
}: DownloadHandlerProps) => {
  const handledRef = useRef(false);

  useEffect(() => {
    handledRef.current = false;
  }, [requestKey]);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (handledRef.current) {
        return;
      }

      handledRef.current = true;

      let pdfInstance;
      try {
        pdfInstance = pdf(payload.document);
      } catch (fallbackError) {
        onError?.(normalizePdfExportError(fallbackError));
        onDone();
        return;
      }

      pdfInstance
        .toBlob()
        .then((fallbackBlob) => {
          downloadPdfExport({ blob: fallbackBlob, filename: payload.filename });
          onSuccess?.();
        })
        .catch((fallbackError) => {
          onError?.(normalizePdfExportError(fallbackError));
        })
        .finally(onDone);
    }, FALLBACK_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    onDone,
    onError,
    onSuccess,
    payload.document,
    payload.filename,
    requestKey,
  ]);

  useEffect(() => {
    if (handledRef.current || !error) {
      return;
    }

    handledRef.current = true;
    onError?.(normalizePdfExportError(error));
    onDone();
  }, [error, onDone, onError]);

  useEffect(() => {
    if (handledRef.current || (!blob && !url)) {
      return;
    }

    handledRef.current = true;

    try {
      downloadPdfExport({ blob, url, filename: payload.filename });
      onSuccess?.();
    } catch (downloadError) {
      onError?.(normalizePdfExportError(downloadError));
    } finally {
      onDone();
    }
  }, [blob, loading, onDone, onError, onSuccess, payload.filename, url]);

  return null;
};

const PdfExportRuntime = ({
  payload,
  requestKey,
  onSuccess,
  onError,
  onDone,
}: PdfExportRuntimeProps) => (
  <BlobProvider document={payload.document}>
    {({ blob, url, loading, error }) => (
      <PdfExportDownloadHandler
        blob={blob}
        url={url}
        loading={loading}
        error={error}
        payload={payload}
        requestKey={requestKey}
        onSuccess={onSuccess}
        onError={onError}
        onDone={onDone}
      />
    )}
  </BlobProvider>
);

export default PdfExportRuntime;
