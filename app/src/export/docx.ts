import { createReport } from 'docx-templates';
import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';
import type { DocumentModel } from '../formpacks/documentModel';

export type DocxTemplateId = 'a4' | 'wallet';

type DocxMappingField = {
  var: string;
  path: string;
};

type DocxMappingLoop = {
  var: string;
  path: string;
};

type DocxMapping = {
  version: number;
  fields: DocxMappingField[];
  loops?: DocxMappingLoop[];
  i18n?: {
    prefix?: string;
  };
};

/**
 * Template context fed into docx-templates. Keys are created by mapping.json and by i18n context.
 * - Fields/loops get written into this object using the mapping's `var` paths.
 * - i18n keys get exposed as `t:<key>` strings so templates can render localized blocks.
 */
export type DocxTemplateContext = Record<string, unknown>;

type MapTemplateOptions = {
  mappingPath?: string;
  locale?: SupportedLocale;
};

/**
 * Product rule safety net:
 * - A4 is the standard template for all formpacks.
 * - Wallet templates are only supported for the notfallpass formpack.
 */
const assertTemplateAllowed = (formpackId: string, templateId: DocxTemplateId) => {
  if (templateId === 'wallet' && formpackId !== 'notfallpass') {
    throw new Error('Wallet DOCX export is only supported for the notfallpass formpack.');
  }
};

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const buildAssetPath = (formpackId: string, assetPath: string) =>
  `/formpacks/${formpackId}/${assetPath}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSafeAssetPath = (value: string) => {
  // Prevent path traversal and invalid absolute paths.
  if (!value || value.trim().length === 0) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  if (value.includes('..')) return false;
  return true;
};

const parseDocxMapping = (payload: unknown): DocxMapping => {
  if (!isRecord(payload)) {
    throw new Error('Invalid DOCX mapping payload.');
  }

  if (typeof payload.version !== 'number') {
    throw new Error('DOCX mapping payload must declare a version.');
  }

  // MVP: support only version 1 to keep the contract stable.
  if (payload.version !== 1) {
    throw new Error(`Unsupported DOCX mapping version: ${payload.version}.`);
  }

  if (!Array.isArray(payload.fields)) {
    throw new Error('DOCX mapping payload must declare fields.');
  }

  const fields = payload.fields.filter(
    (field): field is DocxMappingField =>
      isRecord(field) &&
      typeof field.var === 'string' &&
      field.var.trim().length > 0 &&
      typeof field.path === 'string' &&
      field.path.trim().length > 0,
  );

  if (!fields.length) {
    throw new Error('DOCX mapping payload must contain at least one valid field mapping.');
  }

  const loops = Array.isArray(payload.loops)
    ? payload.loops.filter(
        (loop): loop is DocxMappingLoop =>
          isRecord(loop) &&
          typeof loop.var === 'string' &&
          loop.var.trim().length > 0 &&
          typeof loop.path === 'string' &&
          loop.path.trim().length > 0,
      )
    : undefined;

  const i18nConfig = isRecord(payload.i18n)
    ? {
        prefix:
          typeof payload.i18n.prefix === 'string' ? payload.i18n.prefix : undefined,
      }
    : undefined;

  return {
    version: payload.version,
    fields,
    loops,
    i18n: i18nConfig,
  };
};

const getPathValue = (source: unknown, path: string): unknown => {
  if (!path) {
    return undefined;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current) && !Array.isArray(current)) {
      return undefined;
    }

    if (isRecord(current)) {
      return current[segment];
    }

    // Array access via numeric segments.
    const index = Number(segment);
    if (Number.isNaN(index)) {
      return undefined;
    }
    return current[index];
  }, source);
};

const setPathValue = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
) => {
  if (!path || path.trim().length === 0) {
    return;
  }

  const segments = path.split('.');
  let cursor: Record<string, unknown> = target;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;

    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    if (!isRecord(cursor[segment])) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  });
};

const normalizeFieldValue = (value: unknown): string | number | boolean => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return '';
};

const normalizeLoopEntry = (entry: unknown): unknown => {
  if (entry === null || entry === undefined) {
    return null;
  }

  if (!isRecord(entry)) {
    if (typeof entry === 'string') {
      return entry;
    }

    if (typeof entry === 'number' || typeof entry === 'boolean') {
      return entry.toString();
    }

    return null;
  }

  const normalized: Record<string, unknown> = {};
  Object.entries(entry).forEach(([key, value]) => {
    normalized[key] = normalizeFieldValue(value);
  });

  return normalized;
};

/**
 * Builds a flattened translation context for templates.
 *
 * Template usage pattern:
 * - Add placeholders like {{t:notfallpass.export.diagnoses.meCfs.paragraph}}
 * - Mapping can optionally filter to a prefix (e.g. "notfallpass.export")
 *
 * Note: This assumes the resource bundle is a flat key/value map (no nested objects).
 */
const buildI18nContext = (
  formpackId: string,
  locale: SupportedLocale,
  prefix?: string,
): Record<string, string> => {
  const namespace = `formpack:${formpackId}`;
  const context: Record<string, string> = {};

  let resources: Record<string, string> | null = null;
  try {
    resources = i18n.getResourceBundle(locale, namespace) as Record<string, string> | null;
  } catch {
    return context;
  }

  if (!resources) {
    return context;
  }

  const prefixFilter = prefix ? `${prefix}.` : null;

  Object.entries(resources).forEach(([key, value]) => {
    if (prefixFilter && !key.startsWith(prefixFilter)) {
      return;
    }
    context[`t:${key}`] = value;
  });

  return context;
};

const loadDocxMapping = async (
  formpackId: string,
  mappingPath: string,
): Promise<DocxMapping> => {
  if (!isSafeAssetPath(mappingPath)) {
    throw new Error('Invalid DOCX mapping path.');
  }

  const url = buildAssetPath(formpackId, mappingPath);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Unable to load DOCX mapping (${response.status}) from ${url}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Unable to parse DOCX mapping JSON from ${url}.`);
  }

  return parseDocxMapping(payload);
};

