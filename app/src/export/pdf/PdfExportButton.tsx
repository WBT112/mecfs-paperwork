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

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleRequestDone = useCallback(() => {
    setRequest(null);
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || isExporting) {
      return;
    }

    setIsBuilding(true);

    try {
      const [payload, runtime] = await Promise.all([
        buildPayload(),
        RuntimeComponent
          ? Promise.resolve(RuntimeComponent)
          : loadPdfExportRuntime(),
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
      onError?.(normalizePdfExportError(error));
    } finally {
      if (isMountedRef.current) {
        setIsBuilding(false);
      }
    }
  }, [buildPayload, disabled, isExporting, onError, RuntimeComponent]);

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
