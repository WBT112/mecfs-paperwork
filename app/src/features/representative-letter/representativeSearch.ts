import type { RepresentativeCatalogEntry } from './data/catalogs';

/**
 * Finds representatives for an explicitly selected constituency.
 *
 * @param representatives - Static catalog entries to filter.
 * @param constituencyNumber - Explicitly selected constituency number.
 * @returns Entries assigned to the selected constituency.
 * @remarks Recipient names, constituency names, and federal states are not
 * accepted as independent search paths. The constituency must come from the
 * local postcode-or-place lookup first.
 */
export const findRepresentativesForConstituency = (
  representatives: readonly RepresentativeCatalogEntry[],
  constituencyNumber: number,
): RepresentativeCatalogEntry[] =>
  representatives.filter(
    (representative) =>
      representative.constituency?.number === constituencyNumber,
  );
