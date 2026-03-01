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
  id?: string;
  heading?: string;
  blocks: DocumentBlock[];
};

export type DocumentMeta = {
  createdAtIso: string;
  locale: string;
  /**
   * Optional template-specific payload.
   *
   * Motivation: Some PDF templates need access to the original formpack document
   * model (e.g. to reproduce DOCX template logic like salutation, attachments,
   * and annex pages with images) without having to re-derive that from the
   * generic section blocks.
   */
  templateData?: unknown;
};

export type DocumentModel = {
  title?: string;
  meta?: DocumentMeta;
  sections: DocumentSection[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isKvRows = (value: unknown): value is Array<[string, string]> =>
  Array.isArray(value) &&
  value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 2 &&
      row.every((entry) => typeof entry === 'string'),
  );

export const isDocumentBlockType = (
  value: unknown,
): value is DocumentBlockType =>
  typeof value === 'string' &&
  (DOCUMENT_BLOCK_TYPES as readonly string[]).includes(value);

export const isDocumentBlock = (value: unknown): value is DocumentBlock => {
  if (!isRecord(value) || !isDocumentBlockType(value.type)) {
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
  }
};

export const isDocumentSection = (value: unknown): value is DocumentSection => {
  if (!isRecord(value) || !Array.isArray(value.blocks)) {
    return false;
  }
  if (value.heading !== undefined && typeof value.heading !== 'string') {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  return value.blocks.every((block) => isDocumentBlock(block));
};

export const isDocumentModel = (value: unknown): value is DocumentModel => {
  if (!isRecord(value) || !Array.isArray(value.sections)) {
    return false;
  }
  if (value.title !== undefined && typeof value.title !== 'string') {
    return false;
  }
  if (value.meta !== undefined) {
    if (!isRecord(value.meta)) {
      return false;
    }
    if (typeof value.meta.createdAtIso !== 'string') {
      return false;
    }
    if (typeof value.meta.locale !== 'string') {
      return false;
    }
  }
  return value.sections.every((section) => isDocumentSection(section));
};
