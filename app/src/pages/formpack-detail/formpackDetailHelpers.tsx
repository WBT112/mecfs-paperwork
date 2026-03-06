import { loadFormpackI18n } from '../../i18n/formpack';
import type { SupportedLocale } from '../../i18n/locale';
import { resolveDisplayValue } from '../../lib/displayValueResolver';
import { hasPreviewValue } from '../../lib/previewValue';
import { getFirstItem, isRecord } from '../../lib/utils';
import type { JsonEncryptionEnvelope } from '../../lib/jsonEncryption';
import {
  FormpackLoaderError,
  DOCTOR_LETTER_FORMPACK_ID,
  OFFLABEL_ANTRAG_FORMPACK_ID,
  isFormpackVisible,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
  resolveDecisionTree,
  type DecisionData,
  type FormpackManifest,
  type getFieldVisibility,
} from '../../formpacks';
import {
  isCompletedCase0Path,
  normalizeDecisionAnswers,
} from '../../formpacks/doctor-letter/decisionAnswers';
import {
  getMedicationIndications,
  getVisibleMedicationKeys,
  getVisibleMedicationOptions,
  isMedicationKey,
  resolveMedicationProfile,
} from '../../formpacks/offlabel-antrag/medications';
import { normalizeParagraphText } from '../../lib/text/paragraphs';
import { getPathValue } from '../../lib/pathAccess';
import type { ReactNode } from 'react';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { OfflabelFocusTarget } from '../../formpacks/offlabel-antrag/focusTarget';
import type { OfflabelRenderedDocument } from '../../formpacks/offlabel-antrag/content/buildOfflabelDocuments';

type FormDataState = Record<string, unknown>;

/**
 * Result shape returned after attempting to load manifest and schema assets.
 */
export type ManifestLoadResult = {
  manifest: FormpackManifest | null;
  schema: RJSFSchema | null;
  uiSchema: UiSchema | null;
  errorMessage: string | null;
};

const FORMPACK_ERROR_KEYS: Partial<
  Record<FormpackLoaderError['code'], string>
> = {
  network: 'formpackLoadError',
  schema_not_found: 'formpackSchemaNotFound',
  schema_invalid: 'formpackSchemaInvalid',
  schema_unavailable: 'formpackSchemaUnavailable',
  ui_schema_not_found: 'formpackUiSchemaNotFound',
  ui_schema_invalid: 'formpackUiSchemaInvalid',
  ui_schema_unavailable: 'formpackUiSchemaUnavailable',
  not_found: 'formpackNotFound',
  unsupported: 'formpackUnsupported',
  invalid: 'formpackInvalid',
};

const JSON_ENCRYPTION_KIND = 'mecfs-paperwork-json-encrypted';

type JsonEncryptionRuntimeErrorCode =
  | 'crypto_unsupported'
  | 'invalid_envelope'
  | 'decrypt_failed';

const isJsonEncryptionRuntimeError = (
  error: unknown,
): error is { code: JsonEncryptionRuntimeErrorCode } => {
  if (!isRecord(error)) {
    return false;
  }

  const code = error.code;
  return (
    error.name === 'JsonEncryptionError' &&
    typeof code === 'string' &&
    (code === 'crypto_unsupported' ||
      code === 'invalid_envelope' ||
      code === 'decrypt_failed')
  );
};

const loadFormpackAssets = async (
  formpackId: string,
  locale: SupportedLocale,
  t: (key: string) => string,
): Promise<ManifestLoadResult> => {
  const manifest = await loadFormpackManifest(formpackId);
  if (!isFormpackVisible(manifest)) {
    return {
      manifest: null,
      schema: null,
      uiSchema: null,
      errorMessage: t('formpackNotFound'),
    };
  }

  await loadFormpackI18n(formpackId, locale);
  const [schemaData, uiSchemaData] = await Promise.all([
    loadFormpackSchema(formpackId),
    loadFormpackUiSchema(formpackId),
  ]);

  return {
    manifest,
    schema: schemaData as RJSFSchema,
    uiSchema: uiSchemaData as UiSchema,
    errorMessage: null,
  };
};

const buildErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): string => {
  if (error instanceof FormpackLoaderError) {
    const key = FORMPACK_ERROR_KEYS[error.code];
    if (key) {
      return t(key);
    }
  }

  return t('formpackLoadError');
};

