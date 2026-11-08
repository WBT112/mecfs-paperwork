import type { RepresentativeCatalogEntry } from './data/catalogs';
import type { ConstituencyLocationMatch } from './constituencyLocationSearch';

/**
 * One representative resolved from a local place or postcode match.
 */
export type RepresentativeLocationMatch = {
  representative: RepresentativeCatalogEntry;
  location: ConstituencyLocationMatch;
};

/**
 * Resolves local place or postcode matches directly to representatives.
 *
 * @param representatives - Static catalog entries to filter.
 * @param locations - Ordered local constituency matches from the transient
 * place or postcode search.
 * @returns Deterministically ordered, representative-ID-deduplicated matches.
 * @remarks Recipient names, constituency names, and federal states remain
 * unavailable as independent search paths. Every result must originate from
 * the bundled local place-or-postcode lookup.
 */
export const resolveRepresentativesForLocations = (
  representatives: readonly RepresentativeCatalogEntry[],
  locations: readonly ConstituencyLocationMatch[],
): RepresentativeLocationMatch[] => {
  const representativesByConstituency = new Map<
    number,
    RepresentativeCatalogEntry[]
  >();
  for (const representative of representatives) {
    const constituencyNumber = representative.constituency?.number;
    if (constituencyNumber === undefined) continue;
    const entries = representativesByConstituency.get(constituencyNumber) ?? [];
    entries.push(representative);
    representativesByConstituency.set(constituencyNumber, entries);
  }

  const seenRepresentativeIds = new Set<string>();
  return locations.flatMap((location) =>
    (representativesByConstituency.get(location.constituencyNumber) ?? [])
      .toSorted(
        (left, right) =>
          left.fullName.localeCompare(right.fullName, 'de') ||
          left.id.localeCompare(right.id),
      )
      .flatMap((representative) => {
        if (seenRepresentativeIds.has(representative.id)) return [];
        seenRepresentativeIds.add(representative.id);
        return [{ representative, location }];
      }),
  );
};
