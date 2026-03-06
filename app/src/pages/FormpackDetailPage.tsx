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
  scheduleDocxPreload,
  type DocxTemplateId,
} from '../export/docxLazy';
import type { PdfExportControlsProps } from '../export/pdf';
import { applyArrayUiSchemaDefaults } from '../lib/rjsfUiSchema';
import {
  formpackTemplates,
  type FormpackFormContext,
} from '../lib/rjsfTemplates';
import { FormpackFieldTemplate } from '../lib/rjsfFormpackFieldTemplate';
import { resolveDisplayValue } from '../lib/displayValueResolver';
import { hasPreviewValue } from '../lib/previewValue';
import { isRecord } from '../lib/utils';
import { buildRandomDummyPatch } from '../lib/devDummyFill';
import { focusWithRetry } from '../lib/focusWithRetry';
import { formpackWidgets } from '../lib/rjsfWidgetRegistry';
import { normalizeParagraphText } from '../lib/text/paragraphs';
import { getPathValue, setPathValueImmutable } from '../lib/pathAccess';
import {
  USER_TIMING_NAMES,
  startUserTiming,
} from '../lib/performance/userTiming';
import {
  FORMPACKS_UPDATED_EVENT,
  DOCTOR_LETTER_FORMPACK_ID,
  NOTFALLPASS_FORMPACK_ID,
  OFFLABEL_ANTRAG_FORMPACK_ID,
  deriveFormpackRevisionSignature,
  getFieldVisibility,
  clearHiddenFields,
  isDevUiEnabled,
  isFormpackVisible,
  resolveDecisionTree,
  type DecisionData,
  type FormpackId,
  type FormpackManifest,
  type InfoBoxConfig,
} from '../formpacks';
import { buildOfflabelDocuments } from '../formpacks/offlabel-antrag/content/buildOfflabelDocuments';
import {
  resolveOfflabelFocusTarget,
  type OfflabelFocusTarget,
} from '../formpacks/offlabel-antrag/focusTarget';
import { applyOfflabelVisibility } from '../formpacks/offlabel-antrag/uiVisibility';
import { normalizeDecisionAnswers } from '../formpacks/doctor-letter/decisionAnswers';
import {
  type FormpackMetaEntry,
  type RecordEntry,
  type StorageErrorCode,
  getFormpackMeta,
  importRecordWithSnapshots,
  upsertFormpackMeta,
  useAutosaveRecord,
  useRecords,
  useSnapshots,
} from '../storage';
import { resetAllLocalData, useStorageHealth } from '../lib/diagnostics';
import { useConfirmationDialog } from '../components/useConfirmationDialog';
import FormpackIntroGate from '../components/FormpackIntroGate';
import FormpackIntroModal from '../components/FormpackIntroModal';
import {
  DevMetadataPanel,
  DocumentPreviewPanel,
  FormContentSection,
  FormpackDetailHeader,
  ImportPanel,
  QuotaBanner,
  RecordsPanel,
  SnapshotsPanel,
} from './formpack-detail';
import { formpackDetailHelpers } from './formpack-detail/formpackDetailHelpers';
import { useFormpackLoader } from './formpack-detail/useFormpackLoader';
import { useProfileSync } from './formpack-detail/useProfileSync';
import { APP_UPDATE_AVAILABLE_EVENT } from '../pwa/register';
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

const LAST_ACTIVE_FORMPACK_KEY = 'mecfs-paperwork.lastActiveFormpackId';
const FORM_PRIMARY_FOCUS_SELECTOR =
  '.formpack-form input:not([type="hidden"]):not([disabled]), .formpack-form select:not([disabled]), .formpack-form textarea:not([disabled]), .formpack-form button:not([disabled]), .formpack-form [tabindex]:not([tabindex="-1"])';
const FORM_FALLBACK_FOCUS_SELECTOR = '.formpack-form__actions .app__button';
const FOCUS_RETRY_DELAY_MS = 50;
const FOCUS_RETRY_ATTEMPTS = 30;

const showDevMedicationOptions = isFormpackVisible({ visibility: 'dev' });
const ignoreAsyncError = (): void => {
  // Intentionally ignore async follow-up errors to keep UI flows resilient.
};

/**
 * Shows formpack metadata with translations loaded for the active locale.
 */
