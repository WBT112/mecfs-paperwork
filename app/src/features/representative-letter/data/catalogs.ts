import representativeData from './representatives.json';

const EMPTY_TEXT = '';

/** How a representative entered the current Bundestag. */
export type RepresentativeMandateType = 'direct' | 'state-list' | 'successor';

/** Verification state of a public contact route. */
export type RepresentativeContactStatus = 'verified' | 'missing';

/** A Bundestag constituency attached to one representative. */
export type RepresentativeConstituency = {
  number: number;
  name: string;
};

/** One locally bundled member of the current Bundestag. */
export type RepresentativeCatalogEntry = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  state: string;
  stateCode: string;
  constituency: RepresentativeConstituency | null;
  mandateType: RepresentativeMandateType;
  mandateStart: string;
  mandateEnd: string | null;
  parliamentaryGroup: string;
  email: string | null;
  emailStatus: RepresentativeContactStatus;
  emailSourceUrl: string;
  officialProfileUrl: string;
  officialContactUrl: string;
  abgeordnetenwatchProfileUrl: string;
  verifiedAt: string;
};

/** Source metadata retained for reproducible catalog updates. */
export type RepresentativeCatalogSource = {
  id: string;
  url: string;
  attribution: string;
  sha256: string;
};

/** Versioned static catalog used by the representative-letter workflow. */
export type RepresentativeCatalog = {
  schemaVersion: 1;
  version: string;
  verifiedAt: string;
  term: {
    number: 21;
    startDate: string;
    endDate: string;
  };
  sourceCounts: {
    activeMandates: number;
    addressBookEntries: number;
    officialProfiles: number;
  };
  sources: RepresentativeCatalogSource[];
  representatives: RepresentativeCatalogEntry[];
};

/** Versioned, bundled recipient catalog assembled from documented sources. */
export const representativeCatalog =
  representativeData as RepresentativeCatalog;

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
