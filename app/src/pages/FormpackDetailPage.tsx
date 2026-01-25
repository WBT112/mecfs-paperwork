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
} from '../export/docx';
import { applyArrayUiSchemaDefaults } from '../lib/rjsfUiSchema';
import {
  formpackTemplates,
  type FormpackFormContext,
} from '../lib/rjsfTemplates';
import { resolveDisplayValue } from '../lib/displayValueResolver';
import { hasPreviewValue } from '../lib/preview';
import {
  FormpackLoaderError,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
} from '../formpacks/loader';
import { isDevUiEnabled, isFormpackVisible } from '../formpacks/visibility';
import type { FormpackManifest } from '../formpacks/types';
import { resolveDecisionTree } from '../formpacks/decisionEngine';
import {
  getFieldVisibility,
  clearHiddenFields,
  type DecisionData,
} from '../formpacks/doctorLetterVisibility';
import {
  type StorageErrorCode,
  useAutosaveRecord,
  useRecords,
  useSnapshots,
} from '../storage/hooks';
import { importRecordWithSnapshots } from '../storage/import';
import type { RecordEntry } from '../storage/types';
import CollapsibleSection from '../components/CollapsibleSection';
import type { ChangeEvent, ComponentType, MouseEvent, ReactNode } from 'react';
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

type RjsfFormProps = FormProps<FormDataState>;