const tryParseEncryptedEnvelope = (
  rawJson: string,
): JsonEncryptionEnvelope | null => {
  const normalized = rawJson.replace(/^\uFEFF/, '').trimStart();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }

    return parsed.kind === JSON_ENCRYPTION_KIND
      ? (parsed as JsonEncryptionEnvelope)
      : null;
  } catch {
    return null;
  }
};

const loadJsonEncryptionModule = async () => import('../../lib/jsonEncryption');

const OFFLABEL_FOCUS_SELECTOR_BY_TARGET: Record<OfflabelFocusTarget, string> = {
  'request.otherDrugName':
    '#root_request_otherDrugName, [name="root_request_otherDrugName"]',
  'request.selectedIndicationKey':
    '#root_request_selectedIndicationKey, [name="root_request_selectedIndicationKey"]',
  'request.indicationFullyMetOrDoctorConfirms':
    '#root_request_indicationFullyMetOrDoctorConfirms_0, input[name="root_request_indicationFullyMetOrDoctorConfirms"]',
};

const hasLetterLayout = (formpackId: string | null): boolean =>
  formpackId === DOCTOR_LETTER_FORMPACK_ID ||
  formpackId === OFFLABEL_ANTRAG_FORMPACK_ID;

const resolveImportErrorMessage = (
  error: { code: string; message?: string },
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  switch (error.code) {
    case 'invalid_json':
      return error.message
        ? t('importInvalidJsonWithDetails', { message: error.message })
        : t('importInvalidJson');
    case 'unknown_formpack':
      return t('importUnknownFormpack');
    case 'schema_mismatch':
      return t('importSchemaMismatch');
    case 'formpack_mismatch':
      return t('importFormpackMismatch');
    case 'invalid_revisions':
      return t('importInvalidRevisions');
    case 'unsupported_locale':
      return t('importUnsupportedLocale');
    default:
      return t('importInvalidPayload');
  }
};

const resolveJsonEncryptionErrorMessage = (
  error: unknown,
  mode: 'export' | 'import',
  t: (key: string) => string,
): string => {
  if (isJsonEncryptionRuntimeError(error)) {
    if (error.code === 'crypto_unsupported') {
      return t('jsonEncryptionUnsupported');
    }
    if (error.code === 'decrypt_failed') {
      return t('importPasswordInvalid');
    }
    return t('importEncryptedPayloadInvalid');
  }

  return mode === 'export'
    ? t('formpackJsonExportError')
    : t('importInvalidJson');
};

const resolveActionSourceElement = (
  target: EventTarget | null,
): HTMLElement | null => {
  if (target instanceof HTMLElement) {
    return target;
  }
  if (target instanceof Node) {
    const parentElement = target.parentElement;
    return parentElement instanceof HTMLElement ? parentElement : null;
  }
  return null;
};

const getActionButtonDataAction = (
  target: EventTarget | null,
): string | null => {
  const element = resolveActionSourceElement(target);
  if (!element) {
    return null;
  }

  const actionButton = element.closest('button.app__button');
  if (!(actionButton instanceof HTMLButtonElement)) {
    return null;
  }

  return actionButton.dataset.action ?? '';
};

const DECISION_VISIBILITY_FIELDS = [
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
] as const;

function applyFieldVisibility(
  decisionUiSchema: Record<string, unknown>,
  visibility: ReturnType<typeof getFieldVisibility>,
): void {
  for (const field of DECISION_VISIBILITY_FIELDS) {
    if (!visibility[field]) {
      if (!isRecord(decisionUiSchema[field])) {
        decisionUiSchema[field] = {};
      }
      const fieldSchema = decisionUiSchema[field] as Record<string, unknown>;
      fieldSchema['ui:widget'] = 'hidden';
    }
  }
}

function shouldHideCase0Result(decision: DecisionData): boolean {
  const result = resolveDecisionTree(normalizeDecisionAnswers(decision));
  const isCase0 = result.caseId === 0;

  if (!isCase0) {
    return false;
  }

  return !isCompletedCase0Path(decision);
}

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

function hasSameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (const [index, entry] of left.entries()) {
    if (entry !== right[index]) {
      return false;
    }
  }

  return true;
}

const mergeDummyPatch = (base: unknown, patch: unknown): unknown => {
  if (patch === undefined) {
    return base;
  }
  if (Array.isArray(patch)) {
    return patch;
  }
  if (!isRecord(base) || !isRecord(patch)) {
    return patch;
  }

  const next: Record<string, unknown> = { ...base };
  for (const [key, patchValue] of Object.entries(patch)) {
    next[key] = mergeDummyPatch(base[key], patchValue);
  }
  return next;
};

