import representativeData from './representatives.json';
import type { RepresentativeCatalog } from './catalogs';

/** Versioned recipient catalog for validation and non-browser consumers. */
export const representativeCatalog =
  representativeData as RepresentativeCatalog;
