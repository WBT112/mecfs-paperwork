import {
  downloadBlobExport,
  formatExportDate,
  sanitizeFilenamePart,
} from '../downloadUtils';

const PDF_MIME = 'application/pdf';

export const buildPdfExportFilename = (
  formpackId: string,
  exportedAt: Date = new Date(),
): string => {
  const safeFormpack = sanitizeFilenamePart(formpackId) || 'document';
  return `${safeFormpack}-pdf-${formatExportDate(exportedAt)}.pdf`;
};

type DownloadPdfOptions = {
  blob?: Blob | null;
  url?: string | null;
  filename: string;
};

export const downloadPdfExport = ({
  blob,
  url,
  filename,
}: DownloadPdfOptions): void => {
  downloadBlobExport({
    blob,
    url,
    filename,
    mimeType: PDF_MIME,
    defaultExtension: '.pdf',
    errorMessage: 'PDF export could not be generated.',
  });
};