const normalizeOfflabelRequest = (
  request: Record<string, unknown>,
  showDevMedications: boolean,
): Record<string, unknown> => {
  const visibleMedicationKeys = getVisibleMedicationKeys(showDevMedications);
  const requestedDrug = isMedicationKey(request.drug) ? request.drug : null;
  const normalizedDrug =
    requestedDrug && visibleMedicationKeys.includes(requestedDrug)
      ? requestedDrug
      : null;

  if (!normalizedDrug) {
    const {
      drug: _unusedDrug,
      selectedIndicationKey: _unusedIndication,
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      applySection2Abs1a: _unusedSection2Fallback,
      ...rest
    } = request;
    return rest;
  }

  const profile = resolveMedicationProfile(normalizedDrug);
  const requestedIndicationKey =
    typeof request.selectedIndicationKey === 'string'
      ? request.selectedIndicationKey
      : '';
  const hasMultipleIndications = profile.indications.length > 1;
  const fallbackIndicationKey = hasMultipleIndications
    ? ''
    : (profile.indications[0]?.key ?? '');
  const hasValidIndication =
    requestedIndicationKey.length > 0 &&
    profile.indications.some((entry) => entry.key === requestedIndicationKey);
  const normalizedIndicationKey = hasValidIndication
    ? requestedIndicationKey
    : fallbackIndicationKey;

  if (profile.isOther) {
    const {
      selectedIndicationKey: _unused,
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      applySection2Abs1a: _unusedSection2Fallback,
      ...otherRequest
    } = request;
    return {
      ...otherRequest,
      drug: normalizedDrug,
    };
  }

  const hasCompletedIndicationStep = normalizedIndicationKey.length > 0;
  const requestedIndicationConfirmation =
    request.indicationFullyMetOrDoctorConfirms;
  const hasSelectedIndicationConfirmation =
    requestedIndicationConfirmation === 'yes' ||
    requestedIndicationConfirmation === 'no';

  const normalizedRequest: Record<string, unknown> = {
    ...request,
    drug: normalizedDrug,
    selectedIndicationKey: normalizedIndicationKey,
  };

  if (!hasCompletedIndicationStep) {
    const {
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      applySection2Abs1a: _unusedSection2Fallback,
      ...withoutIndicationConfirmation
    } = normalizedRequest;
    return withoutIndicationConfirmation;
  }

  if (!hasSelectedIndicationConfirmation) {
    const {
      indicationFullyMetOrDoctorConfirms: _unusedIndicationConfirmation,
      ...withoutIndicationConfirmation
    } = normalizedRequest;
    if (typeof request.applySection2Abs1a !== 'boolean') {
      const {
        applySection2Abs1a: _unusedSection2Fallback,
        ...withoutFallback
      } = withoutIndicationConfirmation;
      return withoutFallback;
    }
    return withoutIndicationConfirmation;
  }

  if (typeof request.applySection2Abs1a !== 'boolean') {
    const { applySection2Abs1a: _unusedSection2Fallback, ...withoutFallback } =
      normalizedRequest;
    return withoutFallback;
  }

  return {
    ...normalizedRequest,
  };
};

