import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { normalizePdfExportError } from './errors';
import type { PdfExportRuntimeProps } from './PdfExportRuntime';

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

type RequestState = {
  payload: PdfExportPayload;
  key: string;
};

const BUILD_TIMEOUT_MS = 20_000;
const REQUEST_TIMEOUT_MS = 25_000;

const createTimeoutError = (message: string) => new Error(message);

const startTimeout = (
  timeoutMs: number,
  onTimeout: () => void,
): (() => void) => {
  let done = false;
  let rafId: number | null = null;

  const fire = () => {
    if (done) {
      return;
    }
    done = true;
    onTimeout();
  };

  const timeoutId = window.setTimeout(fire, timeoutMs);

  if (typeof window.requestAnimationFrame === 'function') {
    const start = performance.now();
    const tick = (now: number) => {
      if (done) {
        return;
      }
      if (now - start >= timeoutMs) {
        fire();
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
  }

  return () => {
    done = true;
    window.clearTimeout(timeoutId);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
  };
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let cancelTimeout: () => void = () => undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    cancelTimeout = startTimeout(timeoutMs, () =>
      reject(createTimeoutError(message)),
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    cancelTimeout();
  }
};

const createRequestKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const loadPdfExportRuntime = async (): Promise<
  ComponentType<PdfExportRuntimeProps>
> => {
  const module = await import('./PdfExportRuntime');
  return module.default as ComponentType<PdfExportRuntimeProps>;
};

const PdfExportButton = ({
  buildPayload,
  label,
  loadingLabel,
  disabled = false,
  onSuccess,
  onError,
}: PdfExportButtonProps) => {
  const [request, setRequest] = useState<RequestState | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [RuntimeComponent, setRuntimeComponent] =
    useState<ComponentType<PdfExportRuntimeProps> | null>(null);
  const isExporting = isBuilding || Boolean(request);
  const isMountedRef = useRef(true);
  const onErrorRef = useRef(onError);
  const exportTimeoutCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearExportTimeout = useCallback(() => {
    if (exportTimeoutCancelRef.current) {
      exportTimeoutCancelRef.current();
      exportTimeoutCancelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearExportTimeout();
  }, [clearExportTimeout]);

  const handleRequestDone = useCallback(() => {
    clearExportTimeout();
    setRequest(null);
  }, [clearExportTimeout]);

  const handleClick = useCallback(async () => {
    if (disabled || isExporting) {
      return;
    }

    clearExportTimeout();
    setIsBuilding(true);
    exportTimeoutCancelRef.current = startTimeout(REQUEST_TIMEOUT_MS, () => {
      if (!isMountedRef.current) {
        return;
      }
      setIsBuilding(false);
      setRequest(null);
      onErrorRef.current?.(
        normalizePdfExportError(
          createTimeoutError('PDF export timed out. Please try again.'),
        ),
      );
    });

    try {
      const [payload, runtime] = await Promise.all([
        withTimeout(
          buildPayload(),
          BUILD_TIMEOUT_MS,
          'PDF export timed out while preparing the document.',
        ),
        withTimeout(
          RuntimeComponent
            ? Promise.resolve(RuntimeComponent)
            : loadPdfExportRuntime(),
          BUILD_TIMEOUT_MS,
          'PDF export timed out while loading the export runtime.',
        ),
      ]);

      if (!isMountedRef.current) {
        return;
      }

      if (!RuntimeComponent) {
        setRuntimeComponent(() => runtime);
      }

      setRequest({ payload, key: createRequestKey() });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      clearExportTimeout();
      onError?.(normalizePdfExportError(error));
    } finally {
      if (isMountedRef.current) {
        setIsBuilding(false);
      }
    }
  }, [
    buildPayload,
    clearExportTimeout,
    disabled,
    isExporting,
    onError,
    RuntimeComponent,
  ]);

  const buttonLabel = isExporting ? loadingLabel : label;
  const payload = request?.payload ?? null;
  const requestKey = request?.key ?? null;

  return (
    <>
      <button
        type="button"
        className="app__button"
        onClick={handleClick}
        disabled={disabled || isExporting}
      >
        {buttonLabel}
      </button>
      {payload && requestKey && RuntimeComponent ? (
        <RuntimeComponent
          payload={payload}
          requestKey={requestKey}
          onSuccess={onSuccess}
          onError={onError}
          onDone={handleRequestDone}
        />
      ) : null}
    </>
  );
};

export default PdfExportButton;
