/* eslint-env node */
/* global console, process */
import { createReport } from 'docx-templates';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const formpacksDir = path.join(repoRoot, 'formpacks');
const CMD_DELIMITER = ['{{', '}}'];
const REQUIRED_MANIFEST_FIELDS = [
  'id',
  'version',
  'defaultLocale',
  'locales',
  'titleKey',
  'descriptionKey',
  'exports',
  'docx',
];
const manifestAjv = new Ajv2020({ allErrors: true, strict: false });
addFormats(manifestAjv);
const MANIFEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'version',
    'defaultLocale',
    'locales',
    'titleKey',
    'descriptionKey',
    'exports',
    'docx',
  ],
  properties: {
    id: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 1 },
    defaultLocale: { enum: ['de', 'en'] },
    locales: {
      type: 'array',
      items: { enum: ['de', 'en'] },
      minItems: 1,
      uniqueItems: true,
    },
    titleKey: { type: 'string', minLength: 1 },
    descriptionKey: { type: 'string', minLength: 1 },
    exports: {
      type: 'array',
      items: { enum: ['docx', 'json'] },
      minItems: 1,
      uniqueItems: true,
    },
    visibility: { enum: ['public', 'dev'] },
    docx: {
      type: 'object',
      additionalProperties: false,
      required: ['templates', 'mapping'],
      properties: {
        templates: {
          type: 'object',
          additionalProperties: false,
          required: ['a4'],
          properties: {
            a4: { type: 'string', minLength: 1 },
            wallet: { type: 'string', minLength: 1 },
          },
        },
        mapping: { type: 'string', minLength: 1 },
      },
    },
  },
};
const validateManifestSchema = manifestAjv.compile(MANIFEST_SCHEMA);

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSafeAssetPath = (value) => {
  if (!value || value.trim().length === 0) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  if (value.includes('..')) return false;
  return true;
};

const isSafePathSegment = (segment) =>
  segment &&
  segment !== '__proto__' &&
  segment !== 'constructor' &&
  segment !== 'prototype';

const setPathValue = (target, pathValue, value) => {
  if (!pathValue || pathValue.trim().length === 0) {
    return;
  }

  const segments = pathValue.split('.');
  // Abort if any segment is unsafe to prevent prototype pollution.
  if (!segments.every((segment) => isSafePathSegment(segment))) {
    return;
  }

  let cursor = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    const hasOwn = Object.prototype.hasOwnProperty.call(cursor, segment);
    if (!hasOwn || !isRecord(cursor[segment])) {
      // Create a prototype-less object to avoid prototype pollution.
      cursor[segment] = Object.create(null);
    }

    cursor = cursor[segment];
  }
};

const setNested = (target, dottedKey, value) => {
  const segments = dottedKey.split('.').filter(Boolean);
  if (!segments.length) return;
  // Abort if any segment is unsafe to prevent prototype pollution.
  if (!segments.every((segment) => isSafePathSegment(segment))) return;

  let cursor = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    const hasOwn = Object.prototype.hasOwnProperty.call(cursor, segment);
    if (!hasOwn || !isRecord(cursor[segment])) {
      // Create a prototype-less object to avoid prototype pollution.
      cursor[segment] = Object.create(null);
    }

    cursor = cursor[segment];
  }
};

const getNested = (target, dottedKey) => {
  if (!isRecord(target)) return undefined;
  const segments = dottedKey.split('.').filter(Boolean);
  if (!segments.length) return undefined;

  let cursor = target;

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const next = cursor[segment];
    if (!isRecord(next)) {
      return undefined;
    }
    cursor = next;
  }

  return cursor;
};

const buildI18nContext = (translations, prefix) => {
  const t = {};
  if (!isRecord(translations)) {
    return { t };
  }

  const prefixFilter = prefix ? `${prefix}.` : null;
  Object.entries(translations).forEach(([key, value]) => {
    if (prefixFilter && !key.startsWith(prefixFilter)) return;
    if (typeof value !== 'string') return;
    setNested(t, key, value);
  });

  const aliasSource = prefix ? getNested(t, prefix) : undefined;
  if (aliasSource && !('__PACK_ID__' in t)) {
    t.__PACK_ID__ = aliasSource;
  }

  return { t };
};