export default function FormpackDetailPage() {
  const { t, i18n } = useTranslation();
  const { confirmationDialog, requestConfirmation } = useConfirmationDialog();
  const { locale, setLocale } = useLocale();
  const { id } = useParams();
  const [formData, setFormData] = useState<FormDataState>({});
  const [importJson, setImportJson] = useState('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isImportFileEncrypted, setIsImportFileEncrypted] = useState(false);
  const [importMode, setImportMode] = useState<'new' | 'overwrite'>('new');
  const [importIncludeRevisions, setImportIncludeRevisions] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [encryptJsonExport, setEncryptJsonExport] = useState(false);
  const [jsonExportPassword, setJsonExportPassword] = useState('');
  const [jsonExportPasswordConfirm, setJsonExportPasswordConfirm] =
    useState('');
  const [jsonExportError, setJsonExportError] = useState<string | null>(null);
  const [docxTemplateId, setDocxTemplateId] = useState<DocxTemplateId>('a4');
  const [docxError, setDocxError] = useState<string | null>(null);
  const [docxSuccess, setDocxSuccess] = useState<string | null>(null);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);
  const [validator, setValidator] = useState<ValidatorType | null>(null);
  const [storageError, setStorageError] = useState<StorageErrorCode | null>(
    null,
  );
  const { health: storageHealth } = useStorageHealth();
  const [dismissedQuotaStatus, setDismissedQuotaStatus] = useState<
    'warning' | 'error' | null
  >(null);
  const [formpackMeta, setFormpackMeta] = useState<FormpackMetaEntry | null>(
    null,
  );
  const [assetRefreshVersion, setAssetRefreshVersion] = useState(0);
  const [showFormpackUpdateNotice, setShowFormpackUpdateNotice] =
    useState(false);
  const [showAppUpdateNotice, setShowAppUpdateNotice] = useState(false);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  const [pendingIntroFocus, setPendingIntroFocus] = useState(false);
  const [pendingFormFocus, setPendingFormFocus] = useState(false);
  const [pendingOfflabelFocusTarget, setPendingOfflabelFocusTarget] =
    useState<OfflabelFocusTarget | null>(null);
  const [selectedOfflabelPreviewId, setSelectedOfflabelPreviewId] = useState<
    'part1' | 'part2' | 'part3'
  >('part1');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const formContentRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredRecordRef = useRef<string | null>(null);
  const handleLoadedFormpackChange = useCallback(() => {
    setFormData({});
    setIsIntroModalOpen(false);
  }, []);
  const { errorMessage, isLoading, manifest, schema, uiSchema } =
    useFormpackLoader({
      formpackId: id,
      locale,
      onFormpackChanged: handleLoadedFormpackChange,
      refreshToken: assetRefreshVersion,
      t,
    });
  const formpackId = (manifest?.id as FormpackId | undefined) ?? null;
  const offlabelOutputLocale: SupportedLocale =
    formpackId === OFFLABEL_ANTRAG_FORMPACK_ID ? 'de' : locale;
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
        handleProfileRecordSaved(record);
      },
      onError: setStorageError,
    },
  );
  const {
    profileSaveEnabled,
    profileHasSavedData,
    profileStatus,
    clearProfileStatus,
    handleProfileRecordSaved,
    handleProfileSaveToggle,
    handleApplyProfile,
  } = useProfileSync({
    formpackId,
    formData,
    markAsSaved,
    requestConfirmation,
    setFormData,
    t,
  });

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
        const signature = await deriveFormpackRevisionSignature(manifest);
        const existing = await getFormpackMeta(manifest.id);
        const hasMatchingMeta =
          existing !== null &&
          existing.versionOrHash === signature.versionOrHash &&
          existing.hash === signature.hash &&
          (existing.version ?? null) === (signature.version ?? null);

        const nextMeta = hasMatchingMeta
          ? existing
          : await upsertFormpackMeta({
              id: manifest.id,
              versionOrHash: signature.versionOrHash,
              version: signature.version,
              hash: signature.hash,
            });

        if (isActive) {
          setFormpackMeta(nextMeta);
        }
      } catch {
        if (isActive) {
          setFormpackMeta(null);
        }
      }
    };

    ensureFormpackMeta().catch(ignoreAsyncError);

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
      const next = await getFormpackMeta(currentFormpackId);
      if (isActive) {
        setFormpackMeta(next);
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

      setShowFormpackUpdateNotice(true);
      refreshMeta().catch(ignoreAsyncError);
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
    const handleAppUpdateAvailable = () => {
      setShowAppUpdateNotice(true);
    };

    globalThis.addEventListener(
      APP_UPDATE_AVAILABLE_EVENT,
      handleAppUpdateAvailable,
    );

    return () => {
      globalThis.removeEventListener(
        APP_UPDATE_AVAILABLE_EVENT,
        handleAppUpdateAvailable,
      );
    };
  }, []);

  useEffect(() => {
    const manifestExports = manifest?.exports;
    if (!manifest?.docx || !manifestExports?.includes('docx') || !formpackId) {
      return;
    }

    const docxManifest = manifest.docx;

    // Preload DOCX assets so export still works after going offline.
    return scheduleDocxPreload(() =>
      preloadDocxAssets(formpackId, docxManifest),
    );
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

  const effectiveStorageError = storageError ?? recordsError ?? snapshotsError;

  const namespace = useMemo(
    () => (manifest ? `formpack:${manifest.id}` : undefined),
    [manifest],
  );
  const activeLanguage = i18n.language;
  const translatedUiSchema = useMemo(() => {
    if (!uiSchema) {
      return null;
    }
    const translate = ((key: string, options?: Record<string, unknown>) =>
      t(key, { ...options, lng: activeLanguage })) as typeof t;
    return translateUiSchema(uiSchema, translate, namespace);
  }, [activeLanguage, namespace, t, uiSchema]);
  const normalizedUiSchema = useMemo(
    () =>
      schema && translatedUiSchema
        ? applyArrayUiSchemaDefaults(schema, translatedUiSchema)
        : null,
    [schema, translatedUiSchema],
  );
  // ⚡ Perf: Extract the narrow slices of formData that actually affect schema
  // and UI visibility. Using the full formData as a useMemo dependency would
  // trigger expensive structuredClone on every keystroke, even when the user
  // edits unrelated text fields.
  const selectedDrug = getPathValue(formData, 'request.drug');
  const selectedIndicationKey = getPathValue(
    formData,
    'request.selectedIndicationKey',
  );
  const indicationConfirmation = getPathValue(
    formData,
    'request.indicationFullyMetOrDoctorConfirms',
  );
  const decisionData = formData.decision;
  const offlabelVisibilityData = useMemo(
    () => ({
      request: {
        drug: selectedDrug,
        selectedIndicationKey,
        indicationFullyMetOrDoctorConfirms: indicationConfirmation,
      },
    }),
    [selectedDrug, selectedIndicationKey, indicationConfirmation],
  );

  const formSchema = useMemo(() => {
    if (!schema || formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID) {
      return schema;
    }
    return formpackDetailHelpers.buildOfflabelFormSchema(
      schema,
      formData,
      showDevMedicationOptions,
      locale,
    );
  }, [selectedDrug, formpackId, schema, locale, showDevMedicationOptions]); // eslint-disable-line react-hooks/exhaustive-deps -- formData read narrowed to selectedDrug

  // Apply conditional visibility for doctor-letter decision tree
  const conditionalUiSchema = useMemo(() => {
    if (!normalizedUiSchema) {
      return normalizedUiSchema;
    }

    if (formpackId === OFFLABEL_ANTRAG_FORMPACK_ID) {
      return applyOfflabelVisibility(
        normalizedUiSchema,
        offlabelVisibilityData,
        locale,
        showDevMedicationOptions,
      );
    }

    if (formpackId !== DOCTOR_LETTER_FORMPACK_ID) {
      return normalizedUiSchema;
    }

    // Treat missing or invalid decision as empty object to apply visibility rules
    const decision = (
      isRecord(decisionData) ? decisionData : {}
    ) as DecisionData;
    const visibility = getFieldVisibility(decision);

    // Clone the UI schema to avoid mutations
    const clonedUiSchema = structuredClone(normalizedUiSchema);

    if (!isRecord(clonedUiSchema.decision)) {
      return normalizedUiSchema;
    }

    const decisionUiSchema = clonedUiSchema.decision;

    // Apply field visibility rules
    formpackDetailHelpers.applyFieldVisibility(decisionUiSchema, visibility);

    // Hide result field for incomplete decision tree (but show for valid Case 0)
    if (
      formpackDetailHelpers.shouldHideCase0Result(decision) &&
      isRecord(decisionUiSchema.resolvedCaseText)
    ) {
      const resultSchema = decisionUiSchema.resolvedCaseText;
      resultSchema['ui:widget'] = 'hidden';
    }

    return clonedUiSchema;
  }, [
    normalizedUiSchema,
    formpackId,
    decisionData,
    locale,
    offlabelVisibilityData,
  ]);

  const handleApplyDummyData = useCallback(() => {
    const patch = buildRandomDummyPatch(formSchema, conditionalUiSchema);
    const merged = formpackDetailHelpers.mergeDummyPatch(formData, patch);
    const nextData = isRecord(merged) ? merged : formData;

    clearProfileStatus();
    setFormData(nextData);
    markAsSaved(nextData);
  }, [
    clearProfileStatus,
    conditionalUiSchema,
    formData,
    formSchema,
    markAsSaved,
  ]);

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
    if (!effectiveStorageError) {
      return null;
    }

    if (effectiveStorageError === 'locked') {
      return t('storageLocked');
    }

    return effectiveStorageError === 'unavailable'
      ? t('storageUnavailable')
      : t('storageError');
  }, [effectiveStorageError, t]);
  const confirmationDialogTitle = t('confirmationDialogTitle');
  const cancelLabel = t('common.cancel');

  const handleResetAllStorageData = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: confirmationDialogTitle,
      message: t('resetAllConfirm'),
      confirmLabel: t('resetAllButton'),
      cancelLabel,
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    await resetAllLocalData();
  }, [cancelLabel, confirmationDialogTitle, requestConfirmation, t]);

  const storageBlocked =
    effectiveStorageError === 'unavailable' ||
    effectiveStorageError === 'locked';

  useEffect(() => {
    if (!activeRecord && importMode === 'overwrite') {
      setImportMode('new');
    }
  }, [activeRecord, importMode]);

  useEffect(() => {
    if (!encryptJsonExport) {
      setJsonExportPassword('');
      setJsonExportPasswordConfirm('');
      setJsonExportError(null);
    }
  }, [encryptJsonExport]);

  const activeRecordStorageKey = useMemo(
    () => (formpackId ? `mecfs-paperwork.activeRecordId.${formpackId}` : null),
    [formpackId],
  );

  const readActiveRecordId = useCallback(() => {
    try {
      return globalThis.localStorage.getItem(activeRecordStorageKey!);
    } catch {
      return null;
    }
  }, [activeRecordStorageKey]);

  const persistActiveRecordId = useCallback(
    (recordId: string) => {
      try {
        globalThis.localStorage.setItem(activeRecordStorageKey!, recordId);
        globalThis.localStorage.setItem(LAST_ACTIVE_FORMPACK_KEY, formpackId!);
      } catch {
        // Ignore storage errors to keep the UI responsive.
      }
    },
    [activeRecordStorageKey, formpackId],
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
      try {
        const restoredRecord = await getLastActiveRecord(currentFormpackId);
        if (!isActive()) {
          return;
        }

        if (restoredRecord) {
          setActiveRecord(restoredRecord);
          persistActiveRecordId(restoredRecord.id);
          return;
        }

        const fallbackRecord = getFallbackRecord(currentFormpackId);
        if (fallbackRecord) {
          setActiveRecord(fallbackRecord);
          persistActiveRecordId(fallbackRecord.id);
          return;
        }

        if (!manifest || storageBlocked) {
          setActiveRecord(null);
          return;
        }

        const recordTitle = title || t('formpackRecordUntitled');
        const record = await createRecord(locale, formData, recordTitle);
        if (isActive() && record?.formpackId === currentFormpackId) {
          setActiveRecord(record);
          persistActiveRecordId(record.id);
          return;
        }

        setActiveRecord(null);
      } catch {
        // Keep active record restore best-effort.
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
      storageBlocked,
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
      ignoreAsyncError,
    );

    return () => {
      isActive = false;
    };
  }, [formpackId, hasLoadedRecords, isRecordsLoading, restoreActiveRecord]);

  const resolveAndPopulateDoctorLetterCase = useCallback(
    (decision: Record<string, unknown>): string => {
      const result = resolveDecisionTree(normalizeDecisionAnswers(decision));

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
      const incomingData = event.formData as FormDataState;
      let nextData: FormDataState = { ...incomingData };

      if (
        formpackId === OFFLABEL_ANTRAG_FORMPACK_ID &&
        isRecord(nextData.request)
      ) {
        const previousRequest = isRecord(formData.request)
          ? formData.request
          : null;
        const normalizedRequest =
          formpackDetailHelpers.normalizeOfflabelRequest(
            nextData.request,
            showDevMedicationOptions,
          );
        nextData = {
          ...nextData,
          request: normalizedRequest,
        };
        const focusTarget = resolveOfflabelFocusTarget(
          previousRequest,
          normalizedRequest,
          showDevMedicationOptions,
        );
        if (focusTarget) {
          setPendingOfflabelFocusTarget(focusTarget);
        }
      }

      // For doctor-letter formpack, clear hidden fields to prevent stale values
      if (
        formpackId === DOCTOR_LETTER_FORMPACK_ID &&
        isRecord(nextData.decision)
      ) {
        const originalDecision = nextData.decision as DecisionData;

        // Clear hidden fields to prevent stale values from affecting decision tree
        const clearedDecision = clearHiddenFields(originalDecision);

        // Only update if clearing actually changed something
        const hasChanges =
          JSON.stringify(originalDecision) !== JSON.stringify(clearedDecision);

        if (hasChanges) {
          nextData = {
            ...nextData,
            decision: clearedDecision,
          };
        }
      }

      setFormData(nextData);
    },
    [formData.request, formpackId, setFormData],
  );

  useEffect(() => {
    if (
      formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID ||
      !isRecord(formData.request)
    ) {
      return;
    }

    const request = formData.request;
    const normalizedRequest = formpackDetailHelpers.normalizeOfflabelRequest(
      request,
      showDevMedicationOptions,
    );
    if (JSON.stringify(request) === JSON.stringify(normalizedRequest)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      request: normalizedRequest,
    }));
  }, [formData, formpackId, setFormData]);

  // Resolve decision tree after formData changes (for doctor-letter only)
  useEffect(() => {
    if (
      formpackId === DOCTOR_LETTER_FORMPACK_ID &&
      isRecord(formData.decision)
    ) {
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
      setFormData({ ...(event.formData as FormDataState) });
    },
    [setFormData],
  );

  const handleResetForm = useCallback(async () => {
    const clearedData: FormDataState = {};
    setFormData(clearedData);

    const updated = await updateActiveRecord(activeRecord!.id, {
      data: clearedData,
      locale,
    });
    if (updated) {
      markAsSaved(updated.data);
    }
    setPendingFormFocus(true);
  }, [activeRecord, locale, markAsSaved, updateActiveRecord]);

  const handleCreateRecord = useCallback(async () => {
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
    setPendingFormFocus(true);
  }, [
    activeRecord,
    createRecord,
    formData,
    locale,
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
        setPendingFormFocus(true);
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

      const confirmed = await requestConfirmation({
        title: confirmationDialogTitle,
        message: t('formpackRecordDeleteConfirm', {
          title: record.title ?? t('formpackRecordUntitled'),
        }),
        confirmLabel: t('formpackRecordDelete'),
        cancelLabel,
        tone: 'danger',
      });
      if (!confirmed) {
        return;
      }

      await deleteRecord(record.id);
    },
    [
      activeRecord?.id,
      cancelLabel,
      confirmationDialogTitle,
      deleteRecord,
      requestConfirmation,
      t,
    ],
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
      setPendingFormFocus(true);
    },
    [activeRecord, loadSnapshot, markAsSaved, updateActiveRecord],
  );

  const handleClearSnapshots = useCallback(async () => {
    if (!activeRecord) {
      return;
    }

    const confirmed = await requestConfirmation({
      title: confirmationDialogTitle,
      message: t('formpackSnapshotsClearAllConfirm'),
      confirmLabel: t('formpackSnapshotsClearAll'),
      cancelLabel,
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }

    await clearSnapshots();
  }, [
    activeRecord,
    cancelLabel,
    clearSnapshots,
    confirmationDialogTitle,
    requestConfirmation,
    t,
  ]);

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

      const confirmed = await requestConfirmation({
        title: confirmationDialogTitle,
        message: t('importOverwriteConfirm'),
        confirmLabel: t('formpackImportModeOverwrite'),
        cancelLabel,
        tone: 'danger',
      });
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
      cancelLabel,
      confirmationDialogTitle,
      formpackId,
      importIncludeRevisions,
      requestConfirmation,
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
      let normalizedImportJson = importJson;
      const encryptionEnvelope =
        formpackDetailHelpers.tryParseEncryptedEnvelope(importJson);

      if (encryptionEnvelope) {
        if (!importPassword) {
          setImportError(t('importPasswordRequired'));
          return;
        }

        const { decryptJsonWithPassword } =
          await formpackDetailHelpers.loadJsonEncryptionModule();

        normalizedImportJson = await decryptJsonWithPassword(
          encryptionEnvelope,
          importPassword,
        );
      }

      const result = validateJsonImport(
        normalizedImportJson,
        schema,
        manifest.id,
      );

      if (result.error) {
        setImportError(
          formpackDetailHelpers.resolveImportErrorMessage(result.error, t),
        );
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
      setImportPassword('');
      setIsImportFileEncrypted(false);
      importInputRef.current!.value = '';
    } catch (error) {
      if (formpackDetailHelpers.isJsonEncryptionRuntimeError(error)) {
        setImportError(
          formpackDetailHelpers.resolveJsonEncryptionErrorMessage(
            error,
            'import',
            t,
          ),
        );
        return;
      }

      setImportError(t('importStorageError'));
    } finally {
      setIsImporting(false);
    }
  }, [
    importIncludeRevisions,
    importJson,
    importMode,
    importNewRecord,
    importPassword,
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
        setImportPassword('');
        setIsImportFileEncrypted(false);
        return;
      }

      setImportPassword('');

      try {
        const text = await file.text();
        setImportJson(text);
        setImportFileName(file.name);
        setIsImportFileEncrypted(
          Boolean(formpackDetailHelpers.tryParseEncryptedEnvelope(text)),
        );
      } catch {
        setImportJson('');
        setImportFileName(file.name);
        setIsImportFileEncrypted(false);
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
    return getPathValue(formData, introGateConfig.acceptedFieldPath) !== true;
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
    setPendingIntroFocus(true);
    setFormData((current) =>
      setPathValueImmutable(current, introGateConfig!.acceptedFieldPath, true),
    );
  }, [introGateConfig]);

  useEffect(() => {
    if (!pendingIntroFocus || isIntroGateVisible) {
      return;
    }

    return focusWithRetry({
      getRoot: () => formContentRef.current,
      selector: FORM_PRIMARY_FOCUS_SELECTOR,
      fallbackSelector: FORM_FALLBACK_FOCUS_SELECTOR,
      maxAttempts: FOCUS_RETRY_ATTEMPTS,
      retryDelayMs: FOCUS_RETRY_DELAY_MS,
      onResolved: () => setPendingIntroFocus(false),
    });
  }, [isIntroGateVisible, pendingIntroFocus]);

  useEffect(() => {
    if (!pendingFormFocus || isIntroGateVisible) {
      return;
    }

    return focusWithRetry({
      getRoot: () => formContentRef.current,
      selector: FORM_PRIMARY_FOCUS_SELECTOR,
      fallbackSelector: FORM_FALLBACK_FOCUS_SELECTOR,
      maxAttempts: FOCUS_RETRY_ATTEMPTS,
      retryDelayMs: FOCUS_RETRY_DELAY_MS,
      onResolved: () => setPendingFormFocus(false),
    });
  }, [isIntroGateVisible, pendingFormFocus]);

  useEffect(() => {
    if (
      formpackId !== OFFLABEL_ANTRAG_FORMPACK_ID ||
      !pendingOfflabelFocusTarget ||
      isIntroGateVisible
    ) {
      return;
    }

    const selector =
      formpackDetailHelpers.OFFLABEL_FOCUS_SELECTOR_BY_TARGET[
        pendingOfflabelFocusTarget
      ];
    return focusWithRetry({
      getRoot: () => formContentRef.current,
      selector,
      fallbackSelector: FORM_FALLBACK_FOCUS_SELECTOR,
      maxAttempts: FOCUS_RETRY_ATTEMPTS,
      retryDelayMs: FOCUS_RETRY_DELAY_MS,
      onResolved: () => setPendingOfflabelFocusTarget(null),
    });
  }, [formpackId, isIntroGateVisible, pendingOfflabelFocusTarget]);

  // Use custom field template for formpacks that provide InfoBoxes.
  const templates = useMemo(() => {
    if ((manifest?.ui?.infoBoxes?.length ?? 0) > 0) {
      return {
        ...formpackTemplates,
        FieldTemplate: FormpackFieldTemplate,
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
  const resolvePreviewValue = useCallback<
    (
      value: unknown,
      schemaNode?: RJSFSchema,
      uiNode?: UiSchema,
      fieldPath?: string,
    ) => ReactNode
  >(
    (value, schemaNode, uiNode, fieldPath) =>
      resolveDisplayValue(value, {
        schema: schemaNode,
        uiSchema: uiNode,
        namespace,
        formpackId: manifest?.id ?? undefined,
        fieldPath,
        t: (key, options) => {
          if (key.startsWith('common.')) {
            return t(key, { ...options, ns: 'app' });
          }
          const packResult = t(key, { ...options, ns: namespace });
          if (packResult !== key) {
            return packResult;
          }
          return t(key, options);
        },
      }),
    [manifest?.id, namespace, t],
  );
  const documentPreview = useMemo(() => {
    const previewData = formData;

    const schemaProps = isRecord(formSchema?.properties)
      ? (formSchema.properties as Record<string, RJSFSchema>)
      : null;
    const keys = formpackDetailHelpers.getOrderedKeys(
      formSchema ?? undefined,
      previewUiSchema,
      previewData,
    );
    const sections = keys
      .map<ReactNode>((key) => {
        const entry = previewData[key];
        if (!hasPreviewValue(entry)) {
          return null;
        }
        const childSchema = schemaProps ? schemaProps[key] : undefined;
        const childUi = formpackDetailHelpers.getUiSchemaNode(
          previewUiSchema,
          key,
        );
        const label = formpackDetailHelpers.getLabel(key, childSchema, childUi);

        if (Array.isArray(entry)) {
          return formpackDetailHelpers.renderPreviewArray(
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
          return formpackDetailHelpers.renderPreviewObject(
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
            <p>{resolvedValue}</p>
          </div>
        );
      })
      .filter((entry): entry is Exclude<ReactNode, null | undefined | false> =>
        Boolean(entry),
      );

    return sections.length ? sections : null;
  }, [formData, formSchema, previewUiSchema, resolvePreviewValue]);
  const handleExportJson = useCallback(async () => {
    const currentManifest = manifest as FormpackManifest;
    const currentRecord = activeRecord as RecordEntry;
    const timing = startUserTiming(USER_TIMING_NAMES.exportJsonTotal);
    setJsonExportError(null);

    try {
      const payload = buildJsonExportPayload({
        formpack: {
          id: currentManifest.id,
          version: currentManifest.version,
        },
        record: currentRecord,
        data: formData,
        locale,
        revisions: snapshots,
        schema: schema as RJSFSchema | undefined,
      });
      const filename = buildJsonExportFilename(payload);

      if (!encryptJsonExport) {
        downloadJsonExport(payload, filename);
        return;
      }

      if (!jsonExportPassword) {
        setJsonExportError(t('formpackJsonExportPasswordRequired'));
        return;
      }

      if (jsonExportPassword !== jsonExportPasswordConfirm) {
        setJsonExportError(t('formpackJsonExportPasswordMismatch'));
        return;
      }

      const { encryptJsonWithPassword } =
        await formpackDetailHelpers.loadJsonEncryptionModule();

      const encryptedPayload = await encryptJsonWithPassword(
        JSON.stringify(payload),
        jsonExportPassword,
      );
      downloadJsonExport(encryptedPayload, filename);
    } catch (error) {
      setJsonExportError(
        formpackDetailHelpers.resolveJsonEncryptionErrorMessage(
          error,
          'export',
          t,
        ),
      );
    } finally {
      timing.end();
    }
  }, [
    activeRecord,
    encryptJsonExport,
    formData,
    jsonExportPassword,
    jsonExportPasswordConfirm,
    locale,
    manifest,
    schema,
    snapshots,
    t,
  ]);

  const handleExportDocx = useCallback(async () => {
    const timing = startUserTiming(USER_TIMING_NAMES.exportDocxTotal);
    setDocxError(null);
    setDocxSuccess(null);
    setIsDocxExporting(true);

    try {
      const report = await exportDocx({
        formpackId: formpackId as FormpackId,
        recordId: activeRecord?.id as string,
        variant: docxTemplateId,
        locale: offlabelOutputLocale,
        schema: formSchema,
        uiSchema: previewUiSchema,
        manifest: manifest as FormpackManifest,
      });
      const filename = await buildDocxExportFilename(
        formpackId as FormpackId,
        docxTemplateId,
      );
      await downloadDocxExport(report, filename);
      setDocxSuccess(t('formpackDocxExportSuccess'));
    } catch (error) {
      const errorKey = await getDocxErrorKey(error);
      setDocxError(t(errorKey));
    } finally {
      setIsDocxExporting(false);
      timing.end();
    }
  }, [
    activeRecord,
    docxTemplateId,
    formpackId,
    manifest,
    offlabelOutputLocale,
    previewUiSchema,
    formSchema,
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

  const clearDocxSuccess = useCallback(() => {
    if (docxSuccess) {
      setDocxSuccess(null);
    }
  }, [docxSuccess]);

  const clearImportSuccess = useCallback(() => {
    if (importSuccess) {
      setImportSuccess(null);
    }
  }, [importSuccess]);

  const clearPdfSuccess = useCallback(() => {
    if (pdfSuccess) {
      setPdfSuccess(null);
    }
  }, [pdfSuccess]);

  const clearJsonExportError = useCallback(() => setJsonExportError(null), []);

  const handleActionClickCapture = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const action = formpackDetailHelpers.getActionButtonDataAction(
        event.target,
      );
      if (action === null) {
        return;
      }
      if (action === 'docx-export') {
        clearJsonExportError();
        clearImportSuccess();
        clearPdfSuccess();
        return;
      }
      if (action === 'json-import') {
        clearJsonExportError();
        clearDocxSuccess();
        clearPdfSuccess();
        return;
      }

      clearDocxSuccess();
      clearJsonExportError();
      clearPdfSuccess();
      clearImportSuccess();
    },
    [
      clearDocxSuccess,
      clearImportSuccess,
      clearJsonExportError,
      clearPdfSuccess,
    ],
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

    loadValidator().catch(ignoreAsyncError);

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
      formpackId === OFFLABEL_ANTRAG_FORMPACK_ID
        ? buildOfflabelDocuments(formData, offlabelOutputLocale).map(
            (document) =>
              formpackDetailHelpers.stripOfflabelPart2ConsentFromPreview(
                document,
              ),
          )
        : [],
    [formData, formpackId, offlabelOutputLocale],
  );
  const docxTemplateOptions = useMemo(() => {
    if (!manifest?.docx) {
      return [];
    }

    const options: Array<{ id: DocxTemplateId; label: string }> = [
      { id: 'a4', label: t('formpackDocxTemplateA4Option') },
    ];

    if (
      manifest.id === NOTFALLPASS_FORMPACK_ID &&
      manifest.docx.templates.wallet
    ) {
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

  if (errorMessage || !manifest) {
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

  // RATIONALE: Hide dev-only UI in production to reduce exposed metadata and UI surface.
  const showDevSections = isDevUiEnabled;
  const formatRecordUpdatedAt = (timestamp: string) =>
    t('formpackRecordUpdatedAt', { timestamp: formatTimestamp(timestamp) });

  const formatSnapshotCreatedAt = (timestamp: string) =>
    t('formpackSnapshotCreatedAt', { timestamp: formatTimestamp(timestamp) });

  const renderPdfExportControls = () => {
    const pdfSupported = manifest.exports.includes('pdf');
    const disabled = storageBlocked;
    const resolvedFormpackId = manifest.id;

    if (!pdfSupported) {
      return null;
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
            locale={offlabelOutputLocale}
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
    const isOfflabelFormpack = formpackId === OFFLABEL_ANTRAG_FORMPACK_ID;
    const hasMultipleDocxTemplates = docxTemplateOptions.length > 1;
    const hasPdfControls = Boolean(pdfControls);
    const docxExportClassName = hasMultipleDocxTemplates
      ? 'formpack-docx-export'
      : 'formpack-docx-export formpack-docx-export--single-template';
    const docxButtonsClassNameBase = hasPdfControls
      ? 'formpack-docx-export__buttons'
      : 'formpack-docx-export__buttons formpack-docx-export__buttons--single-action';
    const docxButtonsClassName = isOfflabelFormpack
      ? `${docxButtonsClassNameBase} formpack-docx-export__buttons--offlabel`
      : docxButtonsClassNameBase;
    const docxButtonClassName = isOfflabelFormpack
      ? 'app__button formpack-docx-export__button--primary'
      : 'app__button';

    return (
      <div className={docxExportClassName}>
        {hasMultipleDocxTemplates && (
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
        )}
        <div className={docxButtonsClassName}>
          <button
            type="button"
            className={docxButtonClassName}
            onClick={handleExportDocx}
            data-action="docx-export"
            disabled={storageBlocked || isDocxExporting}
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

  const renderJsonExportControls = () =>
    manifest.exports.includes('json') ? (
      <div className="formpack-json-export">
        <label className="formpack-json-export__toggle">
          <input
            type="checkbox"
            checked={encryptJsonExport}
            onChange={(event) => setEncryptJsonExport(event.target.checked)}
          />
          {t('formpackJsonExportEncryptionToggle')}
        </label>
        <p className="formpack-json-export__hint">
          {t('formpackJsonExportEncryptionHint')}
        </p>
        {encryptJsonExport && (
          <div className="formpack-json-export__passwords">
            <label
              className="formpack-json-export__field"
              htmlFor="json-export-password"
            >
              {t('formpackJsonExportPasswordLabel')}
              <input
                id="json-export-password"
                type="password"
                className="formpack-json-export__input"
                value={jsonExportPassword}
                onChange={(event) => setJsonExportPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label
              className="formpack-json-export__field"
              htmlFor="json-export-password-confirm"
            >
              {t('formpackJsonExportPasswordConfirmLabel')}
              <input
                id="json-export-password-confirm"
                type="password"
                className="formpack-json-export__input"
                value={jsonExportPasswordConfirm}
                onChange={(event) =>
                  setJsonExportPasswordConfirm(event.target.value)
                }
                autoComplete="new-password"
              />
            </label>
          </div>
        )}
        <button
          type="button"
          className="app__button"
          onClick={handleExportJson}
          disabled={storageBlocked}
        >
          {t('formpackRecordExportJson')}
        </button>
      </div>
    ) : null;

  const renderActionStatus = () => {
    if (
      !docxError &&
      !docxSuccess &&
      !pdfError &&
      !pdfSuccess &&
      !jsonExportError
    ) {
      return null;
    }

    return (
      <div className="formpack-actions__status" aria-live="polite">
        {docxError && <span className="app__error">{docxError}</span>}
        {docxSuccess && (
          <span className="formpack-actions__success">{docxSuccess}</span>
        )}
        {jsonExportError && (
          <span className="app__error">{jsonExportError}</span>
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

    if (!formSchema || !conditionalUiSchema || !validator) {
      return null;
    }

    if (isIntroGateVisible && introTexts) {
      return (
        <div ref={formContentRef}>
          <FormpackIntroGate
            title={introTexts.title}
            body={introTexts.body}
            checkboxLabel={introTexts.checkboxLabel}
            startButtonLabel={introTexts.startButtonLabel}
            onConfirm={handleAcceptIntroGate}
          />
        </div>
      );
    }

    return (
      <div ref={formContentRef}>
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
        <div className="profile-quickfill">
          <label className="profile-quickfill__save">
            <input
              type="checkbox"
              checked={profileSaveEnabled}
              onChange={handleProfileSaveToggle}
            />
            {t('profileSaveCheckbox')}
          </label>
          <button
            type="button"
            className="app__button"
            disabled={!profileHasSavedData}
            onClick={handleApplyProfile}
          >
            {t('profileApplyButton')}
          </button>
          {showDevSections && (
            <button
              type="button"
              className="app__button"
              onClick={handleApplyDummyData}
            >
              {t('profileApplyDummyButton')}
            </button>
          )}
          {profileStatus && (
            <span
              className={
                profileStatus === t('profileApplySuccess')
                  ? 'profile-quickfill__success'
                  : 'profile-quickfill__error'
              }
              aria-live="polite"
            >
              {profileStatus}
            </span>
          )}
        </div>
        <Suspense fallback={<p>{t('formpackLoading')}</p>}>
          <LazyForm
            className={
              formpackDetailHelpers.hasLetterLayout(formpackId)
                ? 'formpack-form formpack-form--doctor-letter'
                : 'formpack-form'
            }
            schema={formSchema}
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
                {renderJsonExportControls()}
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
      </div>
    );
  };

  const getJsonPreviewContent = () =>
    Object.keys(formData).length ? jsonPreview : t('formpackFormPreviewEmpty');

  const renderDocumentPreviewContent = () => {
    if (formpackId === OFFLABEL_ANTRAG_FORMPACK_ID) {
      return (
        <div className="formpack-document-preview formpack-document-preview--offlabel">
          <div className="formpack-document-preview__tabs" role="tablist">
            {offlabelPreviewDocuments.map((doc) => (
              <button
                key={doc.id}
                id={`offlabel-tab-${doc.id}`}
                role="tab"
                type="button"
                className="app__button"
                aria-selected={selectedOfflabelPreviewId === doc.id}
                aria-controls={`offlabel-tabpanel-${doc.id}`}
                onClick={() => setSelectedOfflabelPreviewId(doc.id)}
              >
                {doc.title}
              </button>
            ))}
          </div>
          {offlabelPreviewDocuments
            .filter((doc) => doc.id === selectedOfflabelPreviewId)
            .map((doc) => (
              <div
                key={doc.id}
                id={`offlabel-tabpanel-${doc.id}`}
                role="tabpanel"
                aria-labelledby={`offlabel-tab-${doc.id}`}
              >
                {formpackDetailHelpers.renderOfflabelPreviewDocument(doc)}
              </div>
            ))}
        </div>
      );
    }

    if (hasDocumentContent) {
      return <div className="formpack-document-preview">{documentPreview}</div>;
    }

    return (
      <p className="formpack-document-preview__empty">
        {t('formpackDocumentPreviewEmpty')}
      </p>
    );
  };

  const currentQuotaStatus =
    storageHealth.status === 'ok' ? null : storageHealth.status;

  return (
    <section className="app__card">
      <FormpackDetailHeader
        title={title}
        description={description}
        backToListLabel={t('formpackBackToList')}
      />
      {currentQuotaStatus && dismissedQuotaStatus !== currentQuotaStatus && (
        <QuotaBanner
          status={currentQuotaStatus}
          warningText={t('storageQuotaWarning')}
          errorText={t('storageQuotaError')}
          dismissLabel={t('storageQuotaDismiss')}
          onDismiss={() => setDismissedQuotaStatus(currentQuotaStatus)}
        />
      )}
      {showFormpackUpdateNotice && (
        <QuotaBanner
          status="warning"
          warningText={t('updateFormpacksAvailable')}
          errorText={t('updateFormpacksAvailable')}
          dismissLabel={t('storageQuotaDismiss')}
          onDismiss={() => setShowFormpackUpdateNotice(false)}
        />
      )}
      {showAppUpdateNotice && (
        <QuotaBanner
          status="warning"
          warningText={t('updateAppAvailablePassive')}
          errorText={t('updateAppAvailablePassive')}
          dismissLabel={t('storageQuotaDismiss')}
          onDismiss={() => setShowAppUpdateNotice(false)}
        />
      )}
      <div
        className="formpack-detail"
        onClickCapture={handleActionClickCapture}
      >
        <div className="formpack-detail__assets">
          <DevMetadataPanel
            show={showDevSections}
            manifest={manifest}
            labels={{
              detailsHeading: t('formpackDetailsHeading'),
              idLabel: t('formpackId'),
              versionLabel: t('formpackVersion'),
              defaultLocaleLabel: t('formpackDefaultLocale'),
              localesLabel: t('formpackLocales'),
              exportsHeading: t('formpackExportsHeading'),
              exportsLabel: t('formpackExports'),
              docxHeading: t('formpackDocxHeading'),
              docxTemplateA4: t('formpackDocxTemplateA4'),
              docxTemplateWallet: t('formpackDocxTemplateWallet'),
              docxTemplateWalletUnavailable: t(
                'formpackDocxTemplateWalletUnavailable',
              ),
              docxMapping: t('formpackDocxMapping'),
            }}
          />
        </div>
        <div className="formpack-detail__form">
          <FormContentSection title={t('formpackFormHeading')}>
            {renderFormContent()}
          </FormContentSection>
          <DocumentPreviewPanel
            title={t('formpackDocumentPreviewHeading')}
            isIntroGateVisible={isIntroGateVisible}
          >
            {renderDocumentPreviewContent()}
          </DocumentPreviewPanel>
          <div className="formpack-detail__section formpack-detail__tools-section">
            <div className="formpack-detail__tools-panel">
              <h3 className="formpack-detail__tools-title">
                {t('formpackToolsHeading')}
              </h3>
              <div className="formpack-detail__tools">
                <RecordsPanel
                  labels={{
                    title: t('formpackRecordsHeading'),
                    recordNew: t('formpackRecordNew'),
                    recordsListLabel: t('formpackRecordsListLabel'),
                    recordUntitled: t('formpackRecordUntitled'),
                    recordLoad: t('formpackRecordLoad'),
                    recordDelete: t('formpackRecordDelete'),
                    recordActive: t('formpackRecordActive'),
                    recordsLoading: t('formpackRecordsLoading'),
                    recordsEmpty: t('formpackRecordsEmpty'),
                  }}
                  records={records}
                  activeRecordId={activeRecord?.id ?? null}
                  isRecordsLoading={isRecordsLoading}
                  storageUnavailable={storageBlocked}
                  storageErrorMessage={storageErrorMessage}
                  storageRecoveryActionLabel={
                    storageError === 'locked' ? t('resetAllButton') : undefined
                  }
                  formatUpdatedAt={formatRecordUpdatedAt}
                  onStorageRecoveryAction={
                    storageError === 'locked'
                      ? handleResetAllStorageData
                      : undefined
                  }
                  onCreateRecord={handleCreateRecord}
                  onLoadRecord={handleLoadRecord}
                  onDeleteRecord={handleDeleteRecord}
                />
                <ImportPanel
                  labels={{
                    title: t('formpackImportHeading'),
                    hint: t('formpackImportHint'),
                    fileLabel: t('formpackImportLabel'),
                    fileName: (name) => t('formpackImportFileName', { name }),
                    passwordLabel: t('formpackImportPasswordLabel'),
                    passwordHint: t('formpackImportPasswordHint'),
                    passwordEncryptedHint: t('formpackImportEncryptedHint'),
                    modeLabel: t('formpackImportModeLabel'),
                    modeNew: t('formpackImportModeNew'),
                    modeOverwrite: t('formpackImportModeOverwrite'),
                    modeOverwriteHint: t('formpackImportModeOverwriteHint'),
                    includeRevisions: t('formpackImportIncludeRevisions'),
                    statusLabel: t('formpackImportStatusLabel'),
                    inProgress: t('formpackImportInProgress'),
                    action: t('formpackImportAction'),
                  }}
                  importInputRef={importInputRef}
                  importFileName={importFileName}
                  importPassword={importPassword}
                  isImportFileEncrypted={isImportFileEncrypted}
                  importMode={importMode}
                  importIncludeRevisions={importIncludeRevisions}
                  importError={importError}
                  importSuccess={importSuccess}
                  importJson={importJson}
                  isImporting={isImporting}
                  activeRecordExists={Boolean(activeRecord)}
                  storageUnavailable={storageBlocked}
                  onImportModeChange={setImportMode}
                  onIncludeRevisionsChange={setImportIncludeRevisions}
                  onImportPasswordChange={setImportPassword}
                  onFileChange={handleImportFileChange}
                  onImport={handleImport}
                />
                <SnapshotsPanel
                  labels={{
                    title: t('formpackSnapshotsHeading'),
                    snapshotsListLabel: t('formpackSnapshotsListLabel'),
                    snapshotUntitled: t('formpackSnapshotUntitled'),
                    snapshotRestore: t('formpackSnapshotRestore'),
                    snapshotsLoading: t('formpackSnapshotsLoading'),
                    snapshotsEmpty: t('formpackSnapshotsEmpty'),
                    snapshotsNoRecord: t('formpackSnapshotsNoRecord'),
                    snapshotCreate: t('formpackSnapshotCreate'),
                    snapshotsClearAll: t('formpackSnapshotsClearAll'),
                  }}
                  snapshots={snapshots}
                  activeRecordExists={Boolean(activeRecord)}
                  isSnapshotsLoading={isSnapshotsLoading}
                  storageUnavailable={storageBlocked}
                  formatCreatedAt={formatSnapshotCreatedAt}
                  onCreateSnapshot={handleCreateSnapshot}
                  onClearSnapshots={handleClearSnapshots}
                  onRestoreSnapshot={handleRestoreSnapshot}
                />
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
      {confirmationDialog}
    </section>
  );
}
