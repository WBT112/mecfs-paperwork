/**
 * @file Contains the core logic for exporting data to DOCX format.
 * It handles DOCX template loading, data mapping, and report generation.
 */

import { createReport } from 'docx-templates/lib/browser.js';
import i18n from '../i18n';
import type { SupportedLocale } from '../i18n/locale';
import { buildDocumentModel } from '../formpacks/documentModel';
import type { DocumentModel } from '../formpacks/documentModel';
import {
  getDoctorLetterExportDefaults,
  hasDoctorLetterDecisionAnswers,
} from './doctorLetterDefaults';
import { getOfflabelAntragExportDefaults } from './offlabelAntragDefaults';
import { getNotfallpassExportDefaults } from './notfallpassDefaults';
import {
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
} from '../formpacks/loader';
import type {
  FormpackDocxManifest,
  FormpackManifest,
} from '../formpacks/types';
import {
  downloadBlobExport,
  formatExportDate,
  sanitizeFilenamePart,
} from './downloadUtils';
import { getRecord } from '../storage/records';
import { isRecord, getFirstItem } from '../lib/utils';
import { getPathValue, setPathValueMutableSafe } from '../lib/pathAccess';
import { resolveDisplayValue } from '../lib/displayValueResolver';
import { buildI18nContext } from './buildI18nContext';
import {
  DOCTOR_LETTER_FORMPACK_ID,
  NOTFALLPASS_FORMPACK_ID,
  OFFLABEL_ANTRAG_FORMPACK_ID,
} from '../formpacks/ids';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

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
export type DocxAdditionalContext = {
  t: ((key: string) => string) & Record<string, unknown>;
  formatDate: (value: string | null | undefined) => string;
  formatPhone: (value: string | null | undefined) => string;
};

export type DocxErrorKey =
  | 'formpackDocxErrorUnterminatedFor'
  | 'formpackDocxErrorIncompleteIf'
  | 'formpackDocxErrorInvalidSyntax'
  | 'formpackDocxErrorInvalidCommand'
  | 'formpackDocxExportError';

type MapTemplateOptions = {
  mappingPath?: string;
  locale?: SupportedLocale;
  schema?: RJSFSchema | null;
  uiSchema?: UiSchema | null;
};

/**
 * Product rule safety net:
 * - A4 is the standard template for all formpacks.
 * - Wallet templates are only supported for the notfallpass formpack.
 */
const assertTemplateAllowed = (
  formpackId: string,
  templateId: DocxTemplateId,
) => {
  if (templateId === 'wallet' && formpackId !== NOTFALLPASS_FORMPACK_ID) {
    throw new Error(
      'Wallet DOCX export is only supported for the notfallpass formpack.',
    );
  }
};

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const DOCX_CMD_DELIMITER: [string, string] = ['{{', '}}'];
const DOCX_LITERAL_DELIMITER = '§§DOCX_XML§§';
const DOCTOR_NAME_PATH = 'doctor.name';
// Session cache keeps DOCX assets available when the app is offline.
const docxMappingCache = new Map<string, DocxMapping>();
const docxTemplateCache = new Map<string, Uint8Array>();
const docxSchemaCache = new Map<string, RJSFSchema | null>();
const docxUiSchemaCache = new Map<string, UiSchema | null>();

const buildAssetPath = (formpackId: string, assetPath: string) =>
  `/formpacks/${formpackId}/${assetPath}`;
const buildCacheKey = (formpackId: string, assetPath: string) =>
  `${formpackId}:${assetPath}`;

const isSafeAssetPath = (value: string) => {
  // SECURITY: This is a critical security control.
  // It prevents path traversal attacks when loading DOCX assets.
  // Assets are loaded via fetch(), so a malicious formpack could otherwise
  // construct a path to access unintended files from the public/ directory.
  return Boolean(
    value &&
    value.trim().length > 0 &&
    !value.startsWith('/') &&
    !value.startsWith('\\') &&
    !value.includes('..'),
  );
};