const buildOfflabelFormSchema = (
  schema: RJSFSchema,
  formData: FormDataState,
  showDevMedications: boolean,
  locale: SupportedLocale = 'de',
): RJSFSchema => {
  if (!isRecord(schema.properties)) {
    return schema;
  }

  const requestSchemaNode = (schema.properties as Record<string, unknown>)
    .request;
  if (!isRecord(requestSchemaNode) || !isRecord(requestSchemaNode.properties)) {
    return schema;
  }

  const requestProperties = requestSchemaNode.properties;
  const selectedIndicationSchemaNode = requestProperties.selectedIndicationKey;
  const selectedDrugSchemaNode = requestProperties.drug;
  if (
    !isRecord(selectedIndicationSchemaNode) ||
    !isRecord(selectedDrugSchemaNode)
  ) {
    return schema;
  }

  const visibleMedicationKeys = getVisibleMedicationOptions(
    locale,
    showDevMedications,
  ).map(({ key }) => key);
  const normalizedRequest = normalizeOfflabelRequest(
    {
      drug: getPathValue(formData, 'request.drug'),
    },
    showDevMedications,
  );
  const scopedIndicationEnum = getMedicationIndications(
    normalizedRequest.drug,
    locale,
  ).map((indication) => indication.key);
  const currentIndicationEnum = toStringArray(
    selectedIndicationSchemaNode.enum,
  );
  const nextIndicationEnum =
    scopedIndicationEnum.length > 0
      ? scopedIndicationEnum
      : currentIndicationEnum;
  const currentDrugEnum = toStringArray(selectedDrugSchemaNode.enum);

  if (
    hasSameStringArray(currentDrugEnum, visibleMedicationKeys) &&
    hasSameStringArray(currentIndicationEnum, nextIndicationEnum)
  ) {
    return schema;
  }

  const clonedSchema = structuredClone(schema);
  if (!isRecord(clonedSchema.properties)) {
    return schema;
  }
  const clonedRequestSchemaNode = (
    clonedSchema.properties as Record<string, unknown>
  ).request;
  if (
    !isRecord(clonedRequestSchemaNode) ||
    !isRecord(clonedRequestSchemaNode.properties)
  ) {
    return schema;
  }
  const clonedRequestProperties = clonedRequestSchemaNode.properties;
  const clonedSelectedIndicationNode =
    clonedRequestProperties.selectedIndicationKey;
  const clonedSelectedDrugNode = clonedRequestProperties.drug;
  if (
    !isRecord(clonedSelectedIndicationNode) ||
    !isRecord(clonedSelectedDrugNode)
  ) {
    return schema;
  }

  clonedSelectedDrugNode.enum = [...visibleMedicationKeys];
  clonedSelectedIndicationNode.enum = [...nextIndicationEnum];
  return clonedSchema;
};

type PreviewValueResolver = (
  value: unknown,
  schema?: RJSFSchema,
  uiSchema?: UiSchema,
  fieldPath?: string,
) => ReactNode;

const getOrderedKeys = (
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  value: Record<string, unknown>,
): string[] => {
  const schemaProps =
    schemaNode && isRecord(schemaNode.properties)
      ? (schemaNode.properties as Record<string, RJSFSchema>)
      : null;
  const keys = Array.from(
    new Set([
      ...(schemaProps ? Object.keys(schemaProps) : []),
      ...Object.keys(value),
    ]),
  );
  const uiOrderRaw =
    isRecord(uiNode) && Array.isArray(uiNode['ui:order'])
      ? uiNode['ui:order']
      : null;
  if (!uiOrderRaw) {
    return keys;
  }
  const order = uiOrderRaw.filter((entry) => typeof entry === 'string');
  const remaining = keys.filter((key) => !order.includes(key) && key !== '*');
  if (order.includes('*')) {
    const ordered: string[] = [];
    order.forEach((entry) => {
      if (entry === '*') {
        ordered.push(...remaining);
        return;
      }
      if (keys.includes(entry)) {
        ordered.push(entry);
      }
    });
    return ordered;
  }
  return [...order.filter((entry) => entry !== '*'), ...remaining];
};

const getUiSchemaNode = (
  uiNode: UiSchema | null | undefined,
  key: string,
): UiSchema | undefined => {
  if (!isRecord(uiNode)) {
    return undefined;
  }
  const entry = (uiNode as Record<string, unknown>)[key];
  return isRecord(entry) ? (entry as UiSchema) : undefined;
};

const getItemSchema = (
  schemaNode: RJSFSchema | undefined,
): RJSFSchema | undefined =>
  getFirstItem(schemaNode?.items) as RJSFSchema | undefined;

const getItemUiSchema = (
  uiNode: UiSchema | null | undefined,
): UiSchema | undefined => getFirstItem(uiNode?.items) as UiSchema | undefined;

const buildFieldPath = (segment: string, prefix?: string): string =>
  prefix ? `${prefix}.${segment}` : segment;

const normalizeParagraphs = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
};

const isDecisionCaseTextPath = (
  fieldPath?: string,
): fieldPath is 'decision.caseText' | 'decision.resolvedCaseText' =>
  fieldPath === 'decision.caseText' ||
  fieldPath === 'decision.resolvedCaseText';

const isDecisionCaseParagraphsPath = (
  fieldPath?: string,
): fieldPath is 'decision.caseParagraphs' =>
  fieldPath === 'decision.caseParagraphs';

