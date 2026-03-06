import { BlobProvider, pdf } from '@react-pdf/renderer';
import { useCallback, useEffect, useRef } from 'react';
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
  const softTimeoutElapsedRef = useRef(false);
  const providerStateRef = useRef({
    blob,
    url,
    loading,
    error,
  });

  providerStateRef.current = { blob, url, loading, error };

  useEffect(() => {
    completedRef.current = false;
    fallbackStartedRef.current = false;
    softTimeoutElapsedRef.current = false;
  }, [requestKey]);

  const finalizeOnce = useCallback(() => {
    completedRef.current = true;
    onDone();
  }, [onDone]);

  const completeWithError = useCallback(
    (errorValue: unknown) => {
      if (completedRef.current) {
        return;
      }
      onError?.(normalizePdfExportError(errorValue));
      finalizeOnce();
    },
    [finalizeOnce, onError],
  );

  const runFallback = useCallback(() => {
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
  }, [
    completeWithError,
    finalizeOnce,
    onError,
    onSuccess,
    payload.document,
    payload.filename,
  ]);

  useEffect(() => {
    const softTimeoutId = globalThis.setTimeout(() => {
      softTimeoutElapsedRef.current = true;
      const state = providerStateRef.current;
      if (!state.loading && !state.blob && !state.url && !state.error) {
        runFallback();
      }
    }, FALLBACK_TIMEOUT_MS);

    const hardTimeoutId = globalThis.setTimeout(() => {
      const state = providerStateRef.current;
      if (!state.blob && !state.url && !state.error) {
        runFallback();
      }
    }, FALLBACK_HARD_TIMEOUT_MS);

    return () => {
      globalThis.clearTimeout(softTimeoutId);
      globalThis.clearTimeout(hardTimeoutId);
    };
  }, [requestKey, runFallback]);

  useEffect(() => {
    if (
      completedRef.current ||
      fallbackStartedRef.current ||
      !softTimeoutElapsedRef.current ||
      loading ||
      blob ||
      url ||
      error
    ) {
      return;
    }

    runFallback();
  }, [blob, error, loading, runFallback, url]);

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
      finalizeOnce();
    }
  }, [blob, finalizeOnce, loading, onError, onSuccess, payload.filename, url]);

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
