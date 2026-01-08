import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../..');
const sourceDir = path.join(repoRoot, 'formpacks');
const destinationDir = path.join(repoRoot, 'app', 'public', 'formpacks');

await rm(destinationDir, { recursive: true, force: true });
await cp(sourceDir, destinationDir, { recursive: true });
