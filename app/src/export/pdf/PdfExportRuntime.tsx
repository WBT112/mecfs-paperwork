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
const FALLBACK_HARD_TIMEOUT_MS = 20_000;

const createTimeoutError = () =>
  new Error('PDF export timed out. Please try again.');
const createBlobError = () => new Error('PDF export blob generation failed.');

const toBlobWithTimeout = (pdfInstance: ReturnType<typeof pdf>) =>
  new Promise<Blob>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(
      () => reject(createTimeoutError()),
      FALLBACK_HARD_TIMEOUT_MS,
    );

    pdfInstance
      .toBlob()
      .then((blob) => {
        globalThis.clearTimeout(timeoutId);
        resolve(blob);
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error instanceof Error ? error : createBlobError());
      });
  });

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
  const completedRef = useRef(false);
  const fallbackStartedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    fallbackStartedRef.current = false;
  }, [requestKey]);

  useEffect(() => {
    const finalizeOnce = () => {
      if (completedRef.current) {
        return;
      }
      completedRef.current = true;
      onDone();
    };

    const completeWithError = (errorValue: unknown) => {
      if (completedRef.current) {
        return;
      }
      onError?.(normalizePdfExportError(errorValue));
      finalizeOnce();
    };

    const timeoutId = globalThis.setTimeout(() => {
      if (completedRef.current || fallbackStartedRef.current) {
        return;
      }

      fallbackStartedRef.current = true;

      let pdfInstance;
      try {
        pdfInstance = pdf(payload.document);
      } catch (fallbackError) {
        completeWithError(fallbackError);
        return;
      }

      toBlobWithTimeout(pdfInstance)
        .then((fallbackBlob) => {
          if (completedRef.current) {
            finalizeOnce();
            return;
          }
          try {
            downloadPdfExport({
              blob: fallbackBlob,
              filename: payload.filename,
            });
            onSuccess?.();
          } catch (downloadError) {
            onError?.(normalizePdfExportError(downloadError));
          } finally {
            finalizeOnce();
          }
        })
        .catch(completeWithError);
    }, FALLBACK_TIMEOUT_MS);

    return () => globalThis.clearTimeout(timeoutId);
  }, [
    onDone,
    onError,
    onSuccess,
    payload.document,
    payload.filename,
    requestKey,
  ]);

  useEffect(() => {
    if (completedRef.current || !error) {
      return;
    }

    onError?.(normalizePdfExportError(error));
    completedRef.current = true;
    onDone();
  }, [error, onDone, onError]);

  useEffect(() => {
    if (completedRef.current || (!blob && !url)) {
      return;
    }

    try {
      downloadPdfExport({ blob, url, filename: payload.filename });
      onSuccess?.();
    } catch (downloadError) {
      onError?.(normalizePdfExportError(downloadError));
    } finally {
      completedRef.current = true;
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
