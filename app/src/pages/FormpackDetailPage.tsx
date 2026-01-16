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
import { validateJsonImport } from '../import/json';
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
import {
  FormpackLoaderError,
  loadFormpackManifest,
  loadFormpackSchema,
  loadFormpackUiSchema,
} from '../formpacks/loader';
import type { FormpackManifest } from '../formpacks/types';
import {
  type StorageErrorCode,
  useAutosaveRecord,
  useRecords,
  useSnapshots,
} from '../storage/hooks';
import { importRecordWithSnapshots } from '../storage/import';
import type { ChangeEvent, ComponentType, MouseEvent, ReactNode } from 'react';
import type { FormProps } from '@rjsf/core';
import type { RJSFSchema, UiSchema, ValidatorType } from '@rjsf/utils';

type FormDataState = Record<string, unknown>;

type RjsfFormProps = FormProps<FormDataState>;

const LazyForm = lazy(async () => {
  const module = await import('@rjsf/core');
  return { default: module.default as ComponentType<RjsfFormProps> };
});

const buildErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): string => {
  if (error instanceof FormpackLoaderError) {
    if (error.code === 'schema_not_found') {
      return t('formpackSchemaNotFound');
    }

    if (error.code === 'schema_invalid') {
      return t('formpackSchemaInvalid');
    }

    if (error.code === 'schema_unavailable') {
      return t('formpackSchemaUnavailable');
    }

    if (error.code === 'ui_schema_not_found') {
      return t('formpackUiSchemaNotFound');
    }

    if (error.code === 'ui_schema_invalid') {
      return t('formpackUiSchemaInvalid');
    }

    if (error.code === 'ui_schema_unavailable') {
      return t('formpackUiSchemaUnavailable');
    }

    if (error.code === 'not_found') {
      return t('formpackNotFound');
    }

    if (error.code === 'unsupported') {
      return t('formpackUnsupported');
    }

    if (error.code === 'invalid') {
      return t('formpackInvalid');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t('formpackLoadError');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasPreviewValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasPreviewValue(entry));
  }
  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasPreviewValue(entry));
  }
  return false;
};

const formatPreviewValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