const buildDummyContext = (mapping, translations) => {
  const context = buildI18nContext(
    translations,
    isRecord(mapping?.i18n) && typeof mapping.i18n.prefix === 'string'
      ? mapping.i18n.prefix
      : undefined,
  );

  if (!mapping || !isRecord(mapping)) {
    return context;
  }

  const fields = Array.isArray(mapping.fields) ? mapping.fields : [];
  fields.forEach((field) => {
    if (!isRecord(field)) return;
    if (typeof field.var !== 'string') return;
    setPathValue(context, field.var, 'Example');
  });

  const loops = Array.isArray(mapping.loops) ? mapping.loops : [];
  loops.forEach((loop) => {
    if (!isRecord(loop)) return;
    if (typeof loop.var !== 'string') return;
    setPathValue(context, loop.var, ['Example entry 1', 'Example entry 2']);
  });

  return context;
};

const buildAdditionalJsContext = (tContext) => {
  const tFn = (key) => String(key ?? '');
  if (isRecord(tContext)) {
    Object.assign(tFn, tContext);
  }
  return {
    t: tFn,
    formatDate: (value) => (value ? String(value) : ''),
    formatPhone: (value) => (value ? String(value) : ''),
  };
};

const collectErrors = (errors, formpackId, contextPath, error) => {
  if (Array.isArray(error)) {
    error.forEach((entry) =>
      collectErrors(errors, formpackId, contextPath, entry),
    );
    return;
  }

  if (!errors.has(formpackId)) {
    errors.set(formpackId, []);
  }

  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown template error');
  errors.get(formpackId).push({ contextPath, error: normalized });
};

const validateManifest = (manifest, formpackId, manifestPath, errors) => {
  const valid = validateManifestSchema(manifest);
  if (valid) {
    return true;
  }

  (validateManifestSchema.errors ?? []).forEach((error) => {
    const path = error.instancePath || '(root)';
    collectErrors(
      errors,
      formpackId,
      manifestPath,
      new Error(`manifest${path} ${error.message ?? 'is invalid'}`),
    );
  });

  return false;
};

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const parseArgs = (args) => {
  const result = { id: null };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--id') {
      result.id = args[index + 1] ?? null;
      index += 1;
    }
  }
  return result;
};

const listFormpacks = async (onlyId) => {
  const entries = await fs.readdir(formpacksDir, { withFileTypes: true });
  const formpackIds = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (!onlyId) return formpackIds;
  return formpackIds.filter((id) => id === onlyId);
};

/**
 * Collect i18n keys referenced via t: values in schema-like objects.
 */
const collectTranslationKeys = (value, keys) => {
  if (typeof value === 'string' && value.startsWith('t:')) {
    const key = value.slice(2).trim();
    if (key.length > 0) {
      keys.add(key);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTranslationKeys(entry, keys));
    return;
  }

  if (isRecord(value)) {
    Object.values(value).forEach((entry) =>
      collectTranslationKeys(entry, keys),
    );
  }
};

/**
 * Build a set of translation keys from a flat i18n JSON object.
 */
const getTranslationKeySet = (translations) => {
  if (!isRecord(translations)) {
    return new Set();
  }

  return new Set(Object.keys(translations));
};

/**
 * Return keys in expected that are missing from actual.
 */
const getMissingKeys = (expected, actual) =>
  [...expected].filter((key) => !actual.has(key));

const validateExample = (schema, example) => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(example);
  if (valid) return [];
  return (validate.errors ?? []).map((error) => {
    const path = error.instancePath || '(root)';
    return `${path} ${error.message ?? 'is invalid'}`;
  });
};

