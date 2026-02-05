export type DocumentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'lineBreaks'; lines: string[] }
  | { type: 'bullets'; items: string[] }
  | { type: 'kvTable'; rows: Array<[string, string]> };

export type DocumentSection = {
  heading?: string;
  blocks: DocumentBlock[];
};

export type DocumentModel = {
  title?: string;
  meta?: { createdAtIso: string; locale: string };
  sections: DocumentSection[];
};
