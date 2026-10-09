const EMPTY_TEXT = '';

type RepresentativeCatalogEntry = {
  id: string;
  email: string;
};

/** Versioned, bundled recipient catalog populated by the recipient-data issue. */
export const representativeCatalog = {
  version: '1.0.0',
  representatives: {} as Readonly<Record<string, RepresentativeCatalogEntry>>,
} as const;

/**
 * Versioned, bundled text catalogs populated with approved copy in the content
 * issue. Empty values deliberately avoid introducing unreviewed advocacy text.
 */
export const representativeLetterTextCatalogs = {
  de: {
    version: '1.0.0',
    subject: EMPTY_TEXT,
    shortBody: EMPTY_TEXT,
    longBody: EMPTY_TEXT,
  },
  en: {
    version: '1.0.0',
    subject: EMPTY_TEXT,
    shortBody: EMPTY_TEXT,
    longBody: EMPTY_TEXT,
  },
} as const;