const renderParagraphs = (
  paragraphs: string[],
  keyPrefix: string,
): ReactNode => {
  const counts = new Map<string, number>();

  return (
    <>
      {paragraphs.map((paragraph) => {
        const count = counts.get(paragraph) ?? 0;
        counts.set(paragraph, count + 1);
        const key = `${keyPrefix}-${paragraph}-${count}`;

        return <p key={key}>{paragraph}</p>;
      })}
    </>
  );
};

type OfflabelRenderedBlock = OfflabelRenderedDocument['blocks'][number];
const OFFLABEL_PART2_CONSENT_HEADING_PREFIX =
  'Aufklärung und Einwilligung zum Off-Label-Use:';

const getOfflabelPreviewBlockKey = (
  documentId: string,
  block: OfflabelRenderedBlock,
): string => {
  if (block.kind === 'list') {
    return `${documentId}-${block.kind}-${block.items.join('|')}`;
  }
  if (block.kind === 'pageBreak') {
    return `${documentId}-${block.kind}`;
  }
  return `${documentId}-${block.kind}-${block.text}`;
};

const renderOfflabelPreviewBlock = (
  documentId: string,
  block: OfflabelRenderedBlock,
): ReactNode => {
  const blockKey = getOfflabelPreviewBlockKey(documentId, block);

  if (block.kind === 'heading') {
    return <h3 key={blockKey}>{block.text}</h3>;
  }

  if (block.kind === 'paragraph') {
    return <p key={blockKey}>{block.text}</p>;
  }

  if (block.kind === 'list') {
    if (!block.items.length) {
      return null;
    }

    return (
      <ul key={blockKey}>
        {block.items.map((item) => (
          <li key={`${documentId}-${block.kind}-${item}`}>{item}</li>
        ))}
      </ul>
    );
  }

  return null;
};

const renderOfflabelPreviewDocument = (
  document: OfflabelRenderedDocument,
): ReactNode => (
  <div key={document.id}>
    {document.blocks.map((block) =>
      renderOfflabelPreviewBlock(document.id, block),
    )}
  </div>
);

const stripOfflabelPart2ConsentFromPreview = (
  document: OfflabelRenderedDocument,
): OfflabelRenderedDocument => {
  if (document.id !== 'part2') {
    return document;
  }

  const consentHeadingIndex = document.blocks.findIndex(
    (block) =>
      block.kind === 'heading' &&
      block.text.startsWith(OFFLABEL_PART2_CONSENT_HEADING_PREFIX),
  );

  if (consentHeadingIndex < 0) {
    return document;
  }

  return {
    ...document,
    blocks: document.blocks.slice(0, consentHeadingIndex),
  };
};

const hasDecisionCaseText = (value: Record<string, unknown>): boolean =>
  typeof value.caseText === 'string' ||
  typeof value.resolvedCaseText === 'string';

const getDecisionVisibleKeys = (
  keys: string[],
  decisionParagraphs: string[],
  includesDecisionCaseText: boolean,
): string[] =>
  decisionParagraphs.length && includesDecisionCaseText
    ? keys.filter((key) => key !== 'caseParagraphs')
    : keys;

const getDecisionParagraphsForEntry = (
  entry: unknown,
  decisionParagraphs: string[],
): string[] => {
  if (decisionParagraphs.length) {
    return decisionParagraphs;
  }
  if (typeof entry === 'string') {
    return normalizeParagraphText(entry).paragraphs;
  }
  return [];
};

const resolveDecisionCaseTextValue = (
  entry: unknown,
  childPath: string | undefined,
  decisionParagraphs: string[],
): ReactNode | null => {
  if (!isDecisionCaseTextPath(childPath)) {
    return null;
  }

  const paragraphs = getDecisionParagraphsForEntry(entry, decisionParagraphs);
  if (!paragraphs.length) {
    return null;
  }

  return renderParagraphs(paragraphs, childPath);
};

const buildDecisionPreviewContext = (
  value: Record<string, unknown>,
  fieldPath: string | undefined,
  keys: string[],
  resolveWithFallback: PreviewValueResolver,
): { visibleKeys: string[]; resolveValue: PreviewValueResolver } => {
  if (fieldPath !== 'decision') {
    return { visibleKeys: keys, resolveValue: resolveWithFallback };
  }

  const decisionParagraphs = normalizeParagraphs(value.caseParagraphs);
  const visibleKeys = getDecisionVisibleKeys(
    keys,
    decisionParagraphs,
    hasDecisionCaseText(value),
  );
  const resolveValue: PreviewValueResolver = (
    entry,
    schemaNode,
    uiNode,
    childPath,
  ) => {
    const caseText = resolveDecisionCaseTextValue(
      entry,
      childPath,
      decisionParagraphs,
    );
    if (caseText) {
      return caseText;
    }
    return resolveWithFallback(entry, schemaNode, uiNode, childPath);
  };

  return { visibleKeys, resolveValue };
};

