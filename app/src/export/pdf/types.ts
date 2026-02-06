export type DocumentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'lineBreaks'; lines: string[] }
  | { type: 'bullets'; items: string[] }
  | { type: 'kvTable'; rows: Array<[string, string]> };

export type DocumentSection = {
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
