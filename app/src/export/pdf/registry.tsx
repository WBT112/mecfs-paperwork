import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { SupportedLocale } from '../../i18n/locale';
import type { DocumentModel } from './types';

export type PdfExportConfig = {
  buildModel: (options: {
    formData: Record<string, unknown>;
    locale: SupportedLocale;
    exportedAt?: Date;
  }) => DocumentModel;
  renderDocument: (model: DocumentModel) => ReactElement<DocumentProps>;
};

const buildDoctorLetterConfig = async (): Promise<PdfExportConfig> => {
  const [
    { buildDoctorLetterDocumentModel },
    { default: DoctorLetterPdfDocument },
  ] = await Promise.all([
    import('../../formpacks/doctor-letter/export/documentModel'),
    import('./templates/DoctorLetterPdfDocument'),
  ]);

  return {
    buildModel: buildDoctorLetterDocumentModel,
    renderDocument: (model) => <DoctorLetterPdfDocument model={model} />,
  };
};

export const getPdfExportConfig = async (
  formpackId: string | null,
): Promise<PdfExportConfig | null> => {
  if (formpackId === 'doctor-letter') {
    return buildDoctorLetterConfig();
  }
  return null;
};
