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

export const formatExportDate = (value: Date) =>
  value.toISOString().slice(0, 10).replaceAll('-', '');

export const sanitizeFilenamePart = (value: string | null | undefined) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  // SECURITY: Use a linear-time sanitizer to avoid regex backtracking on user input.
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

type DownloadPayload = {
  blob?: Blob | ArrayBuffer | Uint8Array | null;
  url?: string | null;
  filename: string;
  mimeType: string;
  defaultExtension: string;
  errorMessage?: string;
};

export const downloadBlobExport = ({
  blob,
  url,
  filename,
  mimeType,
  defaultExtension,
  errorMessage,
}: DownloadPayload): void => {
  let objectUrl = url ?? null;

  if (!objectUrl) {
    if (!blob) {
      throw new Error(errorMessage ?? 'Export could not be generated.');
    }

    const normalizedPart =
      blob instanceof Uint8Array ? new Uint8Array(blob) : blob;
    const normalizedBlob =
      blob instanceof Blob
        ? blob
        : new Blob([normalizedPart], { type: mimeType });
    objectUrl = URL.createObjectURL(normalizedBlob);
  }

  const normalizedExtension = defaultExtension.startsWith('.')
    ? defaultExtension
    : `.${defaultExtension}`;
  const safeFilename = filename.toLowerCase().endsWith(normalizedExtension)
    ? filename
    : `${filename}${normalizedExtension}`;

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = safeFilename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
};
