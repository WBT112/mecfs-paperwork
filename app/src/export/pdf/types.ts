export type DocumentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'lineBreaks'; lines: string[] }
  | { type: 'bullets'; items: string[] }
  | { type: 'kvTable'; rows: Array<[string, string]> };

export const DOCUMENT_BLOCK_TYPES = [
  'paragraph',
  'lineBreaks',
  'bullets',
  'kvTable',
] as const;

export type DocumentBlockType = (typeof DOCUMENT_BLOCK_TYPES)[number];

export type DocumentSection = {
  heading?: string;
  blocks: DocumentBlock[];
};

export type DocumentModel = {
  title?: string;
  meta?: { createdAtIso: string; locale: string };
  sections: DocumentSection[];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isKvRows = (value: unknown): value is Array<[string, string]> =>
  Array.isArray(value) &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 2 &&
      row.every((cell) => typeof cell === 'string'),
  );

export const isDocumentBlockType = (
  value: unknown,
): value is DocumentBlockType =>
  typeof value === 'string' &&
  (DOCUMENT_BLOCK_TYPES as readonly string[]).includes(value);

export const isDocumentBlock = (value: unknown): value is DocumentBlock => {
  if (!isPlainObject(value) || !isDocumentBlockType(value.type)) {
    return false;
  }

  switch (value.type) {
    case 'paragraph':
      return typeof value.text === 'string';
    case 'lineBreaks':
      return isStringArray(value.lines);
    case 'bullets':
      return isStringArray(value.items);
    case 'kvTable':
      return isKvRows(value.rows);
    default:
      return false;
  }
};

export const isDocumentSection = (value: unknown): value is DocumentSection => {
  if (!isPlainObject(value)) {
    return false;
  }

  const heading = value.heading;
  if (heading !== undefined && typeof heading !== 'string') {
    return false;
  }

  return Array.isArray(value.blocks) && value.blocks.every(isDocumentBlock);
};

export const isDocumentModel = (value: unknown): value is DocumentModel => {
  if (!isPlainObject(value)) {
    return false;
  }

  const title = value.title;
  if (title !== undefined && typeof title !== 'string') {
    return false;
  }

  const meta = value.meta;
  if (
    meta !== undefined &&
    (!isPlainObject(meta) ||
      typeof meta.createdAtIso !== 'string' ||
      typeof meta.locale !== 'string')
  ) {
    return false;
  }

  return (
    Array.isArray(value.sections) && value.sections.every(isDocumentSection)
  );
};
