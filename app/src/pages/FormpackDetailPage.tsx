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
import { loadFormpackI18n } from '../i18n/formpack';
import { translateUiSchema } from '../i18n/rjsf';
import { useLocale } from '../i18n/useLocale';
import { validateJsonImport } from '../import/json';
import {
  formpackTemplates,
  type FormpackFormContext,
} from '../lib/rjsfTemplates';
import { applyArrayUiSchemaDefaults } from '../lib/rjsfUiSchema';
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
import { createSnapshot as createSnapshotEntry } from '../storage/snapshots';
import type { ComponentType } from 'react';
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

/**
 * Shows formpack metadata with translations loaded for the active locale.
 */
export default function FormpackDetailPage() {
  const { t, i18n } = useTranslation();
  const { locale } = useLocale();
  const { id } = useParams();
  const [manifest, setManifest] = useState<FormpackManifest | null>(null);
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [formData, setFormData] = useState<FormDataState>({});
  const [importJson, setImportJson] = useState('');
  const [importMode, setImportMode] = useState<'new' | 'overwrite'>('new');
  const [importIncludeRevisions, setImportIncludeRevisions] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [validator, setValidator] = useState<ValidatorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<StorageErrorCode | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const lastFormpackIdRef = useRef<string | undefined>(undefined);
  const hasRestoredRecordRef = useRef<string | null>(null);
  const formpackId = manifest?.id ?? null;
  const {
    records,
    activeRecord,
    isLoading: isRecordsLoading,
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
      lastFormpackIdRef.current = undefined;
      setErrorMessage(t('formpackMissingId'));
      setIsLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [id, locale, t]);

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
    return uiSchema ? translateUiSchema(uiSchema, t, namespace) : null;
  }, [activeLanguage, namespace, t, uiSchema]);
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

    if (hasRestoredRecordRef.current === formpackId || isRecordsLoading) {
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

  const handleFormChange: NonNullable<RjsfFormProps['onChange']> = (event) => {
    const nextData = event.formData as FormDataState;
    setFormData(nextData);
  };

  const handleFormSubmit: NonNullable<RjsfFormProps['onSubmit']> = (
    event,
    submitEvent,
  ) => {
    submitEvent?.preventDefault();
    setFormData(event.formData as FormDataState);
  };

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

    const result = validateJsonImport(importJson, schema, manifest.id);
    if (result.error) {
      setImportError(buildImportErrorMessage(result.error));
      setIsImporting(false);
      return;
    }

    try {
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

        const updates: {
          data: Record<string, unknown>;
          locale: typeof payload.record.locale;
          title?: string;
        } = {
          data: payload.record.data,
          locale: payload.record.locale,
        };

        if (payload.record.title) {
          updates.title = payload.record.title;
        }

        const updated = await updateActiveRecord(activeRecord.id, updates);
        if (!updated) {
          setImportError(t('importStorageError'));
          return;
        }

        markAsSaved(updated.data);
        setFormData(updated.data);
        persistActiveRecordId(updated.id);
        targetRecordId = updated.id;
      } else {
        const recordTitle =
          payload.record.title ?? title ?? t('formpackRecordUntitled');
        const record = await createRecord(
          payload.record.locale,
          payload.record.data,
          recordTitle,
        );
        if (!record) {
          setImportError(t('importStorageError'));
          return;
        }

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
        await Promise.all(
          payload.revisions.map((revision) =>
            createSnapshotEntry(
              targetRecordId,
              revision.data,
              revision.label,
              revision.createdAt,
            ),
          ),
        );
        if (importMode === 'overwrite') {
          await refreshSnapshots();
        }
      }

      setImportSuccess(t('importSuccess'));
      setImportJson('');
    } catch {
      setImportError(t('importStorageError'));
    } finally {
      setIsImporting(false);
    }
  }, [
    activeRecord,
    buildImportErrorMessage,
    createRecord,
    importIncludeRevisions,
    importJson,
    importMode,
    manifest,
    markAsSaved,
    persistActiveRecordId,
    refreshSnapshots,
    schema,
    t,
    title,
    updateActiveRecord,
  ]);

  useEffect(() => {
    let isActive = true;

    const loadValidator = async () => {
      const module = await import('@rjsf/validator-ajv8');
      if (isActive) {
        setValidator(module.default);
      }
    };

    void loadValidator();

    return () => {
      isActive = false;
    };
  }, []);

  const formContext = useMemo<FormpackFormContext>(() => ({ t }), [t]);

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
      <div className="formpack-detail">
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
                  <dd>{manifest.docx.templates.wallet}</dd>
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
              <label htmlFor="formpack-import-json">
                {t('formpackImportLabel')}
              </label>
              <textarea
                id="formpack-import-json"
                className="formpack-import__textarea"
                rows={6}
                value={importJson}
                onChange={(event) => {
                  setImportJson(event.target.value);
                  setImportError(null);
                  setImportSuccess(null);
                }}
              />
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
                      <button
                        type="button"
                        className="app__button"
                        onClick={() => {
                          if (!activeRecord) {
                            return;
                          }

                          markAsSaved(activeRecord.data);
                          setFormData(activeRecord.data);
                        }}
                      >
                        {t('formpackFormReset')}
                      </button>
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
                ? JSON.stringify(formData, null, 2)
                : t('formpackFormPreviewEmpty')}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
