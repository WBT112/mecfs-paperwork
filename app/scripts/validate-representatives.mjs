/* global console, process */
import fs from 'node:fs/promises';
import {
  REPRESENTATIVE_DATA_PATH,
  validateRepresentativeCatalog,
} from './representative-data.mjs';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const main = async () => {
  const raw = await fs.readFile(REPRESENTATIVE_DATA_PATH, 'utf8');
  const catalog = validateRepresentativeCatalog(JSON.parse(raw));
  const verifiedEmails = catalog.representatives.filter(
    (entry) => entry.emailStatus === 'verified',
  ).length;
  console.log(
    `Representative catalog valid: ${catalog.representatives.length} entries, ${verifiedEmails} verified emails.`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