const parseDocxMapping = (payload: unknown): DocxMapping => {
  if (!isRecord(payload)) {
    throw new TypeError('Invalid DOCX mapping payload.');
  }

  if (typeof payload.version !== 'number') {
    throw new TypeError('DOCX mapping payload must declare a version.');
  }

  // MVP: support only version 1 to keep the contract stable.
  if (payload.version !== 1) {
    throw new TypeError(
      `Unsupported DOCX mapping version: ${payload.version}.`,
    );
  }

  if (!Array.isArray(payload.fields)) {
    throw new TypeError('DOCX mapping payload must declare fields.');
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
    throw new TypeError(
      'DOCX mapping payload must contain at least one valid field mapping.',
    );
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

const buildDocxAdditionalContext = (
  formpackId: string,
  locale: SupportedLocale,
  i18nContext?: { t: Record<string, unknown> },
): DocxAdditionalContext => {
  const t = i18n.getFixedT(locale, `formpack:${formpackId}`);
  const tFn = ((key: string) =>
    t(key, { defaultValue: key })) as DocxAdditionalContext['t'];
  const tContext = i18nContext?.t ?? buildI18nContext(formpackId, locale).t;
  Object.assign(tFn, tContext);

  const formatDate = (value: string | null | undefined): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      date,
    );
  };

  const formatPhone = (value: string | null | undefined): string => {
    if (!value) return '';
    return String(value).trim();
  };

  return {
    t: tFn,
    formatDate,
    formatPhone,
  };
};

const coerceDocxError = (error: unknown): Error | null => {
  if (error instanceof Error) {
    return error;
  }

  if (Array.isArray(error)) {
    const first = error.find((entry) => entry instanceof Error);
    return first ?? null;
  }

  if (isRecord(error) && typeof error.message === 'string') {
    return new TypeError(error.message);
  }

  return null;
};

const stripDocxLiteralDelimiter = (value: string): string =>
  value.split(DOCX_LITERAL_DELIMITER).join('');

const encodeDocxLineBreaks = (value: string): string =>
  stripDocxLiteralDelimiter(value);

const pickCachedDocxSchema = <T>(
  formpackId: string,
  override: T | null | undefined,
  cache: Map<string, T | null>,
): T | null | undefined => {
  if (override !== undefined) {
    return override;
  }
  if (cache.has(formpackId)) {
    return cache.get(formpackId) ?? null;
  }
  return undefined;
};

/**
 * Maps docx-templates errors to user-facing i18n keys.
 */
export const getDocxErrorKey = (error: unknown): DocxErrorKey => {
  const target = coerceDocxError(error);
  if (!target) {
    // PRIVACY: Log only a generic message. The original 'error' object may
    // contain sensitive user data processed by the template engine.
    console.error('An unknown DOCX export error occurred.');
    return 'formpackDocxExportError';
  }

  switch (target.name) {
    case 'UnterminatedForLoopError':
      return 'formpackDocxErrorUnterminatedFor';
    case 'IncompleteConditionalStatementError':
      return 'formpackDocxErrorIncompleteIf';
    case 'TemplateParseError':
    case 'CommandSyntaxError':
      return 'formpackDocxErrorInvalidSyntax';
    case 'InvalidCommandError':
    case 'CommandExecutionError':
    case 'ObjectCommandResultError':
      return 'formpackDocxErrorInvalidCommand';
    default:
      // PRIVACY: Log only the error name for diagnostics. The original 'target'
      // object may contain sensitive user data processed by the template engine.
      console.error(`A DOCX export error occurred (type: ${target.name}).`);
      return 'formpackDocxExportError';
  }
};

const isEmptyTemplateValue = (value: unknown): boolean =>
  typeof value !== 'string' || value.trim().length === 0;

const cloneTemplateValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneTemplateValue(entry));
  }

  if (isRecord(value)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      cloned[key] = cloneTemplateValue(entry);
    }
    return cloned;
  }

  return value;
};

const cloneTemplateContext = (
  context: DocxTemplateContext,
): DocxTemplateContext => {
  if (typeof structuredClone === 'function') {
    return structuredClone(context);
  }
  return cloneTemplateValue(context) as DocxTemplateContext;
};

const applyDefaultForPath = (
  context: DocxTemplateContext,
  path: string,
  fallback: string,
): void => {
  const current = getPathValue(context, path);
  if (isEmptyTemplateValue(current)) {
    setPathValueMutableSafe(context, path, fallback);
  }
};

type PathFallbackEntry = readonly [path: string, fallback: string];

const applyDefaultsForPaths = (
  context: DocxTemplateContext,
  entries: readonly PathFallbackEntry[],
): void => {
  entries.forEach(([path, fallback]) => {
    applyDefaultForPath(context, path, fallback);
  });
};

const hasMappedPath = (mapping: DocxMapping, path: string): boolean =>
  mapping.fields.some((field) => field.path === path) ||
  Boolean(mapping.loops?.some((loop) => loop.path === path));

