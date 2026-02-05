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

const loadPdfDownloadDependencies = async () => {
  const [rendererModule, { downloadPdfExport }] = await Promise.all([
    import.meta.env.DEV && import.meta.env.MODE !== 'test'
      ? import('@react-pdf/renderer/lib/react-pdf.browser.js')
      : import('@react-pdf/renderer'),
    import('./download'),
  ]);

  const { pdf } = rendererModule as typeof import('@react-pdf/renderer');
  return { pdf, downloadPdfExport };
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
  const runtimePromiseRef = useRef<Promise<
    ComponentType<PdfExportRuntimeProps>
  > | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleRequestDone = useCallback(() => {
    setRequest(null);
  }, []);

  const ensureRuntimeLoaded = useCallback(async () => {
    if (RuntimeComponent) {
      return RuntimeComponent;
    }

    if (!runtimePromiseRef.current) {
      runtimePromiseRef.current = loadPdfExportRuntime();
    }

    const runtime = await runtimePromiseRef.current;

    if (isMountedRef.current) {
      setRuntimeComponent(() => runtime);
    }

    return runtime;
  }, [RuntimeComponent]);

  const runDirectPdfExport = useCallback(
    async (payload: PdfExportPayload) => {
      try {
        const { pdf, downloadPdfExport } = await loadPdfDownloadDependencies();
        const pdfInstance = pdf(payload.document);
        const blob = await pdfInstance.toBlob();
        downloadPdfExport({ blob, filename: payload.filename });
        onSuccess?.();
      } catch (error) {
        onError?.(normalizePdfExportError(error));
      }
    },
    [onError, onSuccess],
  );

  const handleClick = useCallback(async () => {
    if (disabled || isExporting) {
      return;
    }

    setIsBuilding(true);

    try {
      const payload = await buildPayload();

      if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
        if (!isMountedRef.current) {
          return;
        }
        await runDirectPdfExport(payload);
        return;
      }

      await ensureRuntimeLoaded();
      if (!isMountedRef.current) {
        return;
      }

      setRequest({ payload, key: createRequestKey() });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      onError?.(normalizePdfExportError(error));
    } finally {
      if (isMountedRef.current) {
        setIsBuilding(false);
      }
    }
  }, [
    buildPayload,
    disabled,
    ensureRuntimeLoaded,
    isExporting,
    onError,
    runDirectPdfExport,
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
