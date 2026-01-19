/* eslint-env node */
/* global console */

// RATIONALE: This script synchronizes the canonical formpacks from the
// repository root into the app's public assets directory.
// DO NOT EDIT files in `app/public/formpacks` directly; they are overwritten
// during the build process.
// The canonical source is at `/formpacks`.

import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const C_RESET = '\x1b[0m';
const C_GREEN = '\x1b[32m';
const C_DIM = '\x1b[2m';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../..');
const sourceDir = path.join(repoRoot, 'formpacks');
const destinationDir = path.join(repoRoot, 'app', 'public', 'formpacks');

console.log('🔄 Syncing formpacks...');
console.log(
  `${C_DIM}  - From: ${path.relative(repoRoot, sourceDir)}${C_RESET}`,
);
console.log(
  `${C_DIM}  - To:   ${path.relative(repoRoot, destinationDir)}${C_RESET}`,
);

await rm(destinationDir, { recursive: true, force: true });
await cp(sourceDir, destinationDir, { recursive: true });

console.log(`${C_GREEN}✔ Formpacks synced.${C_RESET}`);