const shouldEmbedOfflabelLiabilityFallback = (
  formpackId: string,
  mapping: DocxMapping,
): boolean => {
  if (formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID) {
    return false;
  }
  return !hasMappedPath(mapping, 'arzt.liabilityParagraphs');
};

const appendOfflabelLiabilityFallbackToPart2 = (
  documentData: DocumentModel,
  formpackId: string,
  mapping: DocxMapping,
): DocumentModel => {
  if (!shouldEmbedOfflabelLiabilityFallback(formpackId, mapping)) {
    return documentData;
  }

  const liabilityParagraphsRaw = getPathValue(
    documentData,
    'arzt.liabilityParagraphs',
  );
  if (
    !Array.isArray(liabilityParagraphsRaw) ||
    liabilityParagraphsRaw.length < 1
  ) {
    return documentData;
  }

  const liabilityParagraphs = liabilityParagraphsRaw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
  if (liabilityParagraphs.length < 1) {
    return documentData;
  }

  const part2ParagraphsRaw = getPathValue(documentData, 'arzt.paragraphs');
  const part2Paragraphs = Array.isArray(part2ParagraphsRaw)
    ? part2ParagraphsRaw.map((entry) =>
        typeof entry === 'string' ? entry : '',
      )
    : [];
  const liabilityHeading = getPathValue(documentData, 'arzt.liabilityHeading');
  const liabilityHeadingText =
    typeof liabilityHeading === 'string' ? liabilityHeading.trim() : '';
  const liabilityDateLine = getPathValue(
    documentData,
    'arzt.liabilityDateLine',
  );
  const liabilityDateLineText =
    typeof liabilityDateLine === 'string' ? liabilityDateLine.trim() : '';
  const liabilitySignerName = getPathValue(
    documentData,
    'arzt.liabilitySignerName',
  );
  const liabilitySignerNameText =
    typeof liabilitySignerName === 'string' ? liabilitySignerName.trim() : '';

  const mergedPart2Paragraphs = [...part2Paragraphs];
  if (mergedPart2Paragraphs.length > 0 && mergedPart2Paragraphs.at(-1) !== '') {
    mergedPart2Paragraphs.push('');
  }
  if (liabilityHeadingText.length > 0) {
    mergedPart2Paragraphs.push(liabilityHeadingText, '');
  }
  mergedPart2Paragraphs.push(...liabilityParagraphs);
  if (liabilityDateLineText.length > 0 || liabilitySignerNameText.length > 0) {
    mergedPart2Paragraphs.push('');
  }
  if (liabilityDateLineText.length > 0) {
    mergedPart2Paragraphs.push(`Datum: ${liabilityDateLineText}`);
  }
  if (liabilitySignerNameText.length > 0) {
    mergedPart2Paragraphs.push(
      `Name Patient/in: ${liabilitySignerNameText}`,
      '',
      'Unterschrift: ____________________',
    );
  }

  const clonedDocumentData = cloneTemplateValue(documentData) as DocumentModel;
  setPathValueMutableSafe(
    clonedDocumentData as unknown as Record<string, unknown>,
    'arzt.paragraphs',
    mergedPart2Paragraphs,
  );
  return clonedDocumentData;
};

