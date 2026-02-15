import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Ajv2020 from 'ajv/dist/2020';
import { loadFormpackI18n } from '../i18n/formpack';
import { translateUiSchema } from '../i18n/rjsf';
import { useLocale } from '../i18n/useLocale';
import type { SupportedLocale } from '../i18n/locale';
import { validateJsonImport, type JsonImportPayload } from '../import/json';
import {
  buildJsonExportFilename,
  buildJsonExportPayload,
  downloadJsonExport,
} from '../export/json';
import {
  buildDocxExportFilename,
  downloadDocxExport,
  exportDocx,
  getDocxErrorKey,
  preloadDocxAssets,
  type DocxTemplateId,
} from '../export/docxLazy';
import type { PdfExportControlsProps } from '../export/pdf/PdfExportControls';
import { applyArrayUiSchemaDefaults } from '../lib/rjsfUiSchema';
import {
  formpackTemplates,
  type FormpackFormContext,
} from '../lib/rjsfTemplates';
import { DoctorLetterFieldTemplate } from '../lib/rjsfDoctorLetterFieldTemplate';
import { resolveDisplayValue } from '../lib/displayValueResolver';
import { hasPreviewValue } from '../lib/preview';
import { getFirstItem, isRecord } from '../lib/utils';
import { formpackWidgets } from '../lib/rjsfWidgetRegistry';
import { normalizeParagraphText } from '../lib/text/paragraphs';
import {
  FormpackLoaderError,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
} from '../formpacks/loader';
import { FORMPACKS_UPDATED_EVENT } from '../formpacks/backgroundRefresh';
import { deriveFormpackRevisionSignature } from '../formpacks/metadata';
import { isDevUiEnabled, isFormpackVisible } from '../formpacks/visibility';
import type { FormpackManifest, InfoBoxConfig } from '../formpacks/types';
import {
  resolveDecisionTree,
  Q4_OPTIONS,
  Q5_OPTIONS,
  Q8_OPTIONS,
  type DecisionAnswers,
} from '../formpacks/decisionEngine';
import {
  getFieldVisibility,
  clearHiddenFields,
  type DecisionData,
} from '../formpacks/doctorLetterVisibility';
import { buildOfflabelDocuments } from '../formpacks/offlabel-antrag/content/buildOfflabelDocuments';
import { applyOfflabelVisibility } from '../formpacks/offlabel-antrag/uiVisibility';
import {
  type StorageErrorCode,
  useAutosaveRecord,
  useRecords,
  useSnapshots,
} from '../storage/hooks';
import { getFormpackMeta, upsertFormpackMeta } from '../storage/formpackMeta';
import { importRecordWithSnapshots } from '../storage/import';
import type { FormpackMetaEntry, RecordEntry } from '../storage/types';
import CollapsibleSection from '../components/CollapsibleSection';
import FormpackIntroGate from '../components/FormpackIntroGate';
import FormpackIntroModal from '../components/FormpackIntroModal';
import type { ChangeEvent, ComponentType, MouseEvent, ReactNode } from 'react';
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

type RjsfFormProps = FormProps<FormDataState>;

const LazyForm = lazy(async () => {
  const module = await import('@rjsf/core');
  return { default: module.default as ComponentType<RjsfFormProps> };
});

const LazyPdfExportControls = lazy(async () => {
  const module = await import('../export/pdf/PdfExportControls');
  return { default: module.default as ComponentType<PdfExportControlsProps> };
});

type ManifestLoadResult = {
  manifest: FormpackManifest | null;
  schema: RJSFSchema | null;
  uiSchema: UiSchema | null;
  errorMessage: string | null;
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

const FORMPACK_ERROR_KEYS: Partial<
  Record<FormpackLoaderError['code'], string>
> = {
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

  if (error instanceof Error) {
    return error.message;
  }

  return t('formpackLoadError');
};

const DOCTOR_LETTER_ID = 'doctor-letter';
const OFFLABEL_ANTRAG_ID = 'offlabel-antrag';
const isValidQ4 = (val: unknown): val is DecisionAnswers['q4'] =>
  Q4_OPTIONS.includes(val as DecisionAnswers['q4'] & string);

const isValidQ5 = (val: unknown): val is DecisionAnswers['q5'] =>
  Q5_OPTIONS.includes(val as DecisionAnswers['q5'] & string);

const isValidQ8 = (val: unknown): val is DecisionAnswers['q8'] =>
  Q8_OPTIONS.includes(val as DecisionAnswers['q8'] & string);

const isYesNo = (val: unknown): val is 'yes' | 'no' =>
  val === 'yes' || val === 'no';

const buildDecisionAnswers = (
  decision: Record<string, unknown>,
): DecisionAnswers => ({
  q1: isYesNo(decision.q1) ? decision.q1 : undefined,
  q2: isYesNo(decision.q2) ? decision.q2 : undefined,
  q3: isYesNo(decision.q3) ? decision.q3 : undefined,
  q4: isValidQ4(decision.q4) ? decision.q4 : undefined,
  q5: isValidQ5(decision.q5) ? decision.q5 : undefined,
  q6: isYesNo(decision.q6) ? decision.q6 : undefined,
  q7: isYesNo(decision.q7) ? decision.q7 : undefined,
  q8: isValidQ8(decision.q8) ? decision.q8 : undefined,
});

const getValueByPath = (
  obj: Record<string, unknown>,
  path: string,
): unknown => {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
};

const setValueByPath = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> => {
  const keys = path.split('.');
  const next = structuredClone(obj);
  let cursor: Record<string, unknown> = next;

  keys.forEach((key, index) => {
    const isLeaf = index === keys.length - 1;
    if (isLeaf) {
      cursor[key] = value;
      return;
    }

    const candidate = cursor[key];
    if (!isRecord(candidate)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  });

  return next;
};

// Helper: Apply field visibility rules to decision tree UI schema
const applyFieldVisibility = (
  decisionUiSchema: Record<string, unknown>,
  visibility: ReturnType<typeof getFieldVisibility>,
): void => {
  (['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const).forEach((field) => {
    if (!visibility[field]) {
      if (!isRecord(decisionUiSchema[field])) {
        decisionUiSchema[field] = {};
      }
      const fieldSchema = decisionUiSchema[field] as Record<string, unknown>;
      fieldSchema['ui:widget'] = 'hidden';
    }
  });
};

// Helper: Check if Case 0 result should be hidden
const shouldHideCase0Result = (decision: DecisionData): boolean => {
  const result = resolveDecisionTree(buildDecisionAnswers(decision));
  const isCase0 = result.caseId === 0;

  if (!isCase0) {
    return false;
  }

  // Check if Case 0 is a valid completed path
  const isValidCase0 =
    (decision.q1 === 'no' && decision.q6 === 'no') ||
    (decision.q1 === 'no' && decision.q6 === 'yes' && decision.q7 === 'no');

  // Only hide if Case 0 is due to incomplete tree, not a valid path
  return !isValidCase0;
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

const isDecisionCaseTextPath = (fieldPath?: string): boolean =>
  fieldPath === 'decision.caseText' ||
  fieldPath === 'decision.resolvedCaseText';

const isDecisionCaseParagraphsPath = (fieldPath?: string): boolean =>
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

  return renderParagraphs(paragraphs, childPath ?? 'paragraph');
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
    return section ? { type: 'nested', node: section } : null;
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
    return section ? { type: 'nested', node: section } : null;
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
    return nested ? <li key={`nested-${index}`}>{nested}</li> : null;
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
    return nested ? <li key={`object-${index}`}>{nested}</li> : null;
  }

  return (
    <li key={`value-${index}`}>
      {resolveValue(entry, itemSchema, itemUi, fieldPath)}
    </li>
  );
};

// RATIONALE: These functions are pure and do not depend on component state.
// Defining them outside the component prevents them from being re-created on every
// render, which improves performance by reducing garbage collection and avoiding
// unnecessary re-renders of memoized components that depend on them.
function renderPreviewObject(
  value: Record<string, unknown>,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  label?: string,
  resolveValue?: PreviewValueResolver,
  fieldPath?: string,
  sectionKey?: string,
): ReactNode {
  const resolveWithFallback =
    resolveValue ??
    ((entryValue, entrySchema, entryUi, entryFieldPath) =>
      resolveDisplayValue(entryValue, {
        schema: entrySchema,
        uiSchema: entryUi,
        fieldPath: entryFieldPath,
      }));
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
          {renderParagraphs(
            paragraphValues,
            fieldPath ?? sectionKey ?? 'paragraphs',
          )}
        </div>
      );
    }
  }

  const itemSchema = getItemSchema(schemaNode);
  const itemUi = getItemUiSchema(uiNode);
  const resolveWithFallback =
    resolveValue ??
    ((entryValue, entrySchema, entryUi, entryFieldPath) =>
      resolveDisplayValue(entryValue, {
        schema: entrySchema,
        uiSchema: entryUi,
        fieldPath: entryFieldPath,
      }));
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
 * Shows formpack metadata with translations loaded for the active locale.
 */
