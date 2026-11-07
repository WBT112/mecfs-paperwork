/** Source metadata retained for reproducible constituency-location updates. */
export type ConstituencyLocationCatalogSource = {
  id: string;
  url: string;
  attribution: string;
  license: string;
  licenseUrl: string;
  sha256: string;
};

/** One municipality or locality assigned to a Bundestag constituency. */
export type ConstituencyLocation = {
  county: string;
  municipality: string;
  postalCodes: string[];
};

/** One Bundestag constituency with its locally searchable locations. */
export type ConstituencyLocationEntry = {
  number: number;
  name: string;
  stateCode: string;
  state: string;
  locations: ConstituencyLocation[];
};

/** Versioned static location catalog used by the representative search. */
export type ConstituencyLocationCatalog = {
  schemaVersion: 1;
  version: string;
  verifiedAt: string;
  constituencyStatus: string;
  term: {
    number: 21;
    electionDate: string;
  };
  sourceCounts: {
    federalStates: number;
    constituencies: number;
    locations: number;
    postalCodes: number;
  };
  sources: ConstituencyLocationCatalogSource[];
  constituencies: ConstituencyLocationEntry[];
};
