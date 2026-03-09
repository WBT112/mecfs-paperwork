import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const collectStringLeafKeys = (value, out, prefix = '') => {
  if (!isRecord(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof nested === 'string') {
      out.add(nextKey);
      continue;
    }

    if (isRecord(nested)) {
      collectStringLeafKeys(nested, out, nextKey);
    }
  }
};

export const getTranslationKeySet = (translations) => {
  const keys = new Set();
  collectStringLeafKeys(translations, keys);
  return keys;
};

export const getMissingKeys = (expected, actual) =>
  [...expected]
    .filter((key) => !actual.has(key))
    .sort((a, b) => a.localeCompare(b));

export const validateResourceParity = ({ de, en }) => {
  const deKeys = getTranslationKeySet(de);
  const enKeys = getTranslationKeySet(en);

  return {
    deKeys,
    enKeys,
    missingInDe: getMissingKeys(enKeys, deKeys),
    missingInEn: getMissingKeys(deKeys, enKeys),
  };
};

export const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
};

const appRoot = path.resolve(__dirname, '..');
const resourcesRoot = path.join(appRoot, 'src', 'i18n', 'resources');

const DE_RESOURCE_PATH = path.join(resourcesRoot, 'de.json');
const EN_RESOURCE_PATH = path.join(resourcesRoot, 'en.json');

export const run = async () => {
  const [de, en] = await Promise.all([
    readJson(DE_RESOURCE_PATH),
    readJson(EN_RESOURCE_PATH),
  ]);

  const { missingInDe, missingInEn } = validateResourceParity({ de, en });

  if (missingInDe.length === 0 && missingInEn.length === 0) {
    process.stdout.write('App i18n parity check passed (de/en).\n');
    return;
  }

  if (missingInDe.length > 0) {
    process.stderr.write(
      `Missing app i18n keys in de.json: ${missingInDe.join(', ')}\n`,
    );
  }

  if (missingInEn.length > 0) {
    process.stderr.write(
      `Missing app i18n keys in en.json: ${missingInEn.join(', ')}\n`,
    );
  }

  process.exitCode = 1;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`App i18n parity check failed: ${message}\n`);
    process.exitCode = 1;
  });
}
