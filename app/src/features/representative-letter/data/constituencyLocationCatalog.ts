import constituencyLocationData from './constituency-locations.json';
import type { ConstituencyLocationCatalog } from './constituencyLocationCatalogs';

/** Versioned location catalog for validation and non-browser consumers. */
export const constituencyLocationCatalog =
  constituencyLocationData as ConstituencyLocationCatalog;