const getOrderedKeys = (
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  value: Record<string, unknown>,
): string[] => {
  const schemaProps = isRecord(schemaNode?.properties)
    ? (schemaNode?.properties as Record<string, RJSFSchema>)
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
      } else if (keys.includes(entry)) {
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
  const entry = uiNode[key];
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

// RATIONALE: These functions are pure and do not depend on component state.
// Defining them outside the component prevents them from being re-created on every
// render, which improves performance by reducing garbage collection and avoiding
// unnecessary re-renders of memoized components that depend on them.
function renderPreviewObject(
  value: Record<string, unknown>,
  schemaNode: RJSFSchema | undefined,
  uiNode: UiSchema | null | undefined,
  label?: string,
  sectionKey?: string,
): ReactNode {
  const schemaProps = isRecord(schemaNode?.properties)
    ? (schemaNode?.properties as Record<string, RJSFSchema>)
    : null;
  const keys = getOrderedKeys(schemaNode, uiNode, value);
  const rows: ReactNode[] = [];
  const nested: ReactNode[] = [];

  keys.forEach((key) => {
    const entry = value[key];
    if (!hasPreviewValue(entry)) {
      return;
    }
    const childSchema = schemaProps ? schemaProps[key] : undefined;
    const childUi = getUiSchemaNode(uiNode, key);
    const childLabel = getLabel(key, childSchema, childUi);

    if (Array.isArray(entry)) {
      const section = renderPreviewArray(
        entry,
        childSchema,
        childUi,
        childLabel,
        `${sectionKey ?? 'section'}-${key}`,
      );
      if (section) {
        nested.push(section);
      }
      return;
    }

    if (isRecord(entry)) {
      const section = renderPreviewObject(
        entry,
        childSchema,
        childUi,
        childLabel,
        `${sectionKey ?? 'section'}-${key}`,
      );
      if (section) {
        nested.push(section);
      }
      return;
    }

    rows.push(
      <div key={`row-${key}`}>
        <dt>{childLabel}</dt>
        <dd>{formatPreviewValue(entry)}</dd>
      </div>,
    );
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
  sectionKey?: string,
): ReactNode {
  const itemSchema = getItemSchema(schemaNode);
  const itemUi = getItemUiSchema(uiNode);
  const items = values
    .map<ReactNode>((entry, index) => {
      if (!hasPreviewValue(entry)) {
        return null;
      }
      if (Array.isArray(entry)) {
        const nested = renderPreviewArray(
          entry,
          itemSchema,
          itemUi,
          undefined,
          `${sectionKey ?? 'array'}-${index}`,
        );
        return nested ? <li key={`nested-${index}`}>{nested}</li> : null;
      }
      if (isRecord(entry)) {
        const nested = renderPreviewObject(
          entry,
          itemSchema,
          itemUi,
          undefined,
          `${sectionKey ?? 'array'}-${index}`,
        );
        return nested ? <li key={`object-${index}`}>{nested}</li> : null;
      }
      return <li key={`value-${index}`}>{formatPreviewValue(entry)}</li>;
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

    const loadManifest = async (formpackId: string) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await loadFormpackManifest(formpackId);
        if (!isActive) {
          return;
        }
        await loadFormpackI18n(formpackId, locale);
        if (!isActive) {
          return;
        }
        setFormpackTranslationsVersion((version) => version + 1);
        const [schemaData, uiSchemaData] = await Promise.all([
          loadFormpackSchema(formpackId),
          loadFormpackUiSchema(formpackId),
        ]);
        if (!isActive) {
          return;
        }
        const shouldResetFormData = lastFormpackIdRef.current !== formpackId;
        setManifest(data);
        setSchema(schemaData as RJSFSchema);
        setUiSchema(uiSchemaData as UiSchema);
        if (shouldResetFormData) {
          setFormData({});
          lastFormpackIdRef.current = formpackId;
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        setManifest(null);
        setSchema(null);
        setUiSchema(null);
        setErrorMessage(buildErrorMessage(error, t));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      void loadManifest(id);
    } else {
      setManifest(null);
      setSchema(null);
      setUiSchema(null);
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
    void preloadDocxAssets(formpackId, manifest.docx).catch(() => undefined);
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
    void activeLanguage;
    void formpackTranslationsVersion;
    return uiSchema ? translateUiSchema(uiSchema, t, namespace) : null;
  }, [activeLanguage, formpackTranslationsVersion, namespace, t, uiSchema]);
  const normalizedUiSchema = useMemo(
    () =>
      schema && translatedUiSchema
        ? applyArrayUiSchemaDefaults(schema, translatedUiSchema)
        : null,
    [schema, translatedUiSchema],
  );
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
    (code: string) => {
      switch (code) {
        case 'invalid_json':
          return t('importInvalidJson');
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

    const restoreActiveRecord = async () => {
      const lastId = readActiveRecordId();
      if (lastId) {
        const record = await loadRecord(lastId);
        if (isActive && record && record.formpackId === currentFormpackId) {
          persistActiveRecordId(record.id);
          return;
        }
      }

      if (!isActive) {
        return;
      }

      if (records.length) {
        const fallbackRecord = records[0];
        if (fallbackRecord.formpackId === currentFormpackId) {
          setActiveRecord(fallbackRecord);
          persistActiveRecordId(fallbackRecord.id);
        }
        return;
      }

      if (!manifest || storageError === 'unavailable' || !isActive) {
        setActiveRecord(null);
        return;
      }

      const recordTitle = title || t('formpackRecordUntitled');
      const record = await createRecord(locale, formData, recordTitle);
      if (isActive && record && record.formpackId === currentFormpackId) {
        persistActiveRecordId(record.id);
      }
    };

    void restoreActiveRecord();

    return () => {
      isActive = false;
    };
  }, [
    formpackId,
    hasLoadedRecords,
    isRecordsLoading,
    createRecord,
    formData,
    locale,
    loadRecord,
    manifest,
    persistActiveRecordId,
    readActiveRecordId,
    records,
    setActiveRecord,
    storageError,
    t,
    title,
  ]);

  // RATIONALE: Memoize form event handlers to prevent unnecessary re-renders of the
  // expensive Form component, which receives these callbacks as props.
  const handleFormChange: NonNullable<RjsfFormProps['onChange']> = useCallback(
    (event) => {
      const nextData = event.formData as FormDataState;
      setFormData(nextData);
    },
    [setFormData],
  );

  const handleFormSubmit: NonNullable<RjsfFormProps['onSubmit']> = useCallback(
    (event, submitEvent) => {
      submitEvent?.preventDefault();
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

  const handleImport = useCallback(async () => {
    if (!manifest || !schema) {
      return;
    }

    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);

    try {
      let result;
      try {
        result = validateJsonImport(importJson, schema, manifest.id);
      } catch {
        setImportError(t('importInvalidPayload'));
        return;
      }

      if (result.error) {
        setImportError(buildImportErrorMessage(result.error));
        return;
      }

      const payload = result.payload;
      let targetRecordId: string | null = null;

      if (importMode === 'overwrite') {
        if (!activeRecord) {
          setImportError(t('importNoActiveRecord'));
          return;
        }

        const confirmed = window.confirm(t('importOverwriteConfirm'));
        if (!confirmed) {
          return;
        }

        const updated = await importRecordWithSnapshots({
          formpackId: manifest.id,
          mode: 'overwrite',
          recordId: activeRecord.id,
          data: payload.record.data,
          locale: payload.record.locale,
          title: payload.record.title ?? activeRecord.title,
          revisions: importIncludeRevisions ? payload.revisions : [],
        });

        applyRecordUpdate(updated);
        markAsSaved(updated.data);
        setFormData(updated.data);
        persistActiveRecordId(updated.id);
        targetRecordId = updated.id;
      } else {
        const recordTitle =
          payload.record.title ?? title ?? t('formpackRecordUntitled');
        const record = await importRecordWithSnapshots({
          formpackId: manifest.id,
          mode: 'new',
          data: payload.record.data,
          locale: payload.record.locale,
          title: recordTitle,
          revisions: importIncludeRevisions ? payload.revisions : [],
        });

        applyRecordUpdate(record);
        markAsSaved(record.data);
        setFormData(record.data);
        persistActiveRecordId(record.id);
        targetRecordId = record.id;
      }

      if (
        importIncludeRevisions &&
        targetRecordId &&
        payload.revisions &&
        payload.revisions.length
      ) {
        if (importMode === 'overwrite') {
          await refreshSnapshots();
        }
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
    activeRecord,
    buildImportErrorMessage,
    applyRecordUpdate,
    importIncludeRevisions,
    importJson,
    importMode,
    manifest,
    markAsSaved,
    persistActiveRecordId,
    refreshSnapshots,
    schema,
    setLocale,
    t,
    title,
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
  const formContext = useMemo<FormpackFormContext>(() => ({ t }), [t]);
  const previewUiSchema = normalizedUiSchema ?? translatedUiSchema;
  const jsonPreview = useMemo(
    () => JSON.stringify(formData, null, 2),
    [formData],
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
            `root-${key}`,
          );
        }
        if (isRecord(entry)) {
          return renderPreviewObject(
            entry,
            childSchema,
            childUi,
            label,
            `root-${key}`,
          );
        }
        return (
          <div
            className="formpack-document-preview__section"
            key={`root-${key}`}
          >
            <h4>{label}</h4>
            <p>{formatPreviewValue(entry)}</p>
          </div>
        );
      })
      .filter((entry): entry is Exclude<ReactNode, null | undefined | false> =>
        Boolean(entry),
      );

    return sections.length ? <>{sections}</> : null;
  }, [formData, previewUiSchema, schema]);
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
  }, [activeRecord, docxTemplateId, formpackId, locale, manifest, t]);

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

    void loadValidator();

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
          {manifest.docx && (
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
          )}
        </div>
        <div className="formpack-detail__form">
          <div className="formpack-detail__section">
            <h3>{t('formpackRecordsHeading')}</h3>
            {storageErrorMessage && (
              <p className="app__error">{storageErrorMessage}</p>
            )}
            {records.length ? (
              <>
                <div className="formpack-records__actions">
                  <button
                    type="button"
                    className="app__button"
                    onClick={handleCreateRecord}
                    disabled={!manifest || storageError === 'unavailable'}
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
            ) : (
              <div>
                <p className="formpack-records__empty">
                  {isRecordsLoading
                    ? t('formpackRecordsLoading')
                    : t('formpackRecordsEmpty')}
                </p>
                <div className="formpack-records__actions">
                  <button
                    type="button"
                    className="app__button"
                    onClick={handleCreateRecord}
                    disabled={!manifest || storageError === 'unavailable'}
                  >
                    {t('formpackRecordNew')}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="formpack-detail__section">
            <h3>{t('formpackImportHeading')}</h3>
            <p className="formpack-import__hint">{t('formpackImportHint')}</p>
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
              />
              {importFileName && (
                <p className="formpack-import__file-name">
                  {t('formpackImportFileName', { name: importFileName })}
                </p>
              )}
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
              {!activeRecord && (
                <p className="formpack-import__note">
                  {t('formpackImportModeOverwriteHint')}
                </p>
              )}
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
            {importError && <p className="app__error">{importError}</p>}
            {importSuccess && (
              <p className="formpack-import__success">{importSuccess}</p>
            )}
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
                {isImporting
                  ? t('formpackImportInProgress')
                  : t('formpackImportAction')}
              </button>
            </div>
          </div>
          <div className="formpack-detail__section">
            <h3>{t('formpackFormHeading')}</h3>
            {activeRecord ? (
              schema &&
              normalizedUiSchema &&
              validator && (
                <Suspense fallback={<p>{t('formpackLoading')}</p>}>
                  <LazyForm
                    className="formpack-form"
                    schema={schema}
                    uiSchema={normalizedUiSchema}
                    templates={formpackTemplates}
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
                      {manifest.exports.includes('docx') &&
                        manifest.docx &&
                        docxTemplateOptions.length > 0 && (
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
                                  setDocxTemplateId(
                                    event.target.value as DocxTemplateId,
                                  )
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
                              disabled={
                                storageError === 'unavailable' ||
                                isDocxExporting
                              }
                            >
                              {isDocxExporting
                                ? t('formpackDocxExportInProgress')
                                : t('formpackRecordExportDocx')}
                            </button>
                            {docxError && (
                              <span className="app__error">{docxError}</span>
                            )}
                            {docxSuccess && (
                              <span className="formpack-docx-export__success">
                                {docxSuccess}
                              </span>
                            )}
                          </div>
                        )}
                      <button
                        type="button"
                        className="app__button"
                        onClick={handleResetForm}
                      >
                        {t('formpackFormReset')}
                      </button>
                      {manifest.exports.includes('json') && (
                        <button
                          type="button"
                          className="app__button"
                          onClick={handleExportJson}
                          disabled={storageError === 'unavailable'}
                        >
                          {t('formpackRecordExportJson')}
                        </button>
                      )}
                    </div>
                  </LazyForm>
                </Suspense>
              )
            ) : (
              <p className="formpack-records__empty">
                {t('formpackFormNoActiveRecord')}
              </p>
            )}
          </div>
          <div className="formpack-detail__section">
            <h3>{t('formpackSnapshotsHeading')}</h3>
            {activeRecord ? (
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
                {snapshots.length ? (
                  <ul className="formpack-snapshots__list">
                    {snapshots.map((snapshot) => (
                      <li
                        key={snapshot.id}
                        className="formpack-snapshots__item"
                      >
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
                ) : (
                  <p className="formpack-snapshots__empty">
                    {isSnapshotsLoading
                      ? t('formpackSnapshotsLoading')
                      : t('formpackSnapshotsEmpty')}
                  </p>
                )}
              </>
            ) : (
              <p className="formpack-snapshots__empty">
                {t('formpackSnapshotsNoRecord')}
              </p>
            )}
          </div>
          <div className="formpack-detail__section">
            <h3>{t('formpackFormPreviewHeading')}</h3>
            <pre className="formpack-preview">
              {Object.keys(formData).length
                ? jsonPreview
                : t('formpackFormPreviewEmpty')}
            </pre>
          </div>
          <div className="formpack-detail__section">
            <h3>{t('formpackDocumentPreviewHeading')}</h3>
            {hasDocumentContent ? (
              <div className="formpack-document-preview">{documentPreview}</div>
            ) : (
              <p className="formpack-document-preview__empty">
                {t('formpackDocumentPreviewEmpty')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
