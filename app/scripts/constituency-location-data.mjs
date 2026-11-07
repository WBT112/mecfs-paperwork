import { createHash } from 'node:crypto';

export const CONSTITUENCY_LOCATION_DATA_PATH = new URL(
  '../src/features/representative-letter/data/constituency-locations.json',
  import.meta.url,
);

export const CONSTITUENCY_LOCATION_SOURCES = {
  bundestagSearch: 'https://www.bundestag.de/static/appdata/filter/wks.json',
  federalReturningOfficer:
    'https://bundeswahlleiterin.de/dam/jcr/aa868597-0e60-476c-bd2b-279c1e9a142a/btw25_wkr_gemeinden_20241130_utf8.csv',
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const POSTAL_CODE_PATTERN = /^\d{5}$/u;
const SHA256_PATTERN = /^[a-f\d]{64}$/u;

const assertString = (value, path) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} must be a non-empty string.`);
  }
};

const assertDate = (value, path) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new Error(`${path} must use YYYY-MM-DD.`);
  }
};

const assertHttpsUrl = (value, path) => {
  assertString(value, path);
  if (new URL(value).protocol !== 'https:') {
    throw new Error(`${path} must use HTTPS.`);
  }
};

const parsePostalCodes = (postalCodes, constituencyNumber) => {
  if (
    !Array.isArray(postalCodes) ||
    postalCodes.length === 0 ||
    postalCodes.some((postalCode) => !POSTAL_CODE_PATTERN.test(postalCode))
  ) {
    throw new Error(
      `Constituency ${constituencyNumber} has invalid postal codes.`,
    );
  }
  return [...new Set(postalCodes)].toSorted();
};

export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex');

export const parseOfficialConstituencies = (csv) => {
  const rows = csv
    .replace(/^\uFEFF/u, '')
    .split(/\r?\n/u)
    .filter((line) => /^\d/u.test(line));
  const constituencies = new Map();

  for (const row of rows) {
    const columns = row.split(';');
    const [numberValue, name] = columns;
    const number = Number(numberValue);
    if (!Number.isInteger(number) || !name) {
      throw new Error('The official constituency CSV contains an invalid row.');
    }
    const current = constituencies.get(number) ?? { name, locations: [] };
    if (current.name !== name) {
      throw new Error(`Official constituency ${number} has conflicting names.`);
    }
    const municipality = columns[11]?.trim();
    const locality = columns[12]?.trim();
    const postalCode = columns[15]?.trim();
    if (municipality && POSTAL_CODE_PATTERN.test(postalCode)) {
      current.locations.push({
        county: columns[9]?.trim() || municipality,
        municipality: locality ? `${municipality} – ${locality}` : municipality,
        postalCodes: [postalCode],
      });
    }
    constituencies.set(number, current);
  }
  return constituencies;
};

export const fillMissingBundestagLocations = (
  constituencies,
  officialConstituencies,
) =>
  constituencies.map((constituency) => {
    if (constituency.locations.length > 0) {
      return constituency;
    }
    const official = officialConstituencies.get(constituency.number);
    if (!official || official.locations.length === 0) {
      throw new Error(
        `No location fallback exists for constituency ${constituency.number}.`,
      );
    }
    return {
      ...constituency,
      locations: official.locations.toSorted((left, right) =>
        left.municipality.localeCompare(right.municipality, 'de'),
      ),
    };
  });

export const parseBundestagLocations = (payload) => {
  if (!Array.isArray(payload?.federalStates)) {
    throw new Error('Bundestag location data has no federalStates array.');
  }

  return payload.federalStates
    .flatMap((federalState) => {
      assertString(federalState.key, 'federalState.key');
      assertString(federalState.name, 'federalState.name');
      if (!Array.isArray(federalState.constituencies)) {
        throw new Error(`${federalState.key} has no constituencies array.`);
      }

      return federalState.constituencies.map((constituency) => {
        const number = Number(constituency.number);
        if (!Number.isInteger(number)) {
          throw new Error('A Bundestag constituency number is invalid.');
        }
        assertString(constituency.name, `constituency ${number}.name`);
        if (!Array.isArray(constituency.counties)) {
          throw new Error(`Constituency ${number} has no counties array.`);
        }

        const locations = constituency.counties.flatMap((county) => {
          assertString(county.headline, `constituency ${number}.county`);
          if (!Array.isArray(county.communities)) {
            throw new Error(`Constituency ${number} has an invalid county.`);
          }
          const countyLocation = Array.isArray(county.zipCodes)
            ? [
                {
                  county: county.headline,
                  municipality: county.headline,
                  postalCodes: parsePostalCodes(county.zipCodes, number),
                },
              ]
            : [];
          const communityLocations = county.communities.map((community) => {
            assertString(community.name, `constituency ${number}.municipality`);
            return {
              county: county.headline,
              municipality: community.name,
              postalCodes: parsePostalCodes(community.zipCodes, number),
            };
          });
          return [...countyLocation, ...communityLocations];
        });

        return {
          number,
          name: constituency.name,
          stateCode: federalState.key,
          state: federalState.name,
          locations: locations.toSorted((left, right) =>
            left.municipality.localeCompare(right.municipality, 'de'),
          ),
        };
      });
    })
    .toSorted((left, right) => left.number - right.number);
};

export const assertOfficialConstituencies = (
  constituencies,
  officialConstituencies,
) => {
  if (officialConstituencies.size !== 299 || constituencies.length !== 299) {
    throw new Error('Both sources must contain all 299 constituencies.');
  }
  for (const constituency of constituencies) {
    if (
      officialConstituencies.get(constituency.number)?.name !==
      constituency.name
    ) {
      throw new Error(
        `Constituency ${constituency.number} differs between official sources.`,
      );
    }
  }
};

export const validateConstituencyLocationCatalog = (catalog) => {
  if (catalog?.schemaVersion !== 1) {
    throw new Error('schemaVersion must be 1.');
  }
  assertDate(catalog.version, 'version');
  assertDate(catalog.verifiedAt, 'verifiedAt');
  assertDate(catalog.constituencyStatus, 'constituencyStatus');
  if (catalog.term?.number !== 21) {
    throw new Error('term.number must be 21.');
  }
  assertDate(catalog.term.electionDate, 'term.electionDate');
  if (!Array.isArray(catalog.sources) || catalog.sources.length !== 2) {
    throw new Error('sources must document both official sources.');
  }
  for (const [index, source] of catalog.sources.entries()) {
    assertString(source.id, `sources[${index}].id`);
    assertHttpsUrl(source.url, `sources[${index}].url`);
    assertString(source.attribution, `sources[${index}].attribution`);
    assertString(source.license, `sources[${index}].license`);
    assertHttpsUrl(source.licenseUrl, `sources[${index}].licenseUrl`);
    if (!SHA256_PATTERN.test(source.sha256)) {
      throw new Error(`sources[${index}].sha256 must be a SHA-256 digest.`);
    }
  }
  if (!Array.isArray(catalog.constituencies)) {
    throw new Error('constituencies must be an array.');
  }

  const numbers = new Set();
  const postalCodes = new Set();
  let locationCount = 0;
  for (const [index, constituency] of catalog.constituencies.entries()) {
    const prefix = `constituencies[${index}]`;
    if (
      !Number.isInteger(constituency.number) ||
      constituency.number < 1 ||
      constituency.number > 299 ||
      numbers.has(constituency.number)
    ) {
      throw new Error(`${prefix}.number is invalid or duplicated.`);
    }
    numbers.add(constituency.number);
    for (const field of ['name', 'stateCode', 'state']) {
      assertString(constituency[field], `${prefix}.${field}`);
    }
    if (
      !Array.isArray(constituency.locations) ||
      constituency.locations.length === 0
    ) {
      throw new Error(`${prefix}.locations must not be empty.`);
    }
    for (const [locationIndex, location] of constituency.locations.entries()) {
      const locationPrefix = `${prefix}.locations[${locationIndex}]`;
      assertString(location.county, `${locationPrefix}.county`);
      assertString(location.municipality, `${locationPrefix}.municipality`);
      if (
        !Array.isArray(location.postalCodes) ||
        location.postalCodes.length === 0
      ) {
        throw new Error(`${locationPrefix}.postalCodes must not be empty.`);
      }
      for (const postalCode of location.postalCodes) {
        if (!POSTAL_CODE_PATTERN.test(postalCode)) {
          throw new Error(`${locationPrefix}.postalCodes is invalid.`);
        }
        postalCodes.add(postalCode);
      }
      locationCount += 1;
    }
  }

  const expectedCounts = {
    federalStates: new Set(
      catalog.constituencies.map(({ stateCode }) => stateCode),
    ).size,
    constituencies: catalog.constituencies.length,
    locations: locationCount,
    postalCodes: postalCodes.size,
  };
  if (JSON.stringify(expectedCounts) !== JSON.stringify(catalog.sourceCounts)) {
    throw new Error('sourceCounts do not match the catalog contents.');
  }
  if (
    expectedCounts.federalStates !== 16 ||
    expectedCounts.constituencies !== 299
  ) {
    throw new Error('The catalog must cover 16 states and 299 constituencies.');
  }
  const sortedNumbers = [...numbers].toSorted((left, right) => left - right);
  if (sortedNumbers.some((number, index) => number !== index + 1)) {
    throw new Error('Constituency numbers 1 through 299 must be complete.');
  }

  return catalog;
};
