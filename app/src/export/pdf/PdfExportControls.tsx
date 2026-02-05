import { useCallback, useEffect } from 'react';
import type { SupportedLocale } from '../../i18n/locale';
import type { PdfExportPayload } from './PdfExportButton';
import PdfExportButton from './PdfExportButton';
import { buildPdfExportFilename } from './download';

export type PdfExportControlsProps = {
  formpackId: string;
  formData: Record<string, unknown>;
  locale: SupportedLocale;
  label: string;
  loadingLabel: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

const PdfExportControls = ({
  formpackId,
  formData,
  locale,
  label,
  loadingLabel,
  disabled = false,
  onSuccess,
  onError,
}: PdfExportControlsProps) => {
  useEffect(() => {
    Promise.all([import('./registry'), import('./PdfExportRuntime')]).catch(
      () => {},
    );
  }, []);

  const buildPayload = useCallback(async (): Promise<PdfExportPayload> => {
    const { getPdfExportConfig } = await import('./registry');
    const config = await getPdfExportConfig(formpackId);
    if (!config) {
      throw new Error('PDF export is not configured for this formpack.');
    }

    const exportedAt = new Date();
    const model = config.buildModel({ formData, locale, exportedAt });
    return {
      document: config.renderDocument(model),
      filename: buildPdfExportFilename(formpackId, exportedAt),
    };
  }, [formData, formpackId, locale]);

  return (
    <PdfExportButton
      buildPayload={buildPayload}
      label={label}
      loadingLabel={loadingLabel}
      disabled={disabled}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
};

export default PdfExportControls;