export default function FormpackDetailPage() {
  const { t, i18n } = useTranslation();
  const { locale, setLocale } = useLocale();
  const { id } = useParams();
  const [manifest, setManifest] = useState<FormpackManifest | null>(null);
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [formData, setFormData] = useState<FormDataState>({});
  const [importJson, setImportJson] = useState('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'new' | 'overwrite'>('new');
  const [importIncludeRevisions, setImportIncludeRevisions] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [docxTemplateId, setDocxTemplateId] = useState<DocxTemplateId>('a4');
  const [docxError, setDocxError] = useState<string | null>(null);
  const [docxSuccess, setDocxSuccess] = useState<string | null>(null);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);
  const [validator, setValidator] = useState<ValidatorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formpackTranslationsVersion, setFormpackTranslationsVersion] =
    useState(0);
  const [storageError, setStorageError] = useState<StorageErrorCode | null>(
    null,
  );
  const [formpackMeta, setFormpackMeta] = useState<FormpackMetaEntry | null>(
    null,
  );
  const [assetRefreshVersion, setAssetRefreshVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  const [selectedOfflabelPreviewId, setSelectedOfflabelPreviewId] = useState<
    'part1' | 'part2' | 'part3'
  >('part1');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const lastFormpackIdRef = useRef<string | undefined>(undefined);
  const hasRestoredRecordRef = useRef<string | null>(null);
  const formpackId = manifest?.id ?? null;
  const {
    records,
    activeRecord,
    isLoading: isRecordsLoading,
    hasLoaded: hasLoadedRecords,
    errorCode: recordsError,
    createRecord,
    loadRecord,
    updateActiveRecord,
    applyRecordUpdate,
    deleteRecord,
    setActiveRecord,
  } = useRecords(formpackId);
  const {
    snapshots,
    isLoading: isSnapshotsLoading,
    errorCode: snapshotsError,
    createSnapshot,
    loadSnapshot,
    clearSnapshots,
    refresh: refreshSnapshots,
  } = useSnapshots(activeRecord?.id ?? null);
  const { markAsSaved } = useAutosaveRecord(
    activeRecord?.id ?? null,
    formData,
    locale,
    activeRecord?.data ?? null,
    {
      onSaved: (record) => {
        setStorageError(null);
        applyRecordUpdate(record);
      },
      onError: setStorageError,
    },
  );

  useEffect(() => {
    let isActive = true;

    const resetFormpack = () => {
      setManifest(null);
      setSchema(null);
      setUiSchema(null);
      setFormpackMeta(null);
    };

    const loadManifest = async (requestedFormpackId: string) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await loadFormpackAssets(requestedFormpackId, locale, t);
        if (!isActive) {
          return;
        }
        if (result.errorMessage) {
          resetFormpack();
          setErrorMessage(result.errorMessage);
          return;
        }
        setFormpackTranslationsVersion((version) => version + 1);
        const shouldResetFormData =
          lastFormpackIdRef.current !== requestedFormpackId;
        setManifest(result.manifest);
        setSchema(result.schema);
        setUiSchema(result.uiSchema);
        if (shouldResetFormData) {
          setFormData({});
          setIsIntroModalOpen(false);
          lastFormpackIdRef.current = requestedFormpackId;
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        resetFormpack();
        setErrorMessage(buildErrorMessage(error, t));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadManifest(id).catch(() => undefined);
    } else {
      resetFormpack();
      setFormData({});
      setValidator(null);
      setFormpackTranslationsVersion(0);
      lastFormpackIdRef.current = undefined;
      setErrorMessage(t('formpackMissingId'));
      setIsLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [assetRefreshVersion, id, locale, t]);

  useEffect(() => {
    setSelectedOfflabelPreviewId('part1');
  }, [formpackId]);

  useEffect(() => {
    if (!manifest) {
      setFormpackMeta(null);
      return;
    }

    let isActive = true;

    const ensureFormpackMeta = async () => {
      try {
        const existing = await getFormpackMeta(manifest.id);
        if (existing) {
          if (isActive) {
            setFormpackMeta(existing);
          }
          return;
        }

        const signature = await deriveFormpackRevisionSignature(manifest);
        const stored = await upsertFormpackMeta({
          id: manifest.id,
          versionOrHash: signature.versionOrHash,
          version: signature.version,
          hash: signature.hash,
        });
        if (isActive) {
          setFormpackMeta(stored);
        }
      } catch {
        if (isActive) {
          setFormpackMeta(null);
        }
      }
    };

    ensureFormpackMeta().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [manifest]);

  useEffect(() => {
    if (!manifest?.id) {
      return;
    }

    let isActive = true;
    const currentFormpackId = manifest.id;

    const refreshMeta = async () => {
      try {
        const next = await getFormpackMeta(currentFormpackId);
        if (isActive) {
          setFormpackMeta(next);
        }
      } catch {
        if (isActive) {
          setFormpackMeta(null);
        }
      }
    };

    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ formpackIds?: string[] } | null>)
        .detail;
      const payload = Array.isArray(detail?.formpackIds)
        ? detail.formpackIds
        : [];

      if (!payload.includes(currentFormpackId)) {
        return;
      }

      refreshMeta().catch(() => undefined);
      setAssetRefreshVersion((value) => value + 1);
    };

    globalThis.addEventListener(
      FORMPACKS_UPDATED_EVENT,
      handleUpdated as EventListener,
    );

    return () => {
      isActive = false;
      globalThis.removeEventListener(
        FORMPACKS_UPDATED_EVENT,
        handleUpdated as EventListener,
      );
    };
  }, [manifest?.id]);

  useEffect(() => {
    const manifestExports = manifest?.exports;
    if (!manifest?.docx || !manifestExports?.includes('docx') || !formpackId) {
      return;
    }

    // Preload DOCX assets so export still works after going offline.
    preloadDocxAssets(formpackId, manifest.docx).catch(() => undefined);
  }, [formpackId, manifest]);

  useEffect(() => {
    setStorageError(recordsError ?? snapshotsError ?? null);
  }, [recordsError, snapshotsError]);

  useEffect(() => {
    if (activeRecord) {
      markAsSaved(activeRecord.data);
      setFormData(activeRecord.data);
    }
  }, [activeRecord, markAsSaved]);

  const namespace = useMemo(
    () => (manifest ? `formpack:${manifest.id}` : undefined),
    [manifest],
  );
  const activeLanguage = i18n.language;
  const translatedUiSchema = useMemo(() => {
    if (!uiSchema) {
      return null;
    }
    if (formpackTranslationsVersion < 0) {
      return null;
    }
    const translate = ((key: string, options?: Record<string, unknown>) =>
      t(key, { ...options, lng: activeLanguage })) as typeof t;
    return translateUiSchema(uiSchema, translate, namespace);
  }, [activeLanguage, formpackTranslationsVersion, namespace, t, uiSchema]);
  const normalizedUiSchema = useMemo(
    () =>
      schema && translatedUiSchema
        ? applyArrayUiSchemaDefaults(schema, translatedUiSchema)
        : null,
    [schema, translatedUiSchema],
  );

  // Apply conditional visibility for doctor-letter decision tree
  const conditionalUiSchema = useMemo(() => {
    if (!normalizedUiSchema) {
      return normalizedUiSchema;
    }

    if (formpackId === OFFLABEL_ANTRAG_ID) {
      return applyOfflabelVisibility(normalizedUiSchema, formData);
    }

    if (formpackId !== DOCTOR_LETTER_ID) {
      return normalizedUiSchema;
    }

    // Treat missing or invalid decision as empty object to apply visibility rules
    const decision = (
      isRecord(formData.decision) ? formData.decision : {}
    ) as DecisionData;
    const visibility = getFieldVisibility(decision);

    // Clone the UI schema to avoid mutations
    const clonedUiSchema = structuredClone(normalizedUiSchema);

    if (!isRecord(clonedUiSchema.decision)) {
      return normalizedUiSchema;
    }

    const decisionUiSchema = clonedUiSchema.decision;

    // Apply field visibility rules
    applyFieldVisibility(decisionUiSchema, visibility);

    // Hide result field for incomplete decision tree (but show for valid Case 0)
    if (
      shouldHideCase0Result(decision) &&
      isRecord(decisionUiSchema.resolvedCaseText)
    ) {
      const resultSchema = decisionUiSchema.resolvedCaseText;
      resultSchema['ui:widget'] = 'hidden';
    }

    return clonedUiSchema;
  }, [normalizedUiSchema, formpackId, formData]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(activeLanguage, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [activeLanguage],
  );
  const formatTimestamp = useCallback(
    (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return dateFormatter.format(date);
    },
    [dateFormatter],
  );
  const buildSnapshotLabel = useCallback(() => {
    const timestamp = formatTimestamp(new Date().toISOString());
    return t('formpackSnapshotLabel', { timestamp });
  }, [formatTimestamp, t]);
  const storageErrorMessage = useMemo(() => {
    if (!storageError) {
      return null;
    }
    return storageError === 'unavailable'
      ? t('storageUnavailable')
      : t('storageError');
  }, [storageError, t]);

  const buildImportErrorMessage = useCallback(
    (error: { code: string; message?: string }) => {
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
    },
    [t],
  );

  useEffect(() => {
    if (!activeRecord && importMode === 'overwrite') {
      setImportMode('new');
    }
  }, [activeRecord, importMode]);

  const activeRecordStorageKey = useMemo(
    () => (formpackId ? `mecfs-paperwork.activeRecordId.${formpackId}` : null),
    [formpackId],
  );

  const readActiveRecordId = useCallback(() => {
    try {
      return activeRecordStorageKey
        ? globalThis.localStorage.getItem(activeRecordStorageKey)
        : null;
    } catch {
      return null;
    }
  }, [activeRecordStorageKey]);

  const persistActiveRecordId = useCallback(
    (recordId: string | null) => {
      if (!activeRecordStorageKey) {
        return;
      }

      try {
        if (recordId) {
          globalThis.localStorage.setItem(activeRecordStorageKey, recordId);
        } else {
          globalThis.localStorage.removeItem(activeRecordStorageKey);
        }
      } catch {
        // Ignore storage errors to keep the UI responsive.
      }
    },
    [activeRecordStorageKey],
  );

  const getLastActiveRecord = useCallback(
    async (currentFormpackId: string) => {
      const lastId = readActiveRecordId();
      if (!lastId) {
        return null;
      }

      const record = await loadRecord(lastId);
      if (record?.formpackId === currentFormpackId) {
        return record;
      }

      return null;
    },
    [loadRecord, readActiveRecordId],
  );

  const getFallbackRecord = useCallback(
    (currentFormpackId: string) => {
      if (records.length === 0) {
        return null;
      }
      const fallbackRecord = records[0];
      return fallbackRecord.formpackId === currentFormpackId
        ? fallbackRecord
        : null;
    },
    [records],
  );

  const title = manifest
    ? t(manifest.titleKey, {
        ns: namespace,
        defaultValue: manifest.titleKey,
      })
    : '';

  const description = manifest
    ? t(manifest.descriptionKey, {
        ns: namespace,
        defaultValue: manifest.descriptionKey,
      })
    : '';
  const formpackVersionDisplay =
    formpackMeta?.versionOrHash ??
    manifest?.version ??
    t('formpackVersionUpdatedUnknown');
  const formpackUpdatedAtDisplay = formpackMeta
    ? formatTimestamp(formpackMeta.updatedAt)
    : t('formpackVersionUpdatedUnknown');

  const restoreActiveRecord = useCallback(
    async (currentFormpackId: string, isActive: () => boolean) => {
      const restoredRecord = await getLastActiveRecord(currentFormpackId);
      if (isActive() && restoredRecord) {
        setActiveRecord(restoredRecord);
        persistActiveRecordId(restoredRecord.id);
        return;
      }

      if (!isActive()) {
        return;
      }

      const fallbackRecord = getFallbackRecord(currentFormpackId);
      if (fallbackRecord) {
        setActiveRecord(fallbackRecord);
        persistActiveRecordId(fallbackRecord.id);
        return;
      }

      if (!manifest || storageError === 'unavailable') {
        setActiveRecord(null);
        return;
      }

      const recordTitle = title || t('formpackRecordUntitled');
      const record = await createRecord(locale, formData, recordTitle);
      if (isActive() && record?.formpackId === currentFormpackId) {
        persistActiveRecordId(record.id);
      }
    },
    [
      createRecord,
      formData,
      getFallbackRecord,
      getLastActiveRecord,
      locale,
      manifest,
      persistActiveRecordId,
      setActiveRecord,
      storageError,
      t,
      title,
    ],
  );

  useEffect(() => {
    if (!formpackId) {
      hasRestoredRecordRef.current = null;
      return;
    }

    // Wait for the initial records load to avoid creating duplicate drafts.
    if (!hasLoadedRecords || isRecordsLoading) {
      return;
    }

    if (hasRestoredRecordRef.current === formpackId) {
      return;
    }

    let isActive = true;
    const currentFormpackId = formpackId;
    hasRestoredRecordRef.current = formpackId;

    restoreActiveRecord(currentFormpackId, () => isActive).catch(
      () => undefined,
    );

    return () => {
      isActive = false;
    };
  }, [formpackId, hasLoadedRecords, isRecordsLoading, restoreActiveRecord]);

  const resolveAndPopulateDoctorLetterCase = useCallback(
    (decision: Record<string, unknown>): string => {
      const result = resolveDecisionTree(buildDecisionAnswers(decision));

      const rawText = t(result.caseKey, {
        ns: `formpack:${formpackId}`,
        defaultValue: result.caseKey,
      });
      return normalizeParagraphText(rawText).text;
    },
    [formpackId, t],
  );

  // RATIONALE: Memoize form event handlers to prevent unnecessary re-renders of the
  // expensive Form component, which receives these callbacks as props.
  const handleFormChange: NonNullable<RjsfFormProps['onChange']> = useCallback(
    (event) => {
      const nextData = event.formData as FormDataState;

      // For doctor-letter formpack, clear hidden fields to prevent stale values
      if (formpackId === DOCTOR_LETTER_ID && isRecord(nextData.decision)) {
        const originalDecision = nextData.decision as DecisionData;

        // Clear hidden fields to prevent stale values from affecting decision tree
        const clearedDecision = clearHiddenFields(originalDecision);

        // Only update if clearing actually changed something
        const hasChanges =
          JSON.stringify(originalDecision) !== JSON.stringify(clearedDecision);

        if (hasChanges) {
          nextData.decision = clearedDecision;
        }
      }

      setFormData(nextData);
    },
    [formpackId, setFormData],
  );

  // Resolve decision tree after formData changes (for doctor-letter only)
  useEffect(() => {
    if (formpackId === DOCTOR_LETTER_ID && isRecord(formData.decision)) {
      const decision = formData.decision as DecisionData;
      const currentCaseText = decision.resolvedCaseText;
      const newCaseText = resolveAndPopulateDoctorLetterCase(decision);

      // Only update if the case text actually changed
      if (currentCaseText !== newCaseText) {
        setFormData((prev) => ({
          ...prev,
          decision: {
            ...decision,
            resolvedCaseText: newCaseText,
          },
        }));
      }
    }
  }, [formData, formpackId, resolveAndPopulateDoctorLetterCase, setFormData]);

  const handleFormSubmit: NonNullable<RjsfFormProps['onSubmit']> = useCallback(
    (event, submitEvent) => {
      submitEvent.preventDefault();
      setFormData(event.formData as FormDataState);
    },
    [setFormData],
  );

  const handleResetForm = useCallback(async () => {
    if (!activeRecord) {
      return;
    }

    const clearedData: FormDataState = {};
    setFormData(clearedData);

    const updated = await updateActiveRecord(activeRecord.id, {
      data: clearedData,
      locale,
    });
    if (updated) {
      markAsSaved(updated.data);
    }
  }, [activeRecord, locale, markAsSaved, updateActiveRecord]);

  const handleCreateRecord = useCallback(async () => {
    if (!manifest) {
      return;
    }

    const recordTitle = title || t('formpackRecordUntitled');
    if (activeRecord) {
      const baseRecord = await updateActiveRecord(activeRecord.id, {
        data: formData,
        locale,
      });
      if (!baseRecord) {
        return;
      }
    }

    const record = await createRecord(locale, formData, recordTitle);
    if (!record) {
      return;
    }

    markAsSaved(record.data);
    setFormData(record.data);
    persistActiveRecordId(record.id);
  }, [
    activeRecord,
    createRecord,
    formData,
    locale,
    manifest,
    markAsSaved,
    persistActiveRecordId,
    t,
    title,
    updateActiveRecord,
  ]);

  const handleLoadRecord = useCallback(
    async (recordId: string) => {
      const record = await loadRecord(recordId);
      if (record) {
        markAsSaved(record.data);
        setFormData(record.data);
        persistActiveRecordId(record.id);
      }
    },
    [loadRecord, markAsSaved, persistActiveRecordId],
  );

  const handleCreateSnapshot = useCallback(async () => {
    if (!activeRecord) {
      return;
    }

    await createSnapshot(formData, buildSnapshotLabel());
  }, [activeRecord, buildSnapshotLabel, createSnapshot, formData]);

  const handleDeleteRecord = useCallback(
    async (record: RecordEntry) => {
      if (record.id === activeRecord?.id) {
        return;
      }

      const confirmed = globalThis.confirm(
        t('formpackRecordDeleteConfirm', {
          title: record.title ?? t('formpackRecordUntitled'),
        }),
      );
      if (!confirmed) {
        return;
      }

      await deleteRecord(record.id);
    },
    [activeRecord?.id, deleteRecord, t],
  );

  const handleRestoreSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!activeRecord) {
        return;
      }

      const snapshot = await loadSnapshot(snapshotId);
      if (!snapshot) {
        return;
      }

      setFormData(snapshot.data);
      const updated = await updateActiveRecord(activeRecord.id, {
        data: snapshot.data,
      });
      if (updated) {
        markAsSaved(snapshot.data);
      }
    },
    [activeRecord, loadSnapshot, markAsSaved, updateActiveRecord],
  );

  const handleClearSnapshots = useCallback(async () => {
    if (!activeRecord) {
      return;
    }

    const confirmed = globalThis.confirm(t('formpackSnapshotsClearAllConfirm'));
    if (!confirmed) {
      return;
    }

    await clearSnapshots();
  }, [activeRecord, clearSnapshots, t]);

  const applyImportedRecord = useCallback(
    (record: RecordEntry) => {
      applyRecordUpdate(record);
      markAsSaved(record.data);
      setFormData(record.data);
      persistActiveRecordId(record.id);
    },
    [applyRecordUpdate, markAsSaved, persistActiveRecordId],
  );

  const importOverwriteRecord = useCallback(
    async (payload: JsonImportPayload): Promise<RecordEntry | null> => {
      if (!formpackId || !activeRecord) {
        setImportError(t('importNoActiveRecord'));
        return null;
      }

      const confirmed = globalThis.confirm(t('importOverwriteConfirm'));
      if (!confirmed) {
        return null;
      }

      const updated = await importRecordWithSnapshots({
        formpackId,
        mode: 'overwrite',
        recordId: activeRecord.id,
        data: payload.record.data,
        locale: payload.record.locale,
        title: payload.record.title ?? activeRecord.title,
        revisions: importIncludeRevisions ? payload.revisions : [],
      });

      applyImportedRecord(updated);
      return updated;
    },
    [
      activeRecord,
      applyImportedRecord,
      formpackId,
      importIncludeRevisions,
      setImportError,
      t,
    ],
  );

  const importNewRecord = useCallback(
    async (payload: JsonImportPayload): Promise<RecordEntry | null> => {
      if (!formpackId) {
        return null;
      }

      const recordTitle =
        payload.record.title ?? (title || t('formpackRecordUntitled'));
      const record = await importRecordWithSnapshots({
        formpackId,
        mode: 'new',
        data: payload.record.data,
        locale: payload.record.locale,
        title: recordTitle,
        revisions: importIncludeRevisions ? payload.revisions : [],
      });

      applyImportedRecord(record);
      return record;
    },
    [applyImportedRecord, formpackId, importIncludeRevisions, t, title],
  );

  const handleImport = useCallback(async () => {
    if (!manifest || !schema) {
      return;
    }

    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);

    try {
      const result = validateJsonImport(importJson, schema, manifest.id);

      if (result.error) {
        setImportError(buildImportErrorMessage(result.error));
        return;
      }

      const payload = result.payload;
      const record =
        importMode === 'overwrite'
          ? await importOverwriteRecord(payload)
          : await importNewRecord(payload);

      if (!record) {
        return;
      }

      if (
        importIncludeRevisions &&
        payload.revisions?.length &&
        importMode === 'overwrite'
      ) {
        await refreshSnapshots();
      }

      await setLocale(payload.record.locale);
      setImportSuccess(t('importSuccess'));
      setImportJson('');
      setImportFileName(null);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    } catch {
      setImportError(t('importStorageError'));
    } finally {
      setIsImporting(false);
    }
  }, [
    buildImportErrorMessage,
    importIncludeRevisions,
    importJson,
    importMode,
    importNewRecord,
    importOverwriteRecord,
    manifest,
    refreshSnapshots,
    schema,
    setLocale,
    t,
  ]);

  const handleImportFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setImportError(null);
      setImportSuccess(null);

      if (!file) {
        setImportJson('');
        setImportFileName(null);
        return;
      }

      try {
        const text = await file.text();
        setImportJson(text);
        setImportFileName(file.name);
      } catch {
        setImportJson('');
        setImportFileName(file.name);
        setImportError(t('importInvalidJson'));
      }
    },
    [t],
  );
  const formContext = useMemo<
    FormpackFormContext & {
      formpackId?: string;
      infoBoxes?: InfoBoxConfig[];
      formData?: Record<string, unknown>;
    }
  >(
    () => ({
      t,
      formpackId: formpackId || undefined,
      infoBoxes: manifest?.ui?.infoBoxes || [],
      formData,
    }),
    [t, formpackId, manifest, formData],
  );

  const introGateConfig = manifest?.ui?.introGate;
  const isIntroGateVisible = useMemo(() => {
    if (!activeRecord || !introGateConfig?.enabled) {
      return false;
    }
    return getValueByPath(formData, introGateConfig.acceptedFieldPath) !== true;
  }, [activeRecord, formData, introGateConfig]);

  const tFormpack = useCallback(
    (key: string) =>
      t(key, {
        ns: namespace,
        defaultValue: key,
      }),
    [namespace, t],
  );

  const introTexts = useMemo(
    () =>
      introGateConfig
        ? {
            title: tFormpack(introGateConfig.titleKey),
            body: tFormpack(introGateConfig.bodyKey),
            checkboxLabel: tFormpack(introGateConfig.checkboxLabelKey),
            startButtonLabel: tFormpack(introGateConfig.startButtonLabelKey),
            reopenButtonLabel: tFormpack(introGateConfig.reopenButtonLabelKey),
          }
        : null,
    [introGateConfig, tFormpack],
  );

  const handleAcceptIntroGate = useCallback(() => {
    if (!introGateConfig) {
      return;
    }
    setFormData((current) =>
      setValueByPath(current, introGateConfig.acceptedFieldPath, true),
    );
  }, [introGateConfig]);

  // Use custom field template for formpacks that provide InfoBoxes.
  const templates = useMemo(() => {
    if ((manifest?.ui?.infoBoxes?.length ?? 0) > 0) {
      return {
        ...formpackTemplates,
        FieldTemplate: DoctorLetterFieldTemplate,
      };
    }
    return formpackTemplates;
  }, [manifest?.ui?.infoBoxes]);
  const previewUiSchema =
    conditionalUiSchema ?? normalizedUiSchema ?? translatedUiSchema;
  const jsonPreview = useMemo(
    () => JSON.stringify(formData, null, 2),
    [formData],
  );
  const resolvePreviewValue = useCallback<PreviewValueResolver>(
    (value, schemaNode, uiNode, fieldPath) =>
      resolveDisplayValue(value, {
        schema: schemaNode,
        uiSchema: uiNode,
        namespace,
        formpackId: manifest?.id ?? undefined,
        fieldPath,
        t: (key, options) => {
          if (key.startsWith('common.')) {
            const appResult = t(key, { ...options, ns: 'app' });
            if (appResult !== key) {
              return appResult;
            }
          }
          if (namespace) {
            const packResult = t(key, { ...options, ns: namespace });
            if (packResult !== key) {
              return packResult;
            }
          }
          return t(key, options);
        },
      }),
    [manifest?.id, namespace, t],
  );
  const documentPreview = useMemo(() => {
    if (!isRecord(formData)) {
      return null;
    }

    const schemaProps = isRecord(schema?.properties)
      ? (schema.properties as Record<string, RJSFSchema>)
      : null;
    const keys = getOrderedKeys(schema ?? undefined, previewUiSchema, formData);
    const sections = keys
      .map<ReactNode>((key) => {
        const entry = formData[key];
        if (!hasPreviewValue(entry)) {
          return null;
        }
        const childSchema = schemaProps ? schemaProps[key] : undefined;
        const childUi = getUiSchemaNode(previewUiSchema, key);
        const label = getLabel(key, childSchema, childUi);

        if (Array.isArray(entry)) {
          return renderPreviewArray(
            entry,
            childSchema,
            childUi,
            label,
            resolvePreviewValue,
            key,
            `root-${key}`,
          );
        }
        if (isRecord(entry)) {
          return renderPreviewObject(
            entry,
            childSchema,
            childUi,
            label,
            resolvePreviewValue,
            key,
            `root-${key}`,
          );
        }
        const resolvedValue = resolvePreviewValue(
          entry,
          childSchema,
          childUi,
          key,
        );
        return (
          <div
            className="formpack-document-preview__section"
            key={`root-${key}`}
          >
            <h4>{label}</h4>
            {typeof resolvedValue === 'string' ? (
              <p>{resolvedValue}</p>
            ) : (
              resolvedValue
            )}
          </div>
        );
      })
      .filter((entry): entry is Exclude<ReactNode, null | undefined | false> =>
        Boolean(entry),
      );

    return sections.length ? sections : null;
  }, [formData, previewUiSchema, resolvePreviewValue, schema]);
  const handleExportJson = useCallback(() => {
    if (!manifest || !activeRecord) {
      return;
    }

    const payload = buildJsonExportPayload({
      formpack: { id: manifest.id, version: manifest.version },
      record: activeRecord,
      data: formData,
      locale,
      revisions: snapshots,
      ...(schema ? { schema } : {}),
    });
    const filename = buildJsonExportFilename(payload);
    downloadJsonExport(payload, filename);
  }, [activeRecord, formData, locale, manifest, schema, snapshots]);

  const handleExportDocx = useCallback(async () => {
    const manifestExports = manifest?.exports;
    if (
      !manifest?.docx ||
      !manifestExports?.includes('docx') ||
      !formpackId ||
      !activeRecord
    ) {
      return;
    }

    setDocxError(null);
    setDocxSuccess(null);
    setIsDocxExporting(true);

    try {
      const report = await exportDocx({
        formpackId,
        recordId: activeRecord.id,
        variant: docxTemplateId,
        locale,
        schema,
        uiSchema: previewUiSchema,
        manifest,
      });
      const filename = await buildDocxExportFilename(
        formpackId,
        docxTemplateId,
      );
      await downloadDocxExport(report, filename);
      setDocxSuccess(t('formpackDocxExportSuccess'));
    } catch (error) {
      const errorKey = await getDocxErrorKey(error);
      setDocxError(t(errorKey));
    } finally {
      setIsDocxExporting(false);
    }
  }, [
    activeRecord,
    docxTemplateId,
    formpackId,
    locale,
    manifest,
    previewUiSchema,
    schema,
    t,
  ]);

  const handlePdfExportSuccess = useCallback(() => {
    setPdfError(null);
    setPdfSuccess(t('formpackPdfExportSuccess'));
  }, [t]);

  const handlePdfExportError = useCallback(() => {
    setPdfError(t('formpackPdfExportError'));
    setPdfSuccess(null);
  }, [t]);

  const handleActionClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const actionButton = target.closest('button.app__button');
      if (!(actionButton instanceof HTMLButtonElement)) {
        return;
      }

      const { action } = actionButton.dataset;
      if (action === 'docx-export') {
        if (importSuccess) {
          setImportSuccess(null);
        }
        if (pdfSuccess) {
          setPdfSuccess(null);
        }
        return;
      }
      if (action === 'json-import') {
        if (docxSuccess) {
          setDocxSuccess(null);
        }
        if (pdfSuccess) {
          setPdfSuccess(null);
        }
        return;
      }
      if (docxSuccess) {
        setDocxSuccess(null);
      }
      if (pdfSuccess) {
        setPdfSuccess(null);
      }
      if (importSuccess) {
        setImportSuccess(null);
      }
    },
    [docxSuccess, importSuccess, pdfSuccess],
  );

  useEffect(() => {
    let isActive = true;

    const loadValidator = async () => {
      const module = await import('@rjsf/validator-ajv8');
      // Ajv2020 includes the draft 2020-12 meta schema used by formpacks.
      const loadedValidator = module.customizeValidator({
        AjvClass: Ajv2020,
      });
      if (isActive) {
        setValidator(loadedValidator);
      }
    };

    loadValidator().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  const hasDocumentContent = useMemo(
    () => hasPreviewValue(formData),
    [formData],
  );
  const offlabelPreviewDocuments = useMemo(
    () =>
      formpackId === OFFLABEL_ANTRAG_ID ? buildOfflabelDocuments(formData) : [],
    [formData, formpackId],
  );
  const docxTemplateOptions = useMemo(() => {
    if (!manifest?.docx) {
      return [];
    }

    const options: Array<{ id: DocxTemplateId; label: string }> = [
      { id: 'a4', label: t('formpackDocxTemplateA4Option') },
    ];

    if (manifest.id === 'notfallpass' && manifest.docx.templates.wallet) {
      options.push({
        id: 'wallet',
        label: t('formpackDocxTemplateWalletOption'),
      });
    }

    return options;
  }, [manifest, t]);

  useEffect(() => {
    if (!docxTemplateOptions.length) {
      setDocxTemplateId('a4');
      return;
    }

    if (!docxTemplateOptions.some((option) => option.id === docxTemplateId)) {
      setDocxTemplateId(docxTemplateOptions[0].id);
    }
  }, [docxTemplateId, docxTemplateOptions]);

  if (isLoading) {
    return (
      <section className="app__card">
        <h2>{t('formpackDetailTitle')}</h2>
        <p>{t('formpackLoading')}</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="app__card">
        <h2>{t('formpackDetailTitle')}</h2>
        <p className="app__error">{errorMessage}</p>
        <Link className="app__link" to="/formpacks">
          {t('formpackBackToList')}
        </Link>
      </section>
    );
  }

  if (!manifest) {
    return null;
  }

  // RATIONALE: Hide dev-only UI in production to reduce exposed metadata and UI surface.
  const showDevSections = isDevUiEnabled;

  const renderFormpackDocxDetails = () => {
    if (!manifest.docx) {
      return null;
    }

    return (
      <div className="formpack-detail__section">
        <h3>{t('formpackDocxHeading')}</h3>
        <dl>
          <div>
            <dt>{t('formpackDocxTemplateA4')}</dt>
            <dd>{manifest.docx.templates.a4}</dd>
          </div>
          <div>
            <dt>{t('formpackDocxTemplateWallet')}</dt>
            <dd>
              {manifest.docx.templates.wallet
                ? manifest.docx.templates.wallet
                : t('formpackDocxTemplateWalletUnavailable')}
            </dd>
          </div>
          <div>
            <dt>{t('formpackDocxMapping')}</dt>
            <dd>{manifest.docx.mapping}</dd>
          </div>
        </dl>
      </div>
    );
  };

  const renderRecordsList = () => {
    if (records.length) {
      return (
        <>
          <div className="formpack-records__actions">
            <button
              type="button"
              className="app__button app__icon-button"
              onClick={handleCreateRecord}
              disabled={storageError === 'unavailable'}
              aria-label={t('formpackRecordNew')}
              title={t('formpackRecordNew')}
            >
              +
            </button>
          </div>
          <ul className="formpack-records__list">
            {records.map((record) => {
              const isActive = activeRecord?.id === record.id;
              return (
                <li
                  key={record.id}
                  className={`formpack-records__item${
                    isActive ? ' formpack-records__item--active' : ''
                  }`}
                >
                  <div>
                    <p className="formpack-records__title">
                      {record.title ?? t('formpackRecordUntitled')}
                    </p>
                    <p className="formpack-records__meta">
                      {t('formpackRecordUpdatedAt', {
                        timestamp: formatTimestamp(record.updatedAt),
                      })}
                    </p>
                  </div>
                  <div className="formpack-records__item-actions">
                    <button
                      type="button"
                      className="app__button"
                      onClick={() => handleLoadRecord(record.id)}
                      disabled={storageError === 'unavailable'}
                    >
                      {t('formpackRecordLoad')}
                    </button>
                    {!isActive && (
                      <button
                        type="button"
                        className="app__button app__icon-button"
                        onClick={() => handleDeleteRecord(record)}
                        disabled={storageError === 'unavailable'}
                        aria-label={t('formpackRecordDelete')}
                        title={t('formpackRecordDelete')}
                      >
                        🗑
                      </button>
                    )}
                    {isActive && (
                      <span className="formpack-records__badge">
                        {t('formpackRecordActive')}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      );
    }

    const emptyMessage = isRecordsLoading
      ? t('formpackRecordsLoading')
      : t('formpackRecordsEmpty');

    return (
      <div>
        <p className="formpack-records__empty">{emptyMessage}</p>
        <div className="formpack-records__actions">
          <button
            type="button"
            className="app__button app__icon-button"
            onClick={handleCreateRecord}
            disabled={storageError === 'unavailable'}
            aria-label={t('formpackRecordNew')}
            title={t('formpackRecordNew')}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  const renderImportFileName = () =>
    importFileName ? (
      <p className="formpack-import__file-name">
        {t('formpackImportFileName', { name: importFileName })}
      </p>
    ) : null;

  const renderImportOverwriteHint = () =>
    activeRecord ? null : (
      <p className="formpack-import__note">
        {t('formpackImportModeOverwriteHint')}
      </p>
    );

  const renderImportStatus = () => (
    <>
      {importError && <p className="app__error">{importError}</p>}
      {importSuccess && (
        <p className="formpack-import__success">{importSuccess}</p>
      )}
    </>
  );

  const getImportButtonLabel = () =>
    isImporting ? t('formpackImportInProgress') : t('formpackImportAction');

  const renderStorageErrorMessage = () =>
    storageErrorMessage ? (
      <p className="app__error">{storageErrorMessage}</p>
    ) : null;

  const renderPdfExportControls = () => {
    const pdfSupported = manifest.exports.includes('pdf');
    const disabled = storageError === 'unavailable' || !pdfSupported;
    const resolvedFormpackId = manifest.id;

    if (!pdfSupported) {
      return (
        <div className="formpack-pdf-export">
          <button
            type="button"
            className="app__button"
            disabled
            title={t('formpackPdfExportUnavailable')}
          >
            {t('formpackRecordExportPdf')}
          </button>
          <span className="formpack-pdf-export__note">
            {t('formpackPdfExportUnavailable')}
          </span>
        </div>
      );
    }

    return (
      <div className="formpack-pdf-export">
        <Suspense
          fallback={
            <button type="button" className="app__button" disabled>
              {t('formpackRecordExportPdf')}
            </button>
          }
        >
          <LazyPdfExportControls
            formpackId={resolvedFormpackId}
            formData={formData}
            locale={locale}
            label={t('formpackRecordExportPdf')}
            loadingLabel={t('formpackPdfExportInProgress')}
            disabled={disabled}
            onSuccess={handlePdfExportSuccess}
            onError={handlePdfExportError}
          />
        </Suspense>
      </div>
    );
  };

  const renderDocxExportControls = () => {
    if (
      !manifest.exports.includes('docx') ||
      !manifest.docx ||
      docxTemplateOptions.length === 0
    ) {
      return null;
    }

    const pdfControls = renderPdfExportControls();

    return (
      <div className="formpack-docx-export">
        <div className="formpack-docx-export__template">
          <label
            className="formpack-docx-export__label"
            htmlFor="docx-template-select"
          >
            {t('formpackDocxTemplateLabel')}
            <select
              id="docx-template-select"
              className="formpack-docx-export__select"
              value={docxTemplateId}
              onChange={(event) =>
                setDocxTemplateId(event.target.value as DocxTemplateId)
              }
            >
              {docxTemplateOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="formpack-docx-export__buttons">
          <button
            type="button"
            className="app__button"
            onClick={handleExportDocx}
            data-action="docx-export"
            disabled={storageError === 'unavailable' || isDocxExporting}
          >
            {isDocxExporting
              ? t('formpackDocxExportInProgress')
              : t('formpackRecordExportDocx')}
          </button>
          {pdfControls}
        </div>
      </div>
    );
  };

  const renderJsonExportButton = () =>
    manifest.exports.includes('json') ? (
      <button
        type="button"
        className="app__button"
        onClick={handleExportJson}
        disabled={storageError === 'unavailable'}
      >
        {t('formpackRecordExportJson')}
      </button>
    ) : null;

  const renderActionStatus = () => {
    if (!docxError && !docxSuccess && !pdfError && !pdfSuccess) {
      return null;
    }

    return (
      <div className="formpack-actions__status" aria-live="polite">
        {docxError && <span className="app__error">{docxError}</span>}
        {docxSuccess && (
          <span className="formpack-actions__success">{docxSuccess}</span>
        )}
        {pdfError && <span className="app__error">{pdfError}</span>}
        {pdfSuccess && (
          <span className="formpack-actions__success">{pdfSuccess}</span>
        )}
      </div>
    );
  };

  const renderFormContent = () => {
    if (!activeRecord) {
      return (
        <p className="formpack-records__empty">
          {t('formpackFormNoActiveRecord')}
        </p>
      );
    }

    if (!schema || !conditionalUiSchema || !validator) {
      return null;
    }

    if (isIntroGateVisible && introTexts) {
      return (
        <FormpackIntroGate
          title={introTexts.title}
          body={introTexts.body}
          checkboxLabel={introTexts.checkboxLabel}
          startButtonLabel={introTexts.startButtonLabel}
          onConfirm={handleAcceptIntroGate}
        />
      );
    }

    return (
      <>
        {introGateConfig?.enabled && introTexts && (
          <div className="formpack-intro__reopen">
            <button
              type="button"
              className="app__button"
              onClick={() => setIsIntroModalOpen(true)}
            >
              {introTexts.reopenButtonLabel}
            </button>
          </div>
        )}
        <Suspense fallback={<p>{t('formpackLoading')}</p>}>
          <LazyForm
            className={
              formpackId === DOCTOR_LETTER_ID
                ? 'formpack-form formpack-form--doctor-letter'
                : 'formpack-form'
            }
            schema={schema}
            uiSchema={conditionalUiSchema}
            templates={templates}
            widgets={formpackWidgets}
            validator={validator}
            formData={formData}
            omitExtraData
            liveOmit
            onChange={handleFormChange}
            onSubmit={handleFormSubmit}
            formContext={formContext}
            noHtml5Validate
            showErrorList={false}
          >
            <div className="formpack-form__actions">
              <div className="formpack-actions__group formpack-actions__group--export">
                {renderDocxExportControls()}
              </div>
              <div className="formpack-actions__group formpack-actions__group--secondary">
                <button
                  type="button"
                  className="app__button"
                  onClick={handleResetForm}
                >
                  {t('formpackFormReset')}
                </button>
                {renderJsonExportButton()}
              </div>
              {renderActionStatus()}
            </div>
          </LazyForm>
        </Suspense>
        {introGateConfig?.enabled && introTexts && (
          <FormpackIntroModal
            isOpen={isIntroModalOpen}
            title={introTexts.title}
            body={introTexts.body}
            closeLabel={t('common.close')}
            onClose={() => setIsIntroModalOpen(false)}
          />
        )}
      </>
    );
  };

  const renderSnapshotsList = () => {
    if (snapshots.length) {
      return (
        <ul className="formpack-snapshots__list">
          {snapshots.map((snapshot) => (
            <li key={snapshot.id} className="formpack-snapshots__item">
              <div>
                <p className="formpack-snapshots__title">
                  {snapshot.label ?? t('formpackSnapshotUntitled')}
                </p>
                <p className="formpack-snapshots__meta">
                  {t('formpackSnapshotCreatedAt', {
                    timestamp: formatTimestamp(snapshot.createdAt),
                  })}
                </p>
              </div>
              <div className="formpack-snapshots__item-actions">
                <button
                  type="button"
                  className="app__button"
                  onClick={() => handleRestoreSnapshot(snapshot.id)}
                  disabled={storageError === 'unavailable'}
                >
                  {t('formpackSnapshotRestore')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      );
    }

    const emptyMessage = isSnapshotsLoading
      ? t('formpackSnapshotsLoading')
      : t('formpackSnapshotsEmpty');
    return <p className="formpack-snapshots__empty">{emptyMessage}</p>;
  };

  const renderSnapshotsContent = () => {
    if (!activeRecord) {
      return (
        <p className="formpack-snapshots__empty">
          {t('formpackSnapshotsNoRecord')}
        </p>
      );
    }

    return (
      <>
        <div className="formpack-snapshots__actions">
          <button
            type="button"
            className="app__button app__icon-button"
            onClick={handleCreateSnapshot}
            disabled={storageError === 'unavailable'}
            aria-label={t('formpackSnapshotCreate')}
            title={t('formpackSnapshotCreate')}
          >
            +
          </button>
          <button
            type="button"
            className="app__button app__icon-button"
            onClick={handleClearSnapshots}
            disabled={storageError === 'unavailable' || snapshots.length === 0}
            aria-label={t('formpackSnapshotsClearAll')}
            title={t('formpackSnapshotsClearAll')}
          >
            🗑
          </button>
        </div>
        {renderSnapshotsList()}
      </>
    );
  };

  const getJsonPreviewContent = () =>
    Object.keys(formData).length ? jsonPreview : t('formpackFormPreviewEmpty');

  const renderDocumentPreviewContent = () =>
    formpackId === OFFLABEL_ANTRAG_ID ? (
      <div className="formpack-document-preview formpack-document-preview--offlabel">
        <div className="formpack-document-preview__tabs" role="tablist">
          {offlabelPreviewDocuments.map((doc) => (
            <button
              key={doc.id}
              role="tab"
              type="button"
              className="app__button"
              aria-selected={selectedOfflabelPreviewId === doc.id}
              onClick={() => setSelectedOfflabelPreviewId(doc.id)}
            >
              {doc.title}
            </button>
          ))}
        </div>
        {offlabelPreviewDocuments
          .filter((doc) => doc.id === selectedOfflabelPreviewId)
          .map((doc) => (
            <div key={doc.id}>
              {doc.blocks.map((block) => {
                const blockKey =
                  block.kind === 'list'
                    ? `${doc.id}-${block.kind}-${block.items.join('|')}`
                    : block.kind === 'pageBreak'
                      ? `${doc.id}-${block.kind}`
                      : `${doc.id}-${block.kind}-${block.text}`;
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
                        <li key={`${doc.id}-${block.kind}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p
                    key={blockKey}
                    className="formpack-document-preview__page-break"
                  >
                    — Page break —
                  </p>
                );
              })}
            </div>
          ))}
      </div>
    ) : hasDocumentContent ? (
      <div className="formpack-document-preview">{documentPreview}</div>
    ) : (
      <p className="formpack-document-preview__empty">
        {t('formpackDocumentPreviewEmpty')}
      </p>
    );

  return (
    <section className="app__card">
      <div className="app__card-header">
        <div>
          <h2>{title}</h2>
          <p className="app__subtitle">{description}</p>
        </div>
        <Link className="app__link" to="/formpacks">
          {t('formpackBackToList')}
        </Link>
      </div>
      <div
        className="formpack-detail"
        onClickCapture={handleActionClickCapture}
      >
        <div className="formpack-detail__assets">
          {showDevSections && (
            <>
              <div className="formpack-detail__section">
                <h3>{t('formpackDetailsHeading')}</h3>
                <dl>
                  <div>
                    <dt>{t('formpackId')}</dt>
                    <dd>{manifest.id}</dd>
                  </div>
                  <div>
                    <dt>{t('formpackVersion')}</dt>
                    <dd>{manifest.version}</dd>
                  </div>
                  <div>
                    <dt>{t('formpackDefaultLocale')}</dt>
                    <dd>{manifest.defaultLocale}</dd>
                  </div>
                  <div>
                    <dt>{t('formpackLocales')}</dt>
                    <dd>{manifest.locales.join(', ')}</dd>
                  </div>
                </dl>
              </div>
              <div className="formpack-detail__section">
                <h3>{t('formpackExportsHeading')}</h3>
                <dl>
                  <div>
                    <dt>{t('formpackExports')}</dt>
                    <dd>{manifest.exports.join(', ')}</dd>
                  </div>
                </dl>
              </div>
              {renderFormpackDocxDetails()}
            </>
          )}
        </div>
        <div className="formpack-detail__form">
          <div className="formpack-detail__section">
            <h3>{t('formpackFormHeading')}</h3>
            {renderFormContent()}
          </div>
          {!isIntroGateVisible && (
            <CollapsibleSection
              id="formpack-document-preview"
              title={t('formpackDocumentPreviewHeading')}
              className="formpack-detail__section"
            >
              {renderDocumentPreviewContent()}
            </CollapsibleSection>
          )}
          <div className="formpack-detail__section formpack-detail__tools-section">
            <div className="formpack-detail__tools-panel">
              <h3 className="formpack-detail__tools-title">
                {t('formpackToolsHeading')}
              </h3>
              <div className="formpack-detail__tools">
                <CollapsibleSection
                  id="formpack-records"
                  title={t('formpackRecordsHeading')}
                  className="formpack-detail__section"
                >
                  {renderStorageErrorMessage()}
                  {renderRecordsList()}
                </CollapsibleSection>
                <CollapsibleSection
                  id="formpack-import"
                  title={t('formpackImportHeading')}
                  className="formpack-detail__section"
                >
                  <p
                    className="formpack-import__hint"
                    id="formpack-import-hint"
                  >
                    {t('formpackImportHint')}
                  </p>
                  <div className="formpack-import__field">
                    <label htmlFor="formpack-import-file">
                      {t('formpackImportLabel')}
                    </label>
                    <input
                      ref={importInputRef}
                      id="formpack-import-file"
                      className="formpack-import__file"
                      type="file"
                      accept="application/json,.json"
                      onChange={handleImportFileChange}
                      aria-describedby="formpack-import-hint"
                    />
                    {renderImportFileName()}
                  </div>
                  <fieldset className="formpack-import__options">
                    <legend>{t('formpackImportModeLabel')}</legend>
                    <label className="formpack-import__option">
                      <input
                        type="radio"
                        name="import-mode"
                        value="new"
                        checked={importMode === 'new'}
                        onChange={() => setImportMode('new')}
                      />
                      {t('formpackImportModeNew')}
                    </label>
                    <label className="formpack-import__option">
                      <input
                        type="radio"
                        name="import-mode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        disabled={!activeRecord}
                      />
                      {t('formpackImportModeOverwrite')}
                    </label>
                    {renderImportOverwriteHint()}
                  </fieldset>
                  <label className="formpack-import__option">
                    <input
                      type="checkbox"
                      checked={importIncludeRevisions}
                      onChange={(event) =>
                        setImportIncludeRevisions(event.target.checked)
                      }
                    />
                    {t('formpackImportIncludeRevisions')}
                  </label>
                  {renderImportStatus()}
                  <div className="formpack-import__actions">
                    <button
                      type="button"
                      className="app__button"
                      onClick={handleImport}
                      data-action="json-import"
                      disabled={
                        !importJson.trim() ||
                        storageError === 'unavailable' ||
                        isImporting
                      }
                    >
                      {getImportButtonLabel()}
                    </button>
                  </div>
                </CollapsibleSection>
                <CollapsibleSection
                  id="formpack-snapshots"
                  title={t('formpackSnapshotsHeading')}
                  className="formpack-detail__section"
                >
                  {renderSnapshotsContent()}
                </CollapsibleSection>
              </div>
            </div>
          </div>
          {showDevSections && (
            <div className="formpack-detail__section">
              <h3>{t('formpackFormPreviewHeading')}</h3>
              <pre className="formpack-preview">{getJsonPreviewContent()}</pre>
            </div>
          )}
        </div>
      </div>
      <p className="formpack-detail__version-meta" aria-live="polite">
        {t('formpackLoadedVersionMeta', {
          version: formpackVersionDisplay,
          updatedAt: formpackUpdatedAtDisplay,
        })}
      </p>
    </section>
  );
}