export const applyDocxExportDefaults = (
  context: DocxTemplateContext,
  formpackId: string,
  locale: SupportedLocale,
  sourceData?: Record<string, unknown>,
): DocxTemplateContext => {
  const normalized = cloneTemplateContext(context);
  if (
    formpackId !== DOCTOR_LETTER_FORMPACK_ID &&
    formpackId !== NOTFALLPASS_FORMPACK_ID &&
    formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID
  ) {
    return normalized;
  }

  if (formpackId === DOCTOR_LETTER_FORMPACK_ID) {
    const defaults = getDoctorLetterExportDefaults(locale);
    applyDefaultsForPaths(normalized, [
      ['patient.firstName', defaults.patient.firstName],
      ['patient.lastName', defaults.patient.lastName],
      ['patient.streetAndNumber', defaults.patient.streetAndNumber],
      ['patient.postalCode', defaults.patient.postalCode],
      ['patient.city', defaults.patient.city],
      [DOCTOR_NAME_PATH, defaults.doctor.name],
      ['doctor.streetAndNumber', defaults.doctor.streetAndNumber],
      ['doctor.postalCode', defaults.doctor.postalCode],
      ['doctor.city', defaults.doctor.city],
    ]);

    const shouldApplyDecisionFallback =
      !sourceData || !hasDoctorLetterDecisionAnswers(sourceData);
    if (shouldApplyDecisionFallback) {
      setPathValueMutableSafe(
        normalized,
        'decision.caseText',
        defaults.decision.fallbackCaseText,
      );
      setPathValueMutableSafe(normalized, 'decision.caseParagraphs', [
        defaults.decision.fallbackCaseText,
      ]);
    }
  }

  if (formpackId === NOTFALLPASS_FORMPACK_ID) {
    const defaults = getNotfallpassExportDefaults(locale);
    applyDefaultsForPaths(normalized, [
      ['person.name', defaults.person.name],
      ['person.birthDate', defaults.person.birthDate],
      ['diagnoses.formatted', defaults.diagnoses.formatted],
      ['symptoms', defaults.symptoms],
      ['allergies', defaults.allergies],
      [DOCTOR_NAME_PATH, defaults.doctor.name],
      ['doctor.phone', defaults.doctor.phone],
    ]);
  }

  if (formpackId === OFFLABEL_ANTRAG_FORMPACK_ID) {
    const defaults = getOfflabelAntragExportDefaults(locale);
    applyDefaultsForPaths(normalized, [
      ['patient.firstName', defaults.patient.firstName],
      ['patient.lastName', defaults.patient.lastName],
      ['patient.birthDate', defaults.patient.birthDate],
      ['patient.insuranceNumber', defaults.patient.insuranceNumber],
      ['patient.streetAndNumber', defaults.patient.streetAndNumber],
      ['patient.postalCode', defaults.patient.postalCode],
      ['patient.city', defaults.patient.city],
      ['doctor.practice', defaults.doctor.practice],
      [DOCTOR_NAME_PATH, defaults.doctor.name],
      ['doctor.streetAndNumber', defaults.doctor.streetAndNumber],
      ['doctor.postalCode', defaults.doctor.postalCode],
      ['doctor.city', defaults.doctor.city],
      ['insurer.name', defaults.insurer.name],
      ['insurer.department', defaults.insurer.department],
      ['insurer.streetAndNumber', defaults.insurer.streetAndNumber],
      ['insurer.postalCode', defaults.insurer.postalCode],
      ['insurer.city', defaults.insurer.city],
      ['request.drug', defaults.request.drug],
      ['request.selectedIndicationKey', defaults.request.selectedIndicationKey],
      [
        'request.standardOfCareTriedFreeText',
        defaults.request.standardOfCareTriedFreeText,
      ],
      ['attachmentsFreeText', defaults.attachmentsFreeText],
    ]);
  }

  return normalized;
};

export const ensureExportedAtIso = (
  context: DocxTemplateContext,
  exportedAt: Date = new Date(),
): DocxTemplateContext => {
  const normalized = cloneTemplateContext(context);
  if (getPathValue(normalized, 'exportedAtIso') === undefined) {
    setPathValueMutableSafe(
      normalized,
      'exportedAtIso',
      exportedAt.toISOString(),
    );
  }
  return normalized;
};

/**
 * IMPORTANT: Keep template values string-only.
 * docx-templates evaluates expressions and serializes XML; keeping values strings
 * avoids browser-side encoding surprises.
 */
type TemplateValueResolver = (
  value: unknown,
  schema?: RJSFSchema,
  uiSchema?: UiSchema,
  fieldPath?: string,
) => string;

const normalizeFieldValue = (
  value: unknown,
  resolveValue?: TemplateValueResolver,
  schemaNode?: RJSFSchema,
  uiNode?: UiSchema,
  fieldPath?: string,
): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (resolveValue) {
    return encodeDocxLineBreaks(
      resolveValue(value, schemaNode, uiNode, fieldPath),
    );
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return encodeDocxLineBreaks(String(value));
  }

  return '';
};

const normalizePrimitive = (
  entry: unknown,
  resolveValue?: TemplateValueResolver,
  schemaNode?: RJSFSchema,
  uiNode?: UiSchema,
  fieldPath?: string,
): string | null => {
  if (entry === null || entry === undefined) {
    return null;
  }
  if (typeof entry === 'string') {
    return encodeDocxLineBreaks(entry);
  }
  if (resolveValue) {
    return encodeDocxLineBreaks(
      resolveValue(entry, schemaNode, uiNode, fieldPath),
    );
  }
  if (typeof entry === 'number' || typeof entry === 'boolean') {
    return encodeDocxLineBreaks(String(entry));
  }
  return null;
};

