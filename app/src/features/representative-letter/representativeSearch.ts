import type { RepresentativeCatalogEntry } from './data/catalogs';

const normalizeSearchValue = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase('de')
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .replaceAll('ı', 'i')
    .normalize('NFKD')
    .replaceAll(/\p{Mark}/gu, '')
    .replaceAll(/[^a-z\d]+/gu, ' ')
    .trim();

const searchableRepresentativeText = (
  representative: RepresentativeCatalogEntry,
): string =>
  normalizeSearchValue(
    [
      representative.fullName,
      representative.constituency?.number,
      representative.constituency?.name,
    ]
      .filter((value): value is string | number => value !== undefined)
      .join(' '),
  );

/**
 * Filters the bundled representative catalog without any network request.
 *
 * @param representatives - Static catalog entries to search.
 * @param query - User-entered name, constituency name, or constituency number.
 * @param stateCode - Optional federal-state code to require.
 * @param constituencyNumber - Optional explicitly selected constituency.
 * @returns Entries matching the state and every normalized search token.
 */
export const filterRepresentatives = (
  representatives: readonly RepresentativeCatalogEntry[],
  query: string,
  stateCode: string,
  constituencyNumber?: number | null,
): RepresentativeCatalogEntry[] => {
  const searchTokens = normalizeSearchValue(query)
    .split(/\s+/u)
    .filter(Boolean);

  return representatives.filter((representative) => {
    if (stateCode && representative.stateCode !== stateCode) {
      return false;
    }
    if (
      constituencyNumber &&
      representative.constituency?.number !== constituencyNumber
    ) {
      return false;
    }
    if (searchTokens.length === 0) {
      return true;
    }

    const searchableText = searchableRepresentativeText(representative);
    return searchTokens.every((token) => searchableText.includes(token));
  });
};
