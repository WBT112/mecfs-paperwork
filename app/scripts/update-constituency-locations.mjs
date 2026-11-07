/* global console, process */
import fs from 'node:fs/promises';
import { format as formatWithPrettier } from 'prettier';
import {
  CONSTITUENCY_LOCATION_DATA_PATH,
  CONSTITUENCY_LOCATION_SOURCES,
  assertOfficialConstituencies,
  fillMissingBundestagLocations,
  parseBundestagLocations,
  parseOfficialConstituencies,
  sha256,
  validateConstituencyLocationCatalog,
} from './constituency-location-data.mjs';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const parseArguments = () => {
  const valueIndex = process.argv.indexOf('--verified-at');
  const verifiedAt = valueIndex === -1 ? '' : process.argv[valueIndex + 1];
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(verifiedAt ?? '')) {
    throw new Error(
      'Pass the intentional snapshot date as --verified-at YYYY-MM-DD.',
    );
  }
  return { verifiedAt };
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'mecfs-paperwork constituency location data updater',
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return response.text();
};

const main = async () => {
  const { verifiedAt } = parseArguments();
  const [bundestagRaw, officialRaw] = await Promise.all([
    fetchText(CONSTITUENCY_LOCATION_SOURCES.bundestagSearch),
    fetchText(CONSTITUENCY_LOCATION_SOURCES.federalReturningOfficer),
  ]);
  const officialConstituencies = parseOfficialConstituencies(officialRaw);
  const constituencies = fillMissingBundestagLocations(
    parseBundestagLocations(JSON.parse(bundestagRaw)),
    officialConstituencies,
  );
  assertOfficialConstituencies(constituencies, officialConstituencies);
  const postalCodes = new Set(
    constituencies.flatMap(({ locations }) =>
      locations.flatMap(
        ({ postalCodes: locationPostalCodes }) => locationPostalCodes,
      ),
    ),
  );
  const catalog = validateConstituencyLocationCatalog({
    schemaVersion: 1,
    version: verifiedAt,
    verifiedAt,
    constituencyStatus: '2024-11-30',
    term: {
      number: 21,
      electionDate: '2025-02-23',
    },
    sourceCounts: {
      federalStates: 16,
      constituencies: constituencies.length,
      locations: constituencies.reduce(
        (count, constituency) => count + constituency.locations.length,
        0,
      ),
      postalCodes: postalCodes.size,
    },
    sources: [
      {
        id: 'bundestag-constituency-search',
        url: CONSTITUENCY_LOCATION_SOURCES.bundestagSearch,
        attribution: 'Deutscher Bundestag',
        license: 'Nutzungsbedingungen des Deutschen Bundestages',
        licenseUrl: 'https://www.bundestag.de/services/impressum',
        sha256: sha256(bundestagRaw),
      },
      {
        id: 'federal-returning-officer-constituencies',
        url: CONSTITUENCY_LOCATION_SOURCES.federalReturningOfficer,
        attribution:
          'Die Bundeswahlleiterin, Statistische Ämter des Bundes und der Länder, Wiesbaden 2024',
        license: 'Datenlizenz Deutschland – Namensnennung – Version 2.0',
        licenseUrl: 'https://www.govdata.de/dl-de/by-2-0',
        sha256: sha256(officialRaw),
      },
    ],
    constituencies,
  });

  await fs.writeFile(
    CONSTITUENCY_LOCATION_DATA_PATH,
    await formatWithPrettier(JSON.stringify(catalog), { parser: 'json' }),
    'utf8',
  );
  console.log(
    `Wrote ${catalog.sourceCounts.locations} locations and ${catalog.sourceCounts.postalCodes} postal codes.`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