const validateTemplate = async ({
  templatePath,
  mappingPath,
  formpackId,
  errors,
  translations,
  warnings,
}) => {
  if (!isSafeAssetPath(templatePath)) {
    collectErrors(
      errors,
      formpackId,
      templatePath,
      new Error('Invalid template path in formpack manifest.'),
    );
    return;
  }

  if (!isSafeAssetPath(mappingPath)) {
    collectErrors(
      errors,
      formpackId,
      templatePath,
      new Error('Invalid DOCX mapping path in formpack manifest.'),
    );
    return;
  }

  const templateFile = path.join(formpacksDir, formpackId, templatePath);
  const mappingFile = path.join(formpacksDir, formpackId, mappingPath);

  let template;
  let mapping;
  try {
    template = await fs.readFile(templateFile);
  } catch (error) {
    collectErrors(errors, formpackId, templatePath, error);
    return;
  }

  try {
    mapping = await readJson(mappingFile);
  } catch (error) {
    collectErrors(errors, formpackId, templatePath, error);
    return;
  }

  const data = buildDummyContext(mapping, translations);
  const additionalJsContext = buildAdditionalJsContext(data.t);

  try {
    await createReport({
      template,
      data,
      cmdDelimiter: CMD_DELIMITER,
      additionalJsContext,
      failFast: false,
      processLineBreaks: true,
    });
  } catch (error) {
    // Collect as warnings instead of errors to allow templates to be refined manually
    collectErrors(warnings, formpackId, templatePath, error);
  }
};

