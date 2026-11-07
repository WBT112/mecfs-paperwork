/* global console, process */
import fs from 'node:fs/promises';
import {
  CONSTITUENCY_LOCATION_DATA_PATH,
  validateConstituencyLocationCatalog,
} from './constituency-location-data.mjs';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const main = async () => {
  const raw = await fs.readFile(CONSTITUENCY_LOCATION_DATA_PATH, 'utf8');
  const catalog = validateConstituencyLocationCatalog(JSON.parse(raw));
  console.log(
    `Constituency location catalog valid: ${catalog.sourceCounts.constituencies} constituencies, ${catalog.sourceCounts.locations} locations, ${catalog.sourceCounts.postalCodes} postal codes.`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
