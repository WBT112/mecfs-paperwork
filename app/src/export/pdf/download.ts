const PDF_MIME = 'application/pdf';

const formatExportDate = (value: Date) =>
  value.toISOString().slice(0, 10).replaceAll('-', '');

const RESERVED_FILENAME_CHARS = new Set([
  '\\',
  '/',
  ':',
  '*',
  '?',
  '"',
  '<',
  '>',
  '|',
  '_',
]);

const sanitizeFilenamePart = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  let result = '';
  let inReplacement = false;

  for (const char of trimmed) {
    const isWhitespace = char.trim().length === 0;
    const isReserved = RESERVED_FILENAME_CHARS.has(char);

    if (isWhitespace || isReserved) {
      if (!inReplacement) {
        result += '-';
        inReplacement = true;
      }
      continue;
    }

    result += char;
    inReplacement = false;
  }

  let start = 0;
  let end = result.length;
  while (start < end && result[start] === '-') {
    start += 1;
  }
  while (end > start && result[end - 1] === '-') {
    end -= 1;
  }

  return result.slice(start, end).slice(0, 80);
};

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
  let objectUrl = url ?? null;

  if (!objectUrl && blob) {
    objectUrl = URL.createObjectURL(
      blob instanceof Blob ? blob : new Blob([blob], { type: PDF_MIME }),
    );
  }

  if (!objectUrl) {
    throw new Error('PDF export could not be generated.');
  }

  const safeFilename = filename.toLowerCase().endsWith('.pdf')
    ? filename
    : `${filename}.pdf`;

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeFilename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};