/**
 * Maps a document model into template-ready context data.
 */
export const mapDocumentDataToTemplate = async (
  formpackId: string,
  templateId: DocxTemplateId,
  documentData: DocumentModel,
  options: MapTemplateOptions = {},
): Promise<DocxTemplateContext> => {
  assertTemplateAllowed(formpackId, templateId);

  const locale = options.locale ?? (i18n.language as SupportedLocale);
  const mappingPath = options.mappingPath ?? 'docx/mapping.json';
  const mapping = await loadDocxMapping(formpackId, mappingPath);

  // Base context: i18n strings and minimal non-sensitive meta data.
  const context: DocxTemplateContext = {
    ...buildI18nContext(formpackId, locale, mapping.i18n?.prefix),
    meta: {
      formpackId,
      templateId,
      locale,
    },
  };

  mapping.fields.forEach((field) => {
    const value = normalizeFieldValue(getPathValue(documentData, field.path));
    setPathValue(context, field.var, value);
  });

  mapping.loops?.forEach((loop) => {
    const value = getPathValue(documentData, loop.path);
    const entries = Array.isArray(value)
      ? value
          .map(normalizeLoopEntry)
          .filter((entry) => entry !== null && entry !== undefined)
      : [];
    setPathValue(context, loop.var, entries);
  });

  return context;
};

/**
 * Loads a DOCX template asset for a formpack.
 */
export const loadDocxTemplate = async (
  formpackId: string,
  templatePath: string,
): Promise<Uint8Array> => {
  if (!isSafeAssetPath(templatePath)) {
    throw new Error('Invalid DOCX template path.');
  }

  const url = buildAssetPath(formpackId, templatePath);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to load DOCX template (${response.status}) from ${url}.`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const formatExportDate = (value: Date) =>
  value.toISOString().slice(0, 10).replace(/-/g, '');

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-') // Windows reserved characters
    .replace(/\s+/g, '-')
    .slice(0, 80);

/**
 * Builds the exported DOCX filename.
 */
export const buildDocxExportFilename = (
  formpackId: string,
  templateId: DocxTemplateId,
  exportedAt: Date = new Date(),
): string => {
  const safeFormpack = sanitizeFilenamePart(formpackId || 'document');
  const safeTemplate = sanitizeFilenamePart(templateId);
  return `${safeFormpack}-${safeTemplate}-${formatExportDate(exportedAt)}.docx`;
};

/**
 * Generates a DOCX report from a template and context.
 *
 * Note: createReport can throw (template errors, missing placeholders, invalid loops).
 * We surface a sanitized error message (no form data).
 */
export const createDocxReport = async (
  template: Uint8Array,
  data: DocxTemplateContext,
): Promise<Uint8Array> => {
  try {
    return await createReport({
      template,
      data,
    });
  } catch (error) {
    // Do not include `data` in the error message.
    const message =
      error instanceof Error ? error.message : 'Unknown DOCX export error.';
    throw new Error(`Unable to generate DOCX report: ${message}`);
  }
};

/**
 * Downloads a DOCX report blob.
 *
 * Hardening:
 * - Forces an ArrayBuffer-backed copy before Blob creation to avoid TS/DOM typing issues
 *   involving Uint8Array<ArrayBufferLike> / SharedArrayBuffer.
 */
export const downloadDocxExport = (
  report: Uint8Array,
  filename: string,
): void => {
  const safeFilename = filename.toLowerCase().endsWith('.docx')
    ? filename
    : `${filename}.docx`;

  // Force an ArrayBuffer-backed copy to satisfy BlobPart typings in strict DOM libs.
  const bytes = new Uint8Array(report);

  const blob = new Blob([bytes], { type: DOCX_MIME });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