const getLabel = (
  key: string,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
): string => {
  if (isRecord(uiNode) && typeof uiNode['ui:title'] === 'string') {
    return uiNode['ui:title'];
  }
  if (typeof schemaNode?.title === 'string' && schemaNode.title.length > 0) {
    return schemaNode.title;
  }
  return key;
};

type PreviewEntry =
  | { type: 'row'; node: ReactNode }
  | { type: 'nested'; node: ReactNode };

type PreviewEntryOptions = {
  entry: unknown;
  key: string;
  childSchema: RJSFSchema | undefined;
  childUi: UiSchema | undefined;
  childLabel: string;
  resolveValue: PreviewValueResolver;
  fieldPath: string;
  sectionKey?: string;
};

const buildPreviewRow = (
  key: string,
  label: string,
  entry: unknown,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | undefined,
  resolveValue: PreviewValueResolver,
  fieldPath: string,
) => (
  <div key={`row-${key}`}>
    <dt>{label}</dt>
    <dd>{resolveValue(entry, schemaNode, uiNode, fieldPath)}</dd>
  </div>
);

const buildPreviewEntry = ({
  entry,
  key,
  childSchema,
  childUi,
  childLabel,
  resolveValue,
  fieldPath,
  sectionKey,
}: PreviewEntryOptions): PreviewEntry | null => {
  if (!hasPreviewValue(entry)) {
    return null;
  }

  const nestedKey = `${sectionKey ?? 'section'}-${key}`;
  if (Array.isArray(entry)) {
    const section = renderPreviewArray(
      entry,
      childSchema,
      childUi,
      childLabel,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return { type: 'nested', node: section };
  }

  if (isRecord(entry)) {
    const section = renderPreviewObject(
      entry,
      childSchema,
      childUi,
      childLabel,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return { type: 'nested', node: section };
  }

  return {
    type: 'row',
    node: buildPreviewRow(
      key,
      childLabel,
      entry,
      childSchema,
      childUi,
      resolveValue,
      fieldPath,
    ),
  };
};

const buildArrayItem = (
  entry: unknown,
  index: number,
  itemSchema: RJSFSchema | undefined,
  itemUi: UiSchema | undefined,
  resolveValue: PreviewValueResolver,
  fieldPath: string,
  sectionKey?: string,
): ReactNode | null => {
  if (!hasPreviewValue(entry)) {
    return null;
  }

  const nestedKey = `${sectionKey ?? 'array'}-${index}`;
  if (Array.isArray(entry)) {
    const nested = renderPreviewArray(
      entry,
      itemSchema,
      itemUi,
      undefined,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return <li key={`nested-${index}`}>{nested}</li>;
  }

  if (isRecord(entry)) {
    const nested = renderPreviewObject(
      entry,
      itemSchema,
      itemUi,
      undefined,
      resolveValue,
      fieldPath,
      nestedKey,
    );
    return <li key={`object-${index}`}>{nested}</li>;
  }

  return (
    <li key={`value-${index}`}>
      {resolveValue(entry, itemSchema, itemUi, fieldPath)}
    </li>
  );
};

function resolvePreviewValueFallback(
  entryValue: unknown,
  entrySchema?: RJSFSchema,
  entryUi?: UiSchema,
  entryFieldPath?: string,
): ReactNode {
  return resolveDisplayValue(entryValue, {
    schema: entrySchema,
    uiSchema: entryUi,
    fieldPath: entryFieldPath,
  });
}

function renderPreviewObject(
  value: Record<string, unknown>,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  label?: string,
  resolveValue?: PreviewValueResolver,
  fieldPath?: string,
  sectionKey?: string,
): ReactNode {
  const resolveWithFallback = resolveValue ?? resolvePreviewValueFallback;
  const schemaProps =
    schemaNode && isRecord(schemaNode.properties)
      ? (schemaNode.properties as Record<string, RJSFSchema>)
      : null;
  const keys = getOrderedKeys(schemaNode, uiNode, value);
  const { visibleKeys, resolveValue: resolveWithDecisionParagraphs } =
    buildDecisionPreviewContext(value, fieldPath, keys, resolveWithFallback);
  const rows: ReactNode[] = [];
  const nested: ReactNode[] = [];

  visibleKeys.forEach((key) => {
    const entry = value[key];
    const childSchema = schemaProps ? schemaProps[key] : undefined;
    const childUi = getUiSchemaNode(uiNode, key);
    const childLabel = getLabel(key, childSchema, childUi);
    const childPath = buildFieldPath(key, fieldPath);
    const preview = buildPreviewEntry({
      entry,
      key,
      childSchema,
      childUi,
      childLabel,
      resolveValue: resolveWithDecisionParagraphs,
      fieldPath: childPath,
      sectionKey,
    });
    if (!preview) {
      return;
    }
    if (preview.type === 'row') {
      rows.push(preview.node);
    } else {
      nested.push(preview.node);
    }
  });

  if (!rows.length && !nested.length) {
    return null;
  }

  const content = (
    <>
      {rows.length > 0 ? <dl>{rows}</dl> : null}
      {nested}
    </>
  );

  if (!label) {
    return content;
  }

  return (
    <div className="formpack-document-preview__section" key={sectionKey}>
      <h4>{label}</h4>
      {content}
    </div>
  );
}

function renderPreviewArray(
  values: unknown[],
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  label?: string,
  resolveValue?: PreviewValueResolver,
  fieldPath?: string,
  sectionKey?: string,
): ReactNode {
  if (isDecisionCaseParagraphsPath(fieldPath)) {
    const paragraphValues = normalizeParagraphs(values);
    if (paragraphValues.length) {
      return (
        <div className="formpack-document-preview__section" key={sectionKey}>
          {label ? <h4>{label}</h4> : null}
          {renderParagraphs(paragraphValues, fieldPath)}
        </div>
      );
    }
  }

  const itemSchema = getItemSchema(schemaNode);
  const itemUi = getItemUiSchema(uiNode);
  const resolveWithFallback = resolveValue ?? resolvePreviewValueFallback;
  const items = values
    .map<ReactNode>((entry, index) => {
      return buildArrayItem(
        entry,
        index,
        itemSchema,
        itemUi,
        resolveWithFallback,
        fieldPath ?? '',
        sectionKey,
      );
    })
    .filter((entry): entry is Exclude<ReactNode, null | undefined | false> =>
      Boolean(entry),
    );

  if (!items.length) {
    return null;
  }

  return (
    <div className="formpack-document-preview__section" key={sectionKey}>
      {label ? <h4>{label}</h4> : null}
      <ul className="formpack-document-preview__list">{items}</ul>
    </div>
  );
}

/**
 * Collects the pure helpers used by the formpack detail page and its tests.
 *
 * @remarks
 * RATIONALE: Keeping these helpers in a separate module removes large amounts of
 * non-React logic from `FormpackDetailPage` and makes regression tests target
 * the pure behavior directly.
 */
export const formpackDetailHelpers = {
  applyFieldVisibility,
  buildDecisionPreviewContext,
  buildErrorMessage,
  buildFieldPath,
  buildOfflabelFormSchema,
  buildPreviewEntry,
  buildPreviewRow,
  getActionButtonDataAction,
  getDecisionParagraphsForEntry,
  getDecisionVisibleKeys,
  getItemSchema,
  getItemUiSchema,
  getLabel,
  getOfflabelPreviewBlockKey,
  getOrderedKeys,
  getUiSchemaNode,
  hasDecisionCaseText,
  hasLetterLayout,
  hasSameStringArray,
  isDecisionCaseParagraphsPath,
  isDecisionCaseTextPath,
  isJsonEncryptionRuntimeError,
  loadFormpackAssets,
  loadJsonEncryptionModule,
  mergeDummyPatch,
  normalizeOfflabelRequest,
  normalizeParagraphs,
  OFFLABEL_FOCUS_SELECTOR_BY_TARGET,
  renderOfflabelPreviewBlock,
  renderOfflabelPreviewDocument,
  renderParagraphs,
  renderPreviewArray,
  renderPreviewObject,
  resolveDecisionCaseTextValue,
  resolveImportErrorMessage,
  resolveJsonEncryptionErrorMessage,
  shouldHideCase0Result,
  stripOfflabelPart2ConsentFromPreview,
  toStringArray,
  tryParseEncryptedEnvelope,
};
