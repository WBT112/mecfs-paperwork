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

export type DocxTemplateContext = Record<string, unknown>;

type MapTemplateOptions = {
  mappingPath?: string;
  locale?: SupportedLocale;
};

const buildAssetPath = (formpackId: string, assetPath: string) =>
  `/formpacks/${formpackId}/${assetPath}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseDocxMapping = (payload: unknown): DocxMapping => {
  if (!isRecord(payload)) {
    throw new Error('Invalid DOCX mapping payload.');
  }

  if (typeof payload.version !== 'number') {
    throw new Error('DOCX mapping payload must declare a version.');
  }

  if (!Array.isArray(payload.fields)) {
    throw new Error('DOCX mapping payload must declare fields.');
  }

  const fields = payload.fields.filter(
    (field): field is DocxMappingField =>
      isRecord(field) &&
      typeof field.var === 'string' &&
      typeof field.path === 'string',
  );

  if (!fields.length) {
    throw new Error('DOCX mapping payload has no valid fields.');
  }

  const loops = Array.isArray(payload.loops)
    ? payload.loops.filter(
        (loop): loop is DocxMappingLoop =>
          isRecord(loop) &&
          typeof loop.var === 'string' &&
          typeof loop.path === 'string',
      )
    : undefined;

  const i18nConfig = isRecord(payload.i18n)
    ? {
        prefix:
          typeof payload.i18n.prefix === 'string'
            ? payload.i18n.prefix
            : undefined,
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
  const segments = path.split('.');
  let cursor: Record<string, unknown> = target;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
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

const buildI18nContext = (
  formpackId: string,
  locale: SupportedLocale,
  prefix?: string,
): Record<string, string> => {
  const namespace = `formpack:${formpackId}`;
  const resources = i18n.getResourceBundle(locale, namespace) as Record<
    string,
    string
  > | null;

  if (!resources) {
    return {};
  }

  const context: Record<string, string> = {};
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
  const response = await fetch(buildAssetPath(formpackId, mappingPath), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Unable to load DOCX mapping.');
  }

  return parseDocxMapping(await response.json());
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
  void templateId;
  const locale = options.locale ?? (i18n.language as SupportedLocale);
  const mappingPath = options.mappingPath ?? 'docx/mapping.json';
  const mapping = await loadDocxMapping(formpackId, mappingPath);
  const context: DocxTemplateContext = {
    ...buildI18nContext(formpackId, locale, mapping.i18n?.prefix),
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
  const response = await fetch(buildAssetPath(formpackId, templatePath));

  if (!response.ok) {
    throw new Error('Unable to load DOCX template.');
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const formatExportDate = (value: Date) =>
  value.toISOString().slice(0, 10).replace(/-/g, '');

/**
 * Builds the exported DOCX filename.
 */
export const buildDocxExportFilename = (
  formpackId: string,
  templateId: DocxTemplateId,
  exportedAt: Date = new Date(),
): string => `${formpackId}-${templateId}-${formatExportDate(exportedAt)}.docx`;

/**
 * Generates a DOCX report from a template and context.
 */
export const createDocxReport = async (
  template: Uint8Array,
  data: DocxTemplateContext,
): Promise<Uint8Array> =>
  createReport({
    template,
    data,
    additionalJsContext: {},
  });

/**
 * Downloads a DOCX report blob.
 */
export const downloadDocxExport = (
  report: Uint8Array,
  filename: string,
): void => {
  const blob = new Blob([report], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