const normalizeLoopRecord = (
  entry: Record<string, unknown>,
  resolveValue?: TemplateValueResolver,
  schemaNode?: RJSFSchema,
  uiNode?: UiSchema,
  fieldPath?: string,
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  const schemaProps =
    schemaNode && isRecord(schemaNode.properties)
      ? (schemaNode.properties as Record<string, RJSFSchema>)
      : null;
  const uiProps = isRecord(uiNode)
    ? (uiNode as Record<string, UiSchema>)
    : null;
  // RATIONALE: Sort entries for deterministic output ordering
  Object.entries(entry)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      const nextPath = fieldPath ? `${fieldPath}.${key}` : key;
      normalized[key] = normalizeFieldValue(
        value,
        resolveValue,
        schemaProps ? schemaProps[key] : undefined,
        uiProps ? uiProps[key] : undefined,
        nextPath,
      );
    });
  return normalized;
};

const normalizeLoopEntry = (
  entry: unknown,
  resolveValue?: TemplateValueResolver,
  schemaNode?: RJSFSchema,
  uiNode?: UiSchema,
  fieldPath?: string,
): unknown => {
  if (entry === null || entry === undefined) {
    return null;
  }

  if (isRecord(entry)) {
    return normalizeLoopRecord(
      entry,
      resolveValue,
      schemaNode,
      uiNode,
      fieldPath,
    );
  }

  return normalizePrimitive(entry, resolveValue, schemaNode, uiNode, fieldPath);
};

const pickChildSchema = (
  schemaProps: Record<string, RJSFSchema> | null,
  segment: string,
): RJSFSchema | null => {
  if (!schemaProps || !Object.hasOwn(schemaProps, segment)) {
    return null;
  }
  return schemaProps[segment];
};

const getSchemaNodeForPath = (
  schema: RJSFSchema | null | undefined,
  path: string,
): RJSFSchema | undefined => {
  if (!schema || !path) {
    return undefined;
  }

  let current: RJSFSchema | undefined = schema;
  for (const segment of path.split('.').filter(Boolean)) {
    const schemaProps = isRecord(current.properties)
      ? (current.properties as Record<string, RJSFSchema>)
      : null;
    const nextSchema = pickChildSchema(schemaProps, segment);
    if (nextSchema) {
      current = nextSchema;
      continue;
    }

    const itemSchema = getArrayItemSchema(current);
    if (!itemSchema) {
      return undefined;
    }
    current = itemSchema;
  }

  return current;
};

const getUiSchemaNodeForPath = (
  uiSchema: UiSchema | null | undefined,
  path: string,
): UiSchema | undefined => {
  if (!uiSchema || !path) {
    return undefined;
  }

  let current: UiSchema | undefined = uiSchema;
  for (const segment of path.split('.').filter(Boolean)) {
    if (!isRecord(current)) {
      return undefined;
    }

    const record = current;
    if (isRecord(record[segment])) {
      current = record[segment] as UiSchema;
      continue;
    }

    if (record.items && isRecord(record.items)) {
      const items = record.items as Record<string, unknown>;
      if (isRecord(items[segment])) {
        current = items[segment] as UiSchema;
        continue;
      }
      current = record.items as UiSchema;
      continue;
    }

    return undefined;
  }

  return current;
};

const getArrayItemSchema = (
  schemaNode: RJSFSchema | undefined,
): RJSFSchema | undefined => {
  const items = getFirstItem(schemaNode?.items) as unknown;
  return isRecord(items) ? (items as RJSFSchema) : undefined;
};

const getArrayItemUiSchema = (
  uiNode: UiSchema | undefined,
): UiSchema | undefined => {
  const items = getFirstItem(uiNode?.items) as unknown;
  return isRecord(items) ? (items as UiSchema) : undefined;
};

const addBlankLinesBetweenDoctorLetterParagraphs = (
  formpackId: string,
  path: string,
  entries: unknown[],
): unknown[] => {
  if (
    formpackId !== DOCTOR_LETTER_FORMPACK_ID ||
    path !== 'decision.caseParagraphs'
  ) {
    return entries;
  }

  if (entries.length < 2) {
    return entries;
  }

  const withSpacing: unknown[] = [];
  entries.forEach((entry, index) => {
    withSpacing.push(entry);
    if (index < entries.length - 1) {
      // RATIONALE: Keep one explicit blank DOCX paragraph between decision paragraphs
      // so marker-separated content keeps the expected visual spacing.
      withSpacing.push('');
    }
  });

  return withSpacing;
};

