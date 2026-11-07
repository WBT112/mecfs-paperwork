import type {
  ConstituencyLocation,
  ConstituencyLocationCatalog,
} from './data/constituencyLocationCatalogs';

/** Validation and match state for a local location search. */
export type ConstituencyLocationSearchStatus =
  | 'idle'
  | 'incomplete-postcode'
  | 'invalid-postcode'
  | 'incomplete-place'
  | 'not-found'
  | 'matches';

/** One constituency candidate produced by a postcode or place search. */
export type ConstituencyLocationMatch = {
  constituencyNumber: number;
  constituencyName: string;
  stateCode: string;
  state: string;
  locations: ConstituencyLocation[];
};

/** Result of validating and searching one transient location query. */
export type ConstituencyLocationSearchResult = {
  status: ConstituencyLocationSearchStatus;
  matches: ConstituencyLocationMatch[];
};

const normalizeLocationValue = (value: string): string =>
  value
    .trim()
    .toLocaleLowerCase('de')
    .replaceAll(/\bst\.?(?=\s)/gu, 'sankt')
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .normalize('NFKD')
    .replaceAll(/\p{Mark}/gu, '')
    .replaceAll(/[^a-z\d]+/gu, ' ')
    .trim();

const matchesPlace = (location: ConstituencyLocation, tokens: string[]) => {
  const searchable = normalizeLocationValue(
    `${location.municipality} ${location.county}`,
  );
  return tokens.every((token) => searchable.includes(token));
};

const locationRank = (
  location: ConstituencyLocation,
  normalizedQuery: string,
) => {
  const municipality = normalizeLocationValue(location.municipality);
  if (municipality === normalizedQuery) return 0;
  if (municipality.startsWith(normalizedQuery)) return 1;
  return 2;
};

/**
 * Searches the checked-in constituency catalog without network or persistence.
 *
 * @param catalog - Static constituency and location snapshot.
 * @param query - Transient five-digit postcode or municipality/locality query.
 * @param stateCode - Optional federal-state filter.
 * @returns A validation state and explicitly selectable constituency matches.
 * @remarks Numeric input must be exactly five digits. Place matching ignores
 * case, diacritics, umlaut spellings, punctuation, and the St./Sankt variant.
 */
export const searchConstituencyLocations = (
  catalog: ConstituencyLocationCatalog,
  query: string,
  stateCode: string,
): ConstituencyLocationSearchResult => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { status: 'idle', matches: [] };
  }

  const containsDigit = /\d/u.test(trimmedQuery);
  const isPostcode = /^\d{5}$/u.test(trimmedQuery);
  if (containsDigit && !isPostcode) {
    return {
      status: /^\d{1,4}$/u.test(trimmedQuery)
        ? 'incomplete-postcode'
        : 'invalid-postcode',
      matches: [],
    };
  }

  const normalizedQuery = normalizeLocationValue(trimmedQuery);
  if (!isPostcode && normalizedQuery.length < 3) {
    return { status: 'incomplete-place', matches: [] };
  }
  const tokens = normalizedQuery.split(/\s+/u).filter(Boolean);

  const rankedMatches = catalog.constituencies.flatMap((constituency) => {
    if (stateCode && constituency.stateCode !== stateCode) {
      return [];
    }
    const locations = constituency.locations.filter((location) =>
      isPostcode
        ? location.postalCodes.includes(trimmedQuery)
        : matchesPlace(location, tokens),
    );
    if (locations.length === 0) {
      return [];
    }
    const rank = isPostcode
      ? 0
      : Math.min(
          ...locations.map((location) =>
            locationRank(location, normalizedQuery),
          ),
        );
    return [
      {
        rank,
        match: {
          constituencyNumber: constituency.number,
          constituencyName: constituency.name,
          stateCode: constituency.stateCode,
          state: constituency.state,
          locations,
        },
      },
    ];
  });
  const matches = rankedMatches
    .toSorted(
      (left, right) =>
        left.rank - right.rank ||
        left.match.state.localeCompare(right.match.state, 'de') ||
        left.match.constituencyNumber - right.match.constituencyNumber,
    )
    .map(({ match }) => match);

  return {
    status: matches.length > 0 ? 'matches' : 'not-found',
    matches,
  };
};