const validateContract = async ({ formpackId, errors }) => {
  const baseDir = path.join(formpacksDir, formpackId);
  const manifestPath = path.join(baseDir, 'manifest.json');
  const schemaPath = path.join(baseDir, 'schema.json');
  const uiSchemaPath = path.join(baseDir, 'ui.schema.json');
  const examplePath = path.join(baseDir, 'examples', 'example.json');
  const i18nDePath = path.join(baseDir, 'i18n', 'de.json');
  const i18nEnPath = path.join(baseDir, 'i18n', 'en.json');

  const requiredFiles = [
    manifestPath,
    schemaPath,
    uiSchemaPath,
    examplePath,
    i18nDePath,
    i18nEnPath,
  ];

  await Promise.all(
    requiredFiles.map(async (filePath) => {
      try {
        await fs.access(filePath);
      } catch (error) {
        collectErrors(errors, formpackId, filePath, error);
      }
    }),
  );

  let manifest;
  let schema;
  let uiSchema;
  let example;
  let translationsDe;
  let translationsEn;

  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    collectErrors(errors, formpackId, manifestPath, error);
  }

  if (manifest !== undefined) {
    validateManifest(manifest, formpackId, manifestPath, errors);
  }

  try {
    schema = await readJson(schemaPath);
  } catch (error) {
    collectErrors(errors, formpackId, schemaPath, error);
  }

  try {
    uiSchema = await readJson(uiSchemaPath);
  } catch (error) {
    collectErrors(errors, formpackId, uiSchemaPath, error);
  }

  try {
    example = await readJson(examplePath);
  } catch (error) {
    collectErrors(errors, formpackId, examplePath, error);
  }

  try {
    translationsDe = await readJson(i18nDePath);
  } catch (error) {
    collectErrors(errors, formpackId, i18nDePath, error);
  }

  try {
    translationsEn = await readJson(i18nEnPath);
  } catch (error) {
    collectErrors(errors, formpackId, i18nEnPath, error);
  }

  if (isRecord(manifest)) {
    REQUIRED_MANIFEST_FIELDS.forEach((field) => {
      if (!(field in manifest)) {
        collectErrors(
          errors,
          formpackId,
          manifestPath,
          new Error(`Missing required field: ${field}`),
        );
      }
    });

    if (manifest.id !== formpackId) {
      collectErrors(
        errors,
        formpackId,
        manifestPath,
        new Error('Manifest id does not match formpack directory name.'),
      );
    }

    const locales = Array.isArray(manifest.locales) ? manifest.locales : [];
    if (!locales.includes('de') || !locales.includes('en')) {
      collectErrors(
        errors,
        formpackId,
        manifestPath,
        new Error('Manifest locales must include "de" and "en".'),
      );
    }

    if (manifest.defaultLocale && !locales.includes(manifest.defaultLocale)) {
      collectErrors(
        errors,
        formpackId,
        manifestPath,
        new Error(
          'Manifest defaultLocale must be one of the manifest locales.',
        ),
      );
    }

    const exportsList = Array.isArray(manifest.exports) ? manifest.exports : [];
    if (!exportsList.includes('docx') || !exportsList.includes('json')) {
      collectErrors(
        errors,
        formpackId,
        manifestPath,
        new Error('Manifest exports must include "docx" and "json".'),
      );
    }

    if (exportsList.includes('docx')) {
      if (!isRecord(manifest.docx)) {
        collectErrors(
          errors,
          formpackId,
          manifestPath,
          new Error('Manifest docx configuration is missing.'),
        );
      }

      if (!isRecord(manifest.docx?.templates)) {
        collectErrors(
          errors,
          formpackId,
          manifestPath,
          new Error('Manifest docx templates are missing.'),
        );
      }

      if (
        manifest.docx?.templates?.a4 &&
        !isSafeAssetPath(manifest.docx.templates.a4)
      ) {
        collectErrors(
          errors,
          formpackId,
          manifestPath,
          new Error('Manifest docx.templates.a4 must be a safe relative path.'),
        );
      }

      if (manifest.docx?.mapping && !isSafeAssetPath(manifest.docx.mapping)) {
        collectErrors(
          errors,
          formpackId,
          manifestPath,
          new Error('Manifest docx.mapping must be a safe relative path.'),
        );
      }
    }
  }

  const deKeys = getTranslationKeySet(translationsDe);
  const enKeys = getTranslationKeySet(translationsEn);
  const missingInDe = getMissingKeys(enKeys, deKeys);
  const missingInEn = getMissingKeys(deKeys, enKeys);

  if (missingInDe.length > 0) {
    collectErrors(
      errors,
      formpackId,
      i18nDePath,
      new Error(`Missing keys in de.json: ${missingInDe.join(', ')}`),
    );
  }

  if (missingInEn.length > 0) {
    collectErrors(
      errors,
      formpackId,
      i18nEnPath,
      new Error(`Missing keys in en.json: ${missingInEn.join(', ')}`),
    );
  }

  if (isRecord(manifest)) {
    const requiredKeys = [manifest.titleKey, manifest.descriptionKey].filter(
      (key) => typeof key === 'string',
    );

    requiredKeys.forEach((key) => {
      if (!deKeys.has(key)) {
        collectErrors(
          errors,
          formpackId,
          i18nDePath,
          new Error(`Missing i18n key: ${key}`),
        );
      }
      if (!enKeys.has(key)) {
        collectErrors(
          errors,
          formpackId,
          i18nEnPath,
          new Error(`Missing i18n key: ${key}`),
        );
      }
    });
  }

  const tKeys = new Set();
  if (schema) {
    collectTranslationKeys(schema, tKeys);
  }
  if (uiSchema) {
    collectTranslationKeys(uiSchema, tKeys);
  }

  tKeys.forEach((key) => {
    if (!deKeys.has(key)) {
      collectErrors(
        errors,
        formpackId,
        i18nDePath,
        new Error(`Missing i18n key referenced by schema: ${key}`),
      );
    }
    if (!enKeys.has(key)) {
      collectErrors(
        errors,
        formpackId,
        i18nEnPath,
        new Error(`Missing i18n key referenced by schema: ${key}`),
      );
    }
  });

  if (schema && example) {
    const exampleErrors = validateExample(schema, example);
    exampleErrors.forEach((message) =>
      collectErrors(
        errors,
        formpackId,
        examplePath,
        new Error(`Example does not match schema: ${message}`),
      ),
    );
  }

  if (isRecord(manifest?.docx?.templates)) {
    const templatePath =
      typeof manifest.docx.templates.a4 === 'string'
        ? manifest.docx.templates.a4
        : null;
    if (templatePath) {
      try {
        await fs.access(path.join(baseDir, templatePath));
      } catch (error) {
        collectErrors(errors, formpackId, templatePath, error);
      }
    } else if (
      Array.isArray(manifest.exports) &&
      manifest.exports.includes('docx')
    ) {
      collectErrors(
        errors,
        formpackId,
        manifestPath,
        new Error(
          'Manifest docx.templates.a4 is required when exports include docx.',
        ),
      );
    }
  }

  if (typeof manifest?.docx?.mapping === 'string') {
    try {
      await fs.access(path.join(baseDir, manifest.docx.mapping));
    } catch (error) {
      collectErrors(errors, formpackId, manifest.docx.mapping, error);
    }
  } else if (
    Array.isArray(manifest?.exports) &&
    manifest.exports.includes('docx')
  ) {
    collectErrors(
      errors,
      formpackId,
      manifestPath,
      new Error('Manifest docx.mapping is required when exports include docx.'),
    );
  }

  return {
    manifest,
    translations:
      typeof manifest?.defaultLocale === 'string' &&
      manifest.defaultLocale === 'en'
        ? translationsEn
        : translationsDe,
  };
};

