/* eslint-env node */
/* global console, process */
import { createReport } from 'docx-templates';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const formpacksDir = path.join(repoRoot, 'formpacks');
const CMD_DELIMITER = ['{{', '}}'];

const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSafeAssetPath = (value) => {
  if (!value || value.trim().length === 0) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  if (value.includes('..')) return false;
  return true;
};

const setPathValue = (target, pathValue, value) => {
  if (!pathValue || pathValue.trim().length === 0) {
    return;
  }

  const segments = pathValue.split('.');
  let cursor = target;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    if (!isRecord(cursor[segment])) {
      cursor[segment] = {};
    }

    cursor = cursor[segment];
  });
};

const setNested = (target, dottedKey, value) => {
  const segments = dottedKey.split('.').filter(Boolean);
  if (!segments.length) return;

  let cursor = target;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;
    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    if (!isRecord(cursor[segment])) {
      cursor[segment] = {};
    }

    cursor = cursor[segment];
  });
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

const collectErrors = (errors, templatePath, error) => {
  if (Array.isArray(error)) {
    error.forEach((entry) => collectErrors(errors, templatePath, entry));
    return;
  }

  const normalized =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown template error');
  errors.push({ templatePath, error: normalized });
};

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const listFormpacks = async () => {
  const entries = await fs.readdir(formpacksDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const validateTemplate = async ({
  templatePath,
  mappingPath,
  formpackId,
  errors,
  translations,
}) => {
  if (!isSafeAssetPath(templatePath)) {
    collectErrors(
      errors,
      templatePath,
      new Error('Invalid template path in formpack manifest.'),
    );
    return;
  }

  if (!isSafeAssetPath(mappingPath)) {
    collectErrors(
      errors,
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
    collectErrors(errors, templatePath, error);
    return;
  }

  try {
    mapping = await readJson(mappingFile);
  } catch (error) {
    collectErrors(errors, templatePath, error);
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
    collectErrors(errors, templatePath, error);
  }
};

const run = async () => {
  const formpackIds = await listFormpacks();
  const errors = [];

  for (const formpackId of formpackIds) {
    const manifestPath = path.join(formpacksDir, formpackId, 'manifest.json');
    let manifest;
    try {
      manifest = await readJson(manifestPath);
    } catch (error) {
      collectErrors(errors, manifestPath, error);
      continue;
    }

    if (!isRecord(manifest.docx) || !isRecord(manifest.docx.templates)) {
      continue;
    }

    const mappingPath =
      typeof manifest.docx.mapping === 'string' ? manifest.docx.mapping : null;
    if (!mappingPath) {
      collectErrors(
        errors,
        manifestPath,
        new Error('DOCX mapping is missing from the formpack manifest.'),
      );
      continue;
    }

    const defaultLocale =
      typeof manifest.defaultLocale === 'string'
        ? manifest.defaultLocale
        : 'de';
    let translations = {};
    try {
      const translationsPath = path.join(
        formpacksDir,
        formpackId,
        'i18n',
        `${defaultLocale}.json`,
      );
      translations = await readJson(translationsPath);
    } catch {
      translations = {};
    }

    const templates = manifest.docx.templates;
    const templatePaths = [templates.a4, templates.wallet].filter(
      (value) => typeof value === 'string',
    );

    for (const templatePath of templatePaths) {
      await validateTemplate({
        templatePath,
        mappingPath,
        formpackId,
        errors,
        translations,
      });
    }
  }

  if (errors.length > 0) {
    console.error('DOCX template preflight failed.');
    errors.forEach(({ templatePath, error }) => {
      console.error(
        `- ${templatePath}: ${error.name ?? 'Error'} - ${error.message ?? ''}`,
      );
    });
    process.exitCode = 1;
    return;
  }

  console.log('DOCX template preflight passed.');
};

await run();
