/* global console, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = path.resolve(
  SCRIPT_DIR,
  '../src/features/representative-letter/data/letter-content.de.json',
);
const EXPECTED_SELECTION_COUNTS = new Map([
  ['severity:mild', 2],
  ['severity:moderate', 2],
  ['severity:severe', 2],
  ['severity:very-severe', 2],
  ['care:none', 1],
  ['care:pending', 1],
  ['care:level-1', 2],
  ['care:level-2', 2],
  ['care:level-3', 2],
  ['care:level-4', 2],
  ['care:level-5', 2],
]);

const requireNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
};

const validateBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length !== 20) {
    throw new Error(
      'The content catalog must contain exactly 20 source blocks.',
    );
  }

  const ids = new Set();
  const combinations = new Set();
  const selectionCounts = new Map();
  for (const block of blocks) {
    for (const key of [
      'id',
      'category',
      'selectionId',
      'variantId',
      'label',
      'sourceText',
    ]) {
      requireNonEmptyString(block[key], `personalBlocks.${key}`);
    }
    if (!['severity', 'care'].includes(block.category)) {
      throw new Error(`Unsupported block category: ${block.category}`);
    }
    if (ids.has(block.id)) {
      throw new Error(`Duplicate block id: ${block.id}`);
    }
    ids.add(block.id);

    const combination = `${block.category}:${block.selectionId}:${block.variantId}`;
    if (combinations.has(combination)) {
      throw new Error(`Duplicate block selection: ${combination}`);
    }
    combinations.add(combination);

    const selection = `${block.category}:${block.selectionId}`;
    selectionCounts.set(selection, (selectionCounts.get(selection) ?? 0) + 1);
  }

  for (const [selection, expectedCount] of EXPECTED_SELECTION_COUNTS) {
    if (selectionCounts.get(selection) !== expectedCount) {
      throw new Error(
        `${selection} must contain ${expectedCount} source block(s).`,
      );
    }
  }
  if (selectionCounts.size !== EXPECTED_SELECTION_COUNTS.size) {
    throw new Error('The content catalog contains an unsupported selection.');
  }
};

export const validateRepresentativeContent = (value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('The content catalog must be an object.');
  }
  if (value.schemaVersion !== 1 || value.contentLanguage !== 'de') {
    throw new Error('Unsupported representative-letter content schema.');
  }
  requireNonEmptyString(value.contentVersion, 'contentVersion');
  requireNonEmptyString(value.subject, 'subject');
  if (
    value.approval?.status !== 'approved-as-provided' ||
    value.approval?.sourceIssue !== 553
  ) {
    throw new Error('The content approval metadata is incomplete.');
  }
  if (
    !Array.isArray(value.template?.opening) ||
    value.template.opening.length !== 2
  ) {
    throw new Error(
      'The template must contain both approved opening paragraphs.',
    );
  }
  if (
    !Array.isArray(value.template?.requests) ||
    value.template.requests.length !== 4
  ) {
    throw new Error('The template must contain all four approved requests.');
  }
  for (const text of [
    ...value.template.opening,
    value.template.requestHeading,
    ...value.template.requests,
    value.template.responseRequest,
    value.template.templateDisclosure,
    value.template.signOff,
  ]) {
    requireNonEmptyString(text, 'template text');
  }
  if (
    !Array.isArray(value.sourceReferences) ||
    value.sourceReferences.length !== 2
  ) {
    throw new Error(
      'Both required long-form source references must be present.',
    );
  }
  for (const reference of value.sourceReferences) {
    requireNonEmptyString(reference.id, 'source reference id');
    requireNonEmptyString(reference.label, 'source reference label');
    if (!URL.canParse(reference.url) || !reference.url.startsWith('https://')) {
      throw new Error(`Invalid source reference URL: ${reference.url}`);
    }
  }
  validateBlocks(value.personalBlocks);
  return value;
};

const main = async () => {
  const raw = await fs.readFile(CONTENT_PATH, 'utf8');
  const catalog = validateRepresentativeContent(JSON.parse(raw));
  console.log(
    `Representative letter content valid: ${catalog.personalBlocks.length} source blocks, version ${catalog.contentVersion}.`,
  );
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