const loadDocxMapping = async (
  formpackId: string,
  mappingPath: string,
): Promise<DocxMapping> => {
  if (!isSafeAssetPath(mappingPath)) {
    throw new Error('Invalid DOCX mapping path.');
  }

  const cacheKey = buildCacheKey(formpackId, mappingPath);
  const cached = docxMappingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const assetPath = buildAssetPath(formpackId, mappingPath);
  const response = await fetch(assetPath, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load DOCX mapping for formpack:${formpackId} at ${assetPath} (${response.status}).`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(
      `Unable to parse DOCX mapping JSON for formpack:${formpackId} at ${assetPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const mapping = parseDocxMapping(payload);
  docxMappingCache.set(cacheKey, mapping);
  return mapping;
};

const loadDocxSchema = async (
  formpackId: string,
): Promise<RJSFSchema | null> => {
  if (docxSchemaCache.has(formpackId)) {
    return docxSchemaCache.get(formpackId) ?? null;
  }
  try {
    const schema = (await loadFormpackSchema(formpackId)) as
      | RJSFSchema
      | null
      | undefined;
    const normalized = schema ?? null;
    docxSchemaCache.set(formpackId, normalized);
    return normalized;
  } catch {
    docxSchemaCache.set(formpackId, null);
    return null;
  }
};

const loadDocxUiSchema = async (
  formpackId: string,
): Promise<UiSchema | null> => {
  if (docxUiSchemaCache.has(formpackId)) {
    return docxUiSchemaCache.get(formpackId) ?? null;
  }
  try {
    const uiSchema = (await loadFormpackUiSchema(formpackId)) as
      | UiSchema
      | null
      | undefined;
    const normalized = uiSchema ?? null;
    docxUiSchemaCache.set(formpackId, normalized);
    return normalized;
  } catch {
    docxUiSchemaCache.set(formpackId, null);
    return null;
  }
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
  const cachedSchema = pickCachedDocxSchema(
    formpackId,
    options.schema,
    docxSchemaCache,
  );
  const cachedUiSchema = pickCachedDocxSchema(
    formpackId,
    options.uiSchema,
    docxUiSchemaCache,
  );
  const [schema, uiSchema] = await Promise.all([
    cachedSchema ?? loadDocxSchema(formpackId),
    cachedUiSchema ?? loadDocxUiSchema(formpackId),
  ]);
  if (!docxSchemaCache.has(formpackId)) {
    docxSchemaCache.set(formpackId, schema ?? null);
  }
  if (!docxUiSchemaCache.has(formpackId)) {
    docxUiSchemaCache.set(formpackId, uiSchema ?? null);
  }
  const mappedDocumentData = appendOfflabelLiabilityFallbackToPart2(
    documentData,
    formpackId,
    mapping,
  );
  const resolveValue = (
    value: unknown,
    schemaNode?: RJSFSchema,
    uiNode?: UiSchema,
    fieldPath?: string,
  ) =>
    resolveDisplayValue(value, {
      t: (key, i18nOptions) =>
        key.startsWith('common.')
          ? i18n.getFixedT(locale, 'app')(key, i18nOptions)
          : i18n.getFixedT(locale, `formpack:${formpackId}`)(key, i18nOptions),
      namespace: 'app',
      formpackId,
      fieldPath,
      schema: schemaNode,
      uiSchema: uiNode,
    });

  const context: DocxTemplateContext = {
    ...buildI18nContext(formpackId, locale, mapping.i18n?.prefix),
  };

  mapping.fields.forEach((field) => {
    const fieldSchema = getSchemaNodeForPath(schema, field.path);
    const fieldUiSchema = getUiSchemaNodeForPath(uiSchema, field.path);
    const value = normalizeFieldValue(
      getPathValue(mappedDocumentData, field.path),
      resolveValue,
      fieldSchema,
      fieldUiSchema,
      field.path,
    );
    setPathValueMutableSafe(context, field.var, value);
  });

  mapping.loops?.forEach((loop) => {
    const value = getPathValue(mappedDocumentData, loop.path);
    const loopSchema = getSchemaNodeForPath(schema, loop.path);
    const loopUiSchema = getUiSchemaNodeForPath(uiSchema, loop.path);
    const itemSchema = getArrayItemSchema(loopSchema);
    const itemUiSchema = getArrayItemUiSchema(loopUiSchema);
    const entries = Array.isArray(value)
      ? value
          .map((entry) =>
            normalizeLoopEntry(
              entry,
              resolveValue,
              itemSchema,
              itemUiSchema,
              loop.path,
            ),
          )
          .filter((entry) => entry !== null && entry !== undefined)
      : [];
    const normalizedEntries = addBlankLinesBetweenDoctorLetterParagraphs(
      formpackId,
      loop.path,
      entries,
    );
    setPathValueMutableSafe(context, loop.var, normalizedEntries);
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

  const cacheKey = buildCacheKey(formpackId, templatePath);
  const cached = docxTemplateCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const assetPath = buildAssetPath(formpackId, templatePath);
  const response = await fetch(assetPath);

  if (!response.ok) {
    throw new Error(
      `Unable to load DOCX template for formpack:${formpackId} at ${assetPath} (${response.status}).`,
    );
  }

  const buffer = await response.arrayBuffer();
  const template = new Uint8Array(buffer);
  docxTemplateCache.set(cacheKey, template);
  return template;
};

/**
 * Builds the exported DOCX filename.
 */
export const buildDocxExportFilename = (
  formpackId: string,
  templateId: DocxTemplateId,
  exportedAt: Date = new Date(),
): string => {
  const safeFormpack = sanitizeFilenamePart(formpackId) || 'document';
  const safeTemplate = sanitizeFilenamePart(templateId) || 'export';
  return `${safeFormpack}-${safeTemplate}-${formatExportDate(exportedAt)}.docx`;
};

/**
 * Generates a DOCX report from a template and context.
 *
 * SECURITY: docx-templates uses eval() internally for template expressions.
 * Template files (.docx) are bundled and not user-supplied, so the eval scope
 * is controlled. The `data` context contains user form values — these are safe
 * because they are inserted via INS commands (string interpolation), not
 * executed as code. Do NOT set `noSandbox: true` or allow user-supplied
 * template files.
 *
 * Note: createReport can throw (template errors, missing placeholders, invalid loops).
 */
export const createDocxReport = async (
  template: Uint8Array,
  data: DocxTemplateContext,
  additionalJsContext?: DocxAdditionalContext,
  failFast: boolean = true,
): Promise<Uint8Array> => {
  return createReport({
    template,
    data,
    cmdDelimiter: DOCX_CMD_DELIMITER,
    literalXmlDelimiter: DOCX_LITERAL_DELIMITER,
    processLineBreaks: true,
    additionalJsContext,
    failFast,
  });
};

let docxWorker: Worker | null = null;
let workerRequestId = 0;
let workerFailed = false;
type DocxWorkerResponse =
  | { id: number; result: Uint8Array }
  | { id: number; error: string };
type PendingWorkerRequest = {
  resolve: (result: Uint8Array) => void;
  reject: (error: Error) => void;
};
const pendingWorkerRequests = new Map<number, PendingWorkerRequest>();

const rejectPendingWorkerRequests = (message: string): void => {
  const pending = [...pendingWorkerRequests.values()];
  pendingWorkerRequests.clear();
  for (const request of pending) {
    request.reject(new Error(message));
  }
};

const getDocxWorker = (): Worker | null => {
  if (workerFailed) return null;
  if (docxWorker) return docxWorker;
  try {
    docxWorker = new Worker(new URL('./docxReportWorker.ts', import.meta.url), {
      type: 'module',
    });
    docxWorker.addEventListener(
      'message',
      (event: MessageEvent<DocxWorkerResponse>) => {
        const request = pendingWorkerRequests.get(event.data.id);
        if (!request) return;
        pendingWorkerRequests.delete(event.data.id);
        if ('error' in event.data) {
          request.reject(new Error(event.data.error));
          return;
        }
        request.resolve(new Uint8Array(event.data.result));
      },
    );
    docxWorker.addEventListener('error', () => {
      workerFailed = true;
      rejectPendingWorkerRequests('DOCX worker failed.');
      docxWorker = null;
    });
    docxWorker.addEventListener('messageerror', () => {
      workerFailed = true;
      rejectPendingWorkerRequests(
        'DOCX worker message could not be deserialized.',
      );
      docxWorker = null;
    });
    return docxWorker;
  } catch {
    workerFailed = true;
    rejectPendingWorkerRequests('DOCX worker could not be created.');
    return null;
  }
};

const createDocxReportInWorker = (
  template: Uint8Array,
  data: DocxTemplateContext,
  tContext: Record<string, unknown>,
  locale: string,
  failFast: boolean,
): Promise<Uint8Array> => {
  const worker = getDocxWorker();
  if (!worker) return Promise.reject(new Error('Worker unavailable'));

  return new Promise((resolve, reject) => {
    const id = ++workerRequestId;
    pendingWorkerRequests.set(id, { resolve, reject });
    try {
      worker.postMessage({
        id,
        template,
        data,
        cmdDelimiter: DOCX_CMD_DELIMITER,
        literalXmlDelimiter: DOCX_LITERAL_DELIMITER,
        processLineBreaks: true,
        failFast,
        tContext,
        locale,
      });
    } catch (error) {
      pendingWorkerRequests.delete(id);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

/**
 * Downloads a DOCX report blob.
 */
export const downloadDocxExport = (
  report: Uint8Array | Blob,
  filename: string,
): void => {
  downloadBlobExport({
    blob: report,
    filename,
    mimeType: DOCX_MIME,
    defaultExtension: '.docx',
    errorMessage: 'DOCX export could not be generated.',
  });
};

export type ExportDocxOptions = {
  formpackId: string;
  recordId: string;
  variant: DocxTemplateId;
  locale: SupportedLocale;
  manifest?: FormpackManifest;
  schema?: RJSFSchema | null;
  uiSchema?: UiSchema | null;
};

/**
 * Generates a DOCX export blob for the given record and variant.
 */
export const exportDocx = async ({
  formpackId,
  recordId,
  variant,
  locale,
  manifest: manifestOverride,
  schema,
  uiSchema,
}: ExportDocxOptions): Promise<Blob> => {
  const manifest = manifestOverride ?? (await loadFormpackManifest(formpackId));
  if (!manifest.docx) {
    throw new Error('DOCX export assets are not configured for this formpack.');
  }

  const templatePath =
    variant === 'wallet'
      ? manifest.docx.templates.wallet
      : manifest.docx.templates.a4;

  if (!templatePath) {
    throw new Error(`DOCX template for ${variant} is not available.`);
  }

  const record = await getRecord(recordId);
  if (!record) {
    throw new Error('Unable to load the requested record.');
  }

  const documentModel = buildDocumentModel(formpackId, locale, record.data);
  const [template, templateContext] = await Promise.all([
    loadDocxTemplate(formpackId, templatePath),
    mapDocumentDataToTemplate(formpackId, variant, documentModel, {
      mappingPath: manifest.docx.mapping,
      locale,
      schema,
      uiSchema,
    }),
  ]);
  const normalizedContext = applyDocxExportDefaults(
    templateContext,
    formpackId,
    locale,
    record.data,
  );
  const contextWithExportDate = ensureExportedAtIso(normalizedContext);
  const tContext = isRecord(contextWithExportDate.t)
    ? contextWithExportDate.t
    : {};

  let report: Uint8Array;
  try {
    report = await createDocxReportInWorker(
      template,
      contextWithExportDate,
      tContext,
      locale,
      true,
    );
  } catch {
    report = await createDocxReport(
      template,
      contextWithExportDate,
      buildDocxAdditionalContext(formpackId, locale, { t: tContext }),
    );
  }

  return new Blob([new Uint8Array(report)], { type: DOCX_MIME });
};

/**
 * Preloads DOCX assets into memory to keep exports working after going offline.
 */
export const preloadDocxAssets = async (
  formpackId: string,
  docx: FormpackDocxManifest,
): Promise<void> => {
  const tasks = [
    loadDocxMapping(formpackId, docx.mapping),
    loadDocxTemplate(formpackId, docx.templates.a4),
  ];

  if (docx.templates.wallet) {
    tasks.push(loadDocxTemplate(formpackId, docx.templates.wallet));
  }

  await Promise.all(tasks);

  // Ensure schema caches are populated to avoid additional network calls
  // when exporting while offline. If schemas are unavailable, store null
  // so subsequent callers won't attempt network fetches.
  if (!docxSchemaCache.has(formpackId)) {
    docxSchemaCache.set(formpackId, null);
  }
  if (!docxUiSchemaCache.has(formpackId)) {
    docxUiSchemaCache.set(formpackId, null);
  }
};
