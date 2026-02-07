/* global console, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const C_RESET = '\x1b[0m';
const C_GREEN = '\x1b[32m';
const C_RED = '\x1b[31m';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const deprecatedRootFormpacksDir = path.join(repoRoot, 'formpacks');

const exists = await fs
  .access(deprecatedRootFormpacksDir)
  .then(() => true)
  .catch(() => false);

if (exists) {
  console.error(
    `${C_RED}Root formpacks directory is deprecated: ${path.relative(
      repoRoot,
      deprecatedRootFormpacksDir,
    )}.${C_RESET}`,
  );
  console.error(
    `${C_RED}Use app/public/formpacks as the canonical source instead.${C_RESET}`,
  );
  process.exit(1);
}

console.log(
  `${C_GREEN}✔ Formpacks source check passed (app/public/formpacks).${C_RESET}`,
);