const LazyForm = lazy(async () => {
  const module = await import('@rjsf/core');
  return { default: module.default as ComponentType<RjsfFormProps> };
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type PreviewValueResolver = (
  value: unknown,
  schema?: RJSFSchema,
  uiSchema?: UiSchema,
  fieldPath?: string,
) => string;

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
): RJSFSchema | undefined => {
  if (!schemaNode?.items) {
    return undefined;
  }
  if (Array.isArray(schemaNode.items)) {
    return schemaNode.items[0] as RJSFSchema | undefined;
  }
  return isRecord(schemaNode.items)
    ? (schemaNode.items as RJSFSchema)
    : undefined;
};

const getItemUiSchema = (
  uiNode: UiSchema | null | undefined,
): UiSchema | undefined => {
  if (!isRecord(uiNode)) {
    return undefined;
  }
  const items = uiNode.items;
  if (Array.isArray(items)) {
    return isRecord(items[0]) ? (items[0] as UiSchema) : undefined;
  }
  return isRecord(items) ? (items as UiSchema) : undefined;
};

const buildFieldPath = (segment: string, prefix?: string): string =>
  prefix ? `${prefix}.${segment}` : segment;

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

const buildPreviewEntry = (
  entry: unknown,
  key: string,
  childSchema: RJSFSchema | undefined,
  childUi: UiSchema | undefined,
  childLabel: string,
  resolveValue: PreviewValueResolver,
  fieldPath: string,
  sectionKey?: string,
): PreviewEntry | null => {
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
    ((value, schemaNode, uiNode, fieldPath) =>
      resolveDisplayValue(value, {
        schema: schemaNode,
        uiSchema: uiNode,
        fieldPath,
      }));
  const schemaProps =
    schemaNode && isRecord(schemaNode.properties)
      ? (schemaNode.properties as Record<string, RJSFSchema>)
      : null;
  const keys = getOrderedKeys(schemaNode, uiNode, value);
  const rows: ReactNode[] = [];
  const nested: ReactNode[] = [];

  keys.forEach((key) => {
    const entry = value[key];
    const childSchema = schemaProps ? schemaProps[key] : undefined;
    const childUi = getUiSchemaNode(uiNode, key);
    const childLabel = getLabel(key, childSchema, childUi);
    const childPath = buildFieldPath(key, fieldPath);
    const preview = buildPreviewEntry(
      entry,
      key,
      childSchema,
      childUi,
      childLabel,
      resolveWithFallback,
      childPath,
      sectionKey,
    );
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
  const itemSchema = getItemSchema(schemaNode);
  const itemUi = getItemUiSchema(uiNode);
  const resolveWithFallback =
    resolveValue ??
    ((value, schemaNode, uiNode, fieldPath) =>
      resolveDisplayValue(value, {
        schema: schemaNode,
        uiSchema: uiNode,
        fieldPath,
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
  const [validator, setValidator] = useState<ValidatorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formpackTranslationsVersion, setFormpackTranslationsVersion] =
    useState(0);
  const [storageError, setStorageError] = useState<StorageErrorCode | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
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
    setActiveRecord,
  } = useRecords(formpackId);
  const {
    snapshots,
    isLoading: isSnapshotsLoading,
    errorCode: snapshotsError,
    createSnapshot,
    loadSnapshot,
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
    };

    const loadManifest = async (formpackId: string) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await loadFormpackAssets(formpackId, locale, t);
        if (!isActive) {
          return;
        }
        if (result.errorMessage) {
          resetFormpack();
          setErrorMessage(result.errorMessage);
          return;
        }
        setFormpackTranslationsVersion((version) => version + 1);
        const shouldResetFormData = lastFormpackIdRef.current !== formpackId;
        setManifest(result.manifest);
        setSchema(result.schema);
        setUiSchema(result.uiSchema);
        if (shouldResetFormData) {
          setFormData({});
          lastFormpackIdRef.current = formpackId;
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
  }, [id, locale, t]);

  useEffect(() => {
    if (
      !manifest ||
      !manifest.docx ||
      !manifest.exports.includes('docx') ||
      !formpackId
    ) {
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
    if (!normalizedUiSchema || formpackId !== 'doctor-letter') {
      return normalizedUiSchema;
    }

    const isRecord = (val: unknown): val is Record<string, unknown> =>
      typeof val === 'object' && val !== null && !Array.isArray(val);

    // Treat missing or invalid decision as empty object to apply visibility rules
    const decision = (
      isRecord(formData.decision) ? formData.decision : {}
    ) as DecisionData;
    const visibility = getFieldVisibility(decision);

    // Clone the UI schema to avoid mutations
    const clonedUiSchema = JSON.parse(
      JSON.stringify(normalizedUiSchema),
    ) as UiSchema;

    if (!isRecord(clonedUiSchema.decision)) {
      return normalizedUiSchema;
    }

    // Apply visibility rules by setting ui:widget to "hidden" for invisible fields
    const decisionUiSchema = clonedUiSchema.decision;

    (['q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const).forEach((field) => {
      if (!visibility[field]) {
        if (!isRecord(decisionUiSchema[field])) {
          decisionUiSchema[field] = {};
        }
        const fieldSchema = decisionUiSchema[field] as Record<string, unknown>;
        fieldSchema['ui:widget'] = 'hidden';
      }
    });

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
    if (!activeRecordStorageKey) {
      return null;
    }

    try {
      return window.localStorage.getItem(activeRecordStorageKey);
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
          window.localStorage.setItem(activeRecordStorageKey, recordId);
        } else {
          window.localStorage.removeItem(activeRecordStorageKey);
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
      if (record && record.formpackId === currentFormpackId) {
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

  // Type guards for decision tree enum values
  const isValidQ4 = (
    val: unknown,
  ): val is 'EBV' | 'Influenza' | 'COVID-19' | 'Other infection' =>
    val === 'EBV' ||
    val === 'Influenza' ||
    val === 'COVID-19' ||
    val === 'Other infection';
  const isValidQ5 = (
    val: unknown,
  ): val is 'COVID-19 vaccination' | 'Other cause' =>
    val === 'COVID-19 vaccination' || val === 'Other cause';
  const isValidQ8 = (
    val: unknown,
  ): val is
    | 'No known cause'
    | 'EBV'
    | 'Influenza'
    | 'COVID-19 infection'
    | 'COVID-19 vaccination'
    | 'Other cause' =>
    val === 'No known cause' ||
    val === 'EBV' ||
    val === 'Influenza' ||
    val === 'COVID-19 infection' ||
    val === 'COVID-19 vaccination' ||
    val === 'Other cause';

  const isYesNo = (val: unknown): val is 'yes' | 'no' =>
    val === 'yes' || val === 'no';

  const resolveAndPopulateDoctorLetterCase = useCallback(
    (decision: Record<string, unknown>): string => {
      const answers = {
        q1: isYesNo(decision.q1) ? decision.q1 : undefined,
        q2: isYesNo(decision.q2) ? decision.q2 : undefined,
        q3: isYesNo(decision.q3) ? decision.q3 : undefined,
        q4: isValidQ4(decision.q4) ? decision.q4 : undefined,
        q5: isValidQ5(decision.q5) ? decision.q5 : undefined,
        q6: isYesNo(decision.q6) ? decision.q6 : undefined,
        q7: isYesNo(decision.q7) ? decision.q7 : undefined,
        q8: isValidQ8(decision.q8) ? decision.q8 : undefined,
      };

      // Debug logging
      console.log('Decision input:', decision);
      console.log('Parsed answers:', answers);

      const result = resolveDecisionTree(answers);

      console.log('Resolved result:', result);

      return t(result.caseKey, {
        ns: `formpack:${formpackId}`,
        defaultValue: result.caseKey,
      });
    },
    [formpackId, t],
  );

  // RATIONALE: Memoize form event handlers to prevent unnecessary re-renders of the
  // expensive Form component, which receives these callbacks as props.
  const handleFormChange: NonNullable<RjsfFormProps['onChange']> = useCallback(
    (event) => {
      const nextData = event.formData as FormDataState;

      // For doctor-letter formpack, automatically resolve decision tree and populate resolvedCaseText
      if (formpackId === 'doctor-letter' && isRecord(nextData.decision)) {
        const originalDecision = nextData.decision as DecisionData;

        // Clear hidden fields to prevent stale values from affecting decision tree
        const clearedDecision = clearHiddenFields(originalDecision);

        // Only update if clearing actually changed something (to avoid infinite loops)
        const hasChanges =
          JSON.stringify(originalDecision) !== JSON.stringify(clearedDecision);

        if (hasChanges) {
          const caseText = resolveAndPopulateDoctorLetterCase(clearedDecision);
          nextData.decision = {
            ...clearedDecision,
            resolvedCaseText: caseText,
          };
        } else {
          // No hidden fields were cleared, just resolve the case text
          const caseText = resolveAndPopulateDoctorLetterCase(originalDecision);
          nextData.decision = {
            ...originalDecision,
            resolvedCaseText: caseText,
          };
        }
      }

      setFormData(nextData);
    },
    [formpackId, resolveAndPopulateDoctorLetterCase, setFormData],
  );

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

      const confirmed = window.confirm(t('importOverwriteConfirm'));
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
      infoBoxes?: unknown[];
    }
  >(
    () => ({
      t,
      formpackId: formpackId || undefined,
      infoBoxes: manifest?.ui?.infoBoxes || [],
    }),
    [t, formpackId, manifest],
  );

  // Use custom field template for doctor-letter to support InfoBoxes
  // Temporarily disabled due to rendering issue - need to investigate
  const templates = useMemo(() => {
    // if (formpackId === 'doctor-letter') {
    //   return {
    //     ...formpackTemplates,
    //     FieldTemplate: DoctorLetterFieldTemplate,
    //     };
    // }
    return formpackTemplates;
  }, []);
  const previewUiSchema =
    conditionalUiSchema ?? normalizedUiSchema ?? translatedUiSchema;
  const jsonPreview = useMemo(
    () => JSON.stringify(formData, null, 2),
    [formData],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return (
          <div
            className="formpack-document-preview__section"
            key={`root-${key}`}
          >
            <h4>{label}</h4>
            <p>{resolvePreviewValue(entry, childSchema, childUi, key)}</p>
          </div>
        );
      })
      .filter((entry): entry is Exclude<ReactNode, null | undefined | false> =>
        Boolean(entry),
      );

    return sections.length ? <>{sections}</> : null;
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
    if (
      !manifest ||
      !manifest.docx ||
      !manifest.exports.includes('docx') ||
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
      const filename = buildDocxExportFilename(formpackId, docxTemplateId);
      downloadDocxExport(report, filename);
      setDocxSuccess(t('formpackDocxExportSuccess'));
    } catch (error) {
      console.error('DOCX export failed:', error);
      setDocxError(t(getDocxErrorKey(error)));
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
        return;
      }
      if (action === 'json-import') {
        if (docxSuccess) {
          setDocxSuccess(null);
        }
        return;
      }
      if (docxSuccess) {
        setDocxSuccess(null);
      }
      if (importSuccess) {
        setImportSuccess(null);
      }
    },
    [docxSuccess, importSuccess],
  );

  useEffect(() => {
    let isActive = true;

    const loadValidator = async () => {
      const module = await import('@rjsf/validator-ajv8');
      // Ajv2020 includes the draft 2020-12 meta schema used by formpacks.
      const validator = module.customizeValidator({
        AjvClass: Ajv2020,
      });
      if (isActive) {
        setValidator(validator);
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
              className="app__button"
              onClick={handleCreateRecord}
              disabled={storageError === 'unavailable'}
            >
              {t('formpackRecordNew')}
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
            className="app__button"
            onClick={handleCreateRecord}
            disabled={storageError === 'unavailable'}
          >
            {t('formpackRecordNew')}
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

  const renderDocxExportControls = () => {
    if (
      !manifest.exports.includes('docx') ||
      !manifest.docx ||
      docxTemplateOptions.length === 0
    ) {
      return null;
    }

    return (
      <div className="formpack-docx-export">
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
        {docxError && <span className="app__error">{docxError}</span>}
        {docxSuccess && (
          <span className="formpack-docx-export__success">{docxSuccess}</span>
        )}
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

    return (
      <Suspense fallback={<p>{t('formpackLoading')}</p>}>
        <LazyForm
          className="formpack-form"
          schema={schema}
          uiSchema={conditionalUiSchema}
          templates={templates}
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
            {renderDocxExportControls()}
            <button
              type="button"
              className="app__button"
              onClick={handleResetForm}
            >
              {t('formpackFormReset')}
            </button>
            {renderJsonExportButton()}
          </div>
        </LazyForm>
      </Suspense>
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
            className="app__button"
            onClick={handleCreateSnapshot}
            disabled={storageError === 'unavailable'}
          >
            {t('formpackSnapshotCreate')}
          </button>
        </div>
        {renderSnapshotsList()}
      </>
    );
  };

  const getJsonPreviewContent = () =>
    Object.keys(formData).length ? jsonPreview : t('formpackFormPreviewEmpty');

  const renderDocumentPreviewContent = () =>
    hasDocumentContent ? (
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
          <CollapsibleSection
            id="formpack-document-preview"
            title={t('formpackDocumentPreviewHeading')}
            className="formpack-detail__section"
            defaultOpen
          >
            {renderDocumentPreviewContent()}
          </CollapsibleSection>
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
    </section>
  );
}
