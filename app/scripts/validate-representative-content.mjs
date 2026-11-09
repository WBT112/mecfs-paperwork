/* global console, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const CONTENT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/features/representative-letter/data/letter-variants.de.json',
);
const CATALOG_KEYS = [
  'schemaVersion',
  'contentVersion',
  'contentLanguage',
  'approval',
  'subjects',
  'bodies',
];
const MARKDOWN_OR_PLACEHOLDER =
  /(?:^|\n)#{1,6}\s|\*\*|__|```|\[[^\]]+\]\(|<[^>]+>|\{\{|\}\}/u;

const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const requireNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
};

const hasApprovedInformationLink = (text) =>
  text
    .split(/\s+/u)
    .some(
      (token) =>
        URL.canParse(token) && new URL(token).href === 'https://www.mecfs.de/',
    );

const validateEntries = (entries, label) => {
  if (!Array.isArray(entries) || entries.length !== 30) {
    throw new Error(`${label} must contain exactly 30 variants.`);
  }
  const ids = new Set();
  const texts = new Set();
  for (const entry of entries) {
    if (
      !isObject(entry) ||
      Object.keys(entry).some((key) => !['id', 'text'].includes(key))
    ) {
      throw new Error(`${label} entries must contain only id and text.`);
    }
    requireNonEmptyString(entry.id, `${label}.id`);
    requireNonEmptyString(entry.text, `${label}.text`);
    if (ids.has(entry.id) || texts.has(entry.text)) {
      throw new Error(`${label} must have unique IDs and texts.`);
    }
    ids.add(entry.id);
    texts.add(entry.text);
    if (MARKDOWN_OR_PLACEHOLDER.test(entry.text)) {
      throw new Error(
        `${label} must be plaintext without unresolved placeholders.`,
      );
    }
    if (label === 'subjects' && /[\r\n]/u.test(entry.text)) {
      throw new Error('Subjects must fit on one line.');
    }
    if (
      label === 'bodies' &&
      (!entry.text.startsWith('Guten Tag,\n\n') ||
        !entry.text.endsWith('Mit freundlichen Grüßen') ||
        !hasApprovedInformationLink(entry.text))
    ) {
      throw new Error(
        'Bodies require the neutral greeting, sign-off, and approved information link.',
      );
    }
  }
};

/**
 * Validates the active bundled variants and their editorial provenance.
 * @param value - Untrusted parsed catalog.
 * @returns The validated catalog.
 * @throws If the schema, approval metadata, or plaintext variants are invalid.
 */
export const validateRepresentativeContent = (value) => {
  if (!isObject(value)) {
    throw new Error('The content catalog must be an object.');
  }
  if (value.schemaVersion !== 1 || value.contentLanguage !== 'de') {
    throw new Error('Unsupported representative-letter content schema.');
  }
  if (Object.keys(value).some((key) => !CATALOG_KEYS.includes(key))) {
    throw new Error('The catalog contains unsupported fields.');
  }
  requireNonEmptyString(value.contentVersion, 'contentVersion');
  const approval = value.approval;
  if (
    !isObject(approval) ||
    approval.status !== 'approved-as-provided' ||
    !Number.isInteger(approval.sourceIssue) ||
    approval.sourceIssue <= 0 ||
    !Number.isInteger(approval.sourceRevision) ||
    approval.sourceRevision <= 0 ||
    typeof approval.approvedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(approval.approvedAt) ||
    typeof approval.sourceComment !== 'string' ||
    !URL.canParse(approval.sourceComment) ||
    new URL(approval.sourceComment).protocol !== 'https:'
  ) {
    throw new Error('The content approval metadata is incomplete.');
  }
  requireNonEmptyString(approval.notes, 'approval.notes');
  validateEntries(value.subjects, 'subjects');
  validateEntries(value.bodies, 'bodies');
  return value;
};

const main = async () => {
  const raw = await fs.readFile(CONTENT_PATH, 'utf8');
  const catalog = validateRepresentativeContent(JSON.parse(raw));
  console.log(
    `Representative letter content valid: ${catalog.subjects.length} subjects, ${catalog.bodies.length} bodies, version ${catalog.contentVersion}.`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