const createLogger = (stream) => {
  const log = (message) => stream.write(`${message}\n`);
  return {
    log,
    info: (message) => log(`\u001b[34m${message}\u001b[0m`),
    pass: (message) => log(`\u001b[32m${message}\u001b[0m`),
    fail: (message) => log(`\u001b[31m${message}\u001b[0m`),
    warn: (message) => log(`\u001b[33m${message}\u001b[0m`),
    group: (label) => console.group(label),
    groupEnd: () => console.groupEnd(),
  };
};

/**
 * Run contract validation and DOCX preflight for formpacks.
 */
const run = async () => {
  const logger = createLogger(process.stdout);
  const { id } = parseArgs(process.argv.slice(2));
  const formpackIds = await listFormpacks(id);
  const errors = new Map();
  const warnings = new Map();

  if (id && formpackIds.length === 0) {
    collectErrors(errors, id, formpacksDir, new Error('Formpack not found.'));
  }

  const preflightQueue = [];

  for (const formpackId of formpackIds) {
    const { manifest, translations } = await validateContract({
      formpackId,
      errors,
    });

    if (!isRecord(manifest?.docx) || !isRecord(manifest.docx.templates)) {
      continue;
    }

    const mappingPath =
      typeof manifest.docx.mapping === 'string' ? manifest.docx.mapping : null;
    if (!mappingPath) {
      collectErrors(
        errors,
        formpackId,
        path.join(formpacksDir, formpackId, 'manifest.json'),
        new Error('DOCX mapping is missing from the formpack manifest.'),
      );
      continue;
    }

    const templates = manifest.docx.templates;
    const templatePaths = [templates.a4, templates.wallet].filter(
      (value) => typeof value === 'string',
    );

    preflightQueue.push({
      formpackId,
      mappingPath,
      templatePaths,
      translations: isRecord(translations) ? translations : {},
    });
  }

  for (const task of preflightQueue) {
    for (const templatePath of task.templatePaths) {
      await validateTemplate({
        templatePath,
        mappingPath: task.mappingPath,
        formpackId: task.formpackId,
        errors,
        warnings,
        translations: task.translations,
      });
    }
  }

  if (warnings.size > 0) {
    const totalWarnings = [...warnings.values()].reduce(
      (sum, packWarnings) => sum + packWarnings.length,
      0,
    );
    logger.warn(
      `\nFormpack validation passed with ${totalWarnings} warning(s) (templates need manual refinement):`,
    );
    for (const [formpackId, packWarnings] of warnings.entries()) {
      logger.group(`\n- ${formpackId}:`);
      packWarnings.forEach(({ contextPath, error }) => {
        const shortPath = contextPath.replace(repoRoot, '');
        const message = `${shortPath}: ${error.name ?? 'Error'} - ${
          error.message ?? ''
        }`;
        logger.warn(`  - ${message}`);
      });
      logger.groupEnd();
    }
  }

  if (errors.size > 0) {
    const totalErrors = [...errors.values()].reduce(
      (sum, packErrors) => sum + packErrors.length,
      0,
    );
    logger.fail(`\nFormpack validation failed with ${totalErrors} error(s).`);
    for (const [formpackId, packErrors] of errors.entries()) {
      logger.group(`\n- ${formpackId}:`);
      packErrors.forEach(({ contextPath, error }) => {
        const shortPath = contextPath.replace(repoRoot, '');
        const message = `${shortPath}: ${error.name ?? 'Error'} - ${
          error.message ?? ''
        }`;
        logger.fail(`  - ${message}`);
      });
      logger.groupEnd();
    }
    process.exitCode = 1;
    return;
  }

  logger.pass('\nFormpack validation passed.');
};

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await run();
}

export { collectTranslationKeys, getMissingKeys, getTranslationKeySet, run };
