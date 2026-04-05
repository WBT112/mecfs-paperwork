import {
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Ajv2020 from 'ajv/dist/2020';
import { translateUiSchema } from '../i18n/rjsf';
import { useLocale } from '../i18n/useLocale';
import type { PdfExportControlsProps } from '../export/pdf/PdfExportControls';
import { applyArrayUiSchemaDefaults } from '../lib/rjsfUiSchema';
import {
  formpackTemplates,
  type FormpackFormContext,
} from '../lib/rjsfTemplates';
import { FormpackFieldTemplate } from '../lib/rjsfFormpackFieldTemplate';
import { resolveDisplayValue } from '../lib/displayValueResolver';
import { hasPreviewValue } from '../lib/previewValue';
import { isRecord } from '../lib/utils';
import { buildRandomDummyPatch, mergeDummyPatch } from '../lib/devDummyFill';
import {
  createAsyncGuard,
  ignoreAsyncError,
  runIfActive,
} from '../lib/asyncGuard';
import { resetAppShell } from '../lib/diagnostics/resetAppShell';
import { focusWithRetry } from '../lib/focusWithRetry';
import { normalizeParagraphText } from '../lib/text/paragraphs';
import { getPathValue, setPathValueImmutable } from '../lib/pathAccess';
import { mergePacingFormData } from '../formpacks/pacing-ampelkarten/formData';
import { buildPacingAmpelkartenPreset } from '../formpacks/pacing-ampelkarten/presets';
import {
  FORMPACKS_UPDATED_EVENT,
  DOCTOR_LETTER_FORMPACK_ID,
  deriveFormpackRevisionSignature,
  clearHiddenFields,
  isDevUiEnabled,
  isFormpackVisible,
  resolveDecisionTree,
  type DecisionData,
  type FormpackId,
  type InfoBoxConfig,
} from '../formpacks';
import { hasLetterLayout } from '../formpacks/layout';
import { normalizeDecisionAnswers } from '../formpacks/doctor-letter/decisionAnswers';
import {
  type FormpackMetaEntry,
  type StorageErrorCode,
  getFormpackMeta,
  upsertFormpackMeta,
  useAutosaveRecord,
  useRecords,
  useSnapshots,
} from '../storage';
import { resetAllLocalData, useStorageHealth } from '../lib/diagnostics';
import { useConfirmationDialog } from '../components/useConfirmationDialog';
import {
  DevMetadataPanel,
  DocumentPreviewPanel,
  FormContentSection,
  FormpackDetailHeader,
  FormpackDocumentPreviewContent,
  FormpackExportActions,
  FormpackFormPanel,
  FormpackToolsSection,
  PacingAmpelkartenEditor,
  QuotaBanner,
} from './formpack-detail/components';
import { doctorLetterHelpers } from './formpack-detail/helpers/doctorLetterHelpers';
import { previewHelpers } from './formpack-detail/helpers/previewHelpers';
import { useExportFlow } from './formpack-detail/hooks/useExportFlow';
import { useFormpackLoader } from './formpack-detail/hooks/useFormpackLoader';
import { useImportFlow } from './formpack-detail/hooks/useImportFlow';
import { useOfflabelWorkflow } from './formpack-detail/hooks/useOfflabelWorkflow';
import { useProfileSync } from './formpack-detail/hooks/useProfileSync';
import { useRecordManager } from './formpack-detail/hooks/useRecordManager';
import { useSnapshotManager } from './formpack-detail/hooks/useSnapshotManager';
import { APP_UPDATE_AVAILABLE_EVENT } from '../pwa/register';
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

const FORM_PRIMARY_FOCUS_SELECTOR =
  '.formpack-form input:not([type="hidden"]):not([disabled]), .formpack-form select:not([disabled]), .formpack-form textarea:not([disabled]), .formpack-form button:not([disabled]), .formpack-form [tabindex]:not([tabindex="-1"])';
const FORM_FALLBACK_FOCUS_SELECTOR = '.formpack-form__actions .app__button';
const FOCUS_RETRY_DELAY_MS = 50;
const FOCUS_RETRY_ATTEMPTS = 30;
const PACING_AMPELKARTEN_FORMPACK_ID = 'pacing-ampelkarten';

const showDevMedicationOptions = isFormpackVisible({ visibility: 'dev' });

const resolvePacingPresetVariant = (value: unknown): 'adult' | 'child' =>
  value === 'child' ? 'child' : 'adult';

const isPacingPresetContentEmpty = (value: FormDataState): boolean => {
  const { meta: _meta, ...content } = value;
  return !hasPreviewValue(content);
};

const useDeferredFormFocusStates = (
  getRoot: RefObject<HTMLDivElement | null>,
  states: readonly {
    enabled: boolean;
    onResolved: () => void;
    selector: string | null;
  }[],
) => {
  useEffect(() => {
    const activeState = states.find(
      (state) => state.enabled && typeof state.selector === 'string',
    );
    if (!activeState?.selector) {
      return;
    }

    return focusWithRetry({
      getRoot: () => getRoot.current,
      selector: activeState.selector,
      fallbackSelector: FORM_FALLBACK_FOCUS_SELECTOR,
      maxAttempts: FOCUS_RETRY_ATTEMPTS,
      retryDelayMs: FOCUS_RETRY_DELAY_MS,
      onResolved: activeState.onResolved,
    });
  }, [getRoot, states]);
};

const renderLoadingState = (title: string, loadingLabel: string) => (
  <section className="app__card">
    <h2>{title}</h2>
    <p>{loadingLabel}</p>
  </section>
);

const renderErrorState = ({
  backToListLabel,
  errorMessage,
  isRecoverable,
  isResettingAppShell,
  onResetAppShell,
  onRetry,
  recoveryHint,
  resetLabel,
  resetPendingLabel,
  retryLabel,
  title,
}: {
  backToListLabel: string;
  errorMessage: string | null;
  isRecoverable: boolean;
  isResettingAppShell: boolean;
  onResetAppShell: () => void;
  onRetry: () => void;
  recoveryHint: string;
  resetLabel: string;
  resetPendingLabel: string;
  retryLabel: string;
  title: string;
}) => (
  <section className="app__card">
    <h2>{title}</h2>
    <p className="app__error">{errorMessage}</p>
    {isRecoverable ? (
      <>
        <p>{recoveryHint}</p>
        <div className="formpack-form__actions">
          <button type="button" className="app__button" onClick={onRetry}>
            {retryLabel}
          </button>
          <button
            type="button"
            className="app__button"
            onClick={onResetAppShell}
            disabled={isResettingAppShell}
          >
            {isResettingAppShell ? resetPendingLabel : resetLabel}
          </button>
        </div>
      </>
    ) : null}
    <Link className="app__link" to="/formpacks">
      {backToListLabel}
    </Link>
  </section>
);

const renderFormContent = ({
  commonFormPanelProps,
  documentPreview,
  emptyPreviewLabel,
  exportActions,
  hasDocumentContent,
  isPacingAmpelkarten,
  t,
  tFormpack,
}: {
  commonFormPanelProps: Omit<
    ComponentProps<typeof FormpackFormPanel>,
    'actions'
  >;
  documentPreview: ReactNode;
  emptyPreviewLabel: string;
  exportActions: ReactNode;
  hasDocumentContent: boolean;
  isPacingAmpelkarten: boolean;
  t: (key: string) => string;
  tFormpack: (key: string) => string;
}) =>
  isPacingAmpelkarten ? (
    <PacingAmpelkartenEditor
      documentPreview={documentPreview}
      emptyPreviewLabel={emptyPreviewLabel}
      exportActions={exportActions}
      hasDocumentContent={hasDocumentContent}
      t={t}
      tFormpack={tFormpack}
      {...commonFormPanelProps}
    />
  ) : (
    <FormpackFormPanel {...commonFormPanelProps} actions={exportActions} />
  );

/**
 * Shows formpack metadata with translations loaded for the active locale.
 */
export default function FormpackDetailPage() {
  const { t, i18n } = useTranslation();
  const { confirmationDialog, requestConfirmation } = useConfirmationDialog();
  const { locale, setLocale } = useLocale();
  const { id } = useParams();
  const [formData, setFormData] = useState<FormDataState>({});
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
  const [isResettingAppShell, setIsResettingAppShell] = useState(false);
  const [pendingIntroFocus, setPendingIntroFocus] = useState(false);
  const [pendingFormFocus, setPendingFormFocus] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const formContentRef = useRef<HTMLDivElement | null>(null);
  const handleLoadedFormpackChange = useCallback(() => {
    setFormData({});
    setIsIntroModalOpen(false);
  }, []);
  const handleCloseIntroModal = useCallback(() => {
    setIsIntroModalOpen(false);
  }, []);
  const handleOpenIntroModal = useCallback(() => {
    setIsIntroModalOpen(true);
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
    if (!manifest) {
      setFormpackMeta(null);
      return;
    }

    const guard = createAsyncGuard();

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

        if (guard.isActive()) {
          setFormpackMeta(nextMeta);
        }
      } catch {
        if (guard.isActive()) {
          setFormpackMeta(null);
        }
      }
    };

    ensureFormpackMeta().catch(ignoreAsyncError);

    return guard.deactivate;
  }, [manifest]);

  useEffect(() => {
    if (!manifest?.id) {
      return;
    }

    const guard = createAsyncGuard();
    const currentFormpackId = manifest.id;

    const refreshMeta = async () => {
      const next = await getFormpackMeta(currentFormpackId);
      runIfActive(guard, () => setFormpackMeta(next));
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
      guard.deactivate();
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
  const {
    clearPendingOfflabelFocusTarget,
    formSchema,
    handleOfflabelFormChange,
    offlabelOutputLocale,
    offlabelPreviewDocuments,
    offlabelUiSchema,
    pendingOfflabelFocusSelector,
    selectedOfflabelPreviewId,
    setSelectedOfflabelPreviewId,
  } = useOfflabelWorkflow({
    formData,
    formpackId,
    locale,
    normalizedUiSchema,
    schema,
    setFormData,
    showDevMedicationOptions,
  });
  const decisionData = formData.decision;

  // Apply conditional visibility for doctor-letter decision tree
  const conditionalUiSchema = useMemo(() => {
    if (!normalizedUiSchema) {
      return normalizedUiSchema;
    }

    if (offlabelUiSchema !== normalizedUiSchema) {
      return offlabelUiSchema;
    }

    if (formpackId !== DOCTOR_LETTER_FORMPACK_ID) {
      return normalizedUiSchema;
    }
    return doctorLetterHelpers.buildDoctorLetterConditionalUiSchema(
      normalizedUiSchema,
      decisionData,
    );
  }, [decisionData, formpackId, normalizedUiSchema, offlabelUiSchema]);

  const handleApplyDummyData = useCallback(() => {
    const patch = buildRandomDummyPatch(formSchema, conditionalUiSchema);
    const merged = mergeDummyPatch(formData, patch);
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
  const {
    handleCreateRecord,
    handleDeleteRecord,
    handleLoadRecord,
    handleResetForm,
    persistActiveRecordId,
  } = useRecordManager({
    activeRecord,
    createRecord,
    deleteRecord,
    formData,
    formpackId,
    hasLoadedRecords,
    hasManifest: Boolean(manifest),
    isRecordsLoading,
    loadRecord,
    locale,
    markAsSaved,
    records,
    requestConfirmation,
    setActiveRecord,
    setFormData,
    setPendingFormFocus,
    storageBlocked,
    t,
    title,
    updateActiveRecord,
  });
  const {
    clearImportSuccess,
    handleImport,
    handleImportFileChange,
    importError,
    importFileName,
    importIncludeRevisions,
    importJson,
    importMode,
    importPassword,
    importSuccess,
    isImportFileEncrypted,
    isImporting,
    setImportIncludeRevisions,
    setImportMode,
    setImportPassword,
  } = useImportFlow({
    activeRecord,
    applyRecordUpdate,
    formpackId,
    importInputRef,
    manifest,
    markAsSaved,
    persistActiveRecordId,
    refreshSnapshots,
    requestConfirmation,
    schema,
    setFormData,
    setLocale,
    t,
    title,
  });
  const {
    docxError,
    docxSuccess,
    docxTemplateId,
    docxTemplateOptions,
    encryptJsonExport,
    handleActionClickCapture,
    handleExportDocx,
    handleExportJson,
    handlePdfExportError,
    handlePdfExportSuccess,
    isDocxExporting,
    jsonExportError,
    jsonExportPassword,
    jsonExportPasswordConfirm,
    pdfError,
    pdfSuccess,
    setDocxTemplateId,
    setEncryptJsonExport,
    setJsonExportPassword,
    setJsonExportPasswordConfirm,
  } = useExportFlow({
    activeRecord,
    formData,
    formSchema,
    formpackId,
    locale,
    manifest,
    offlabelOutputLocale,
    onAnyActionTriggered: clearImportSuccess,
    previewUiSchema:
      conditionalUiSchema ?? normalizedUiSchema ?? translatedUiSchema,
    schema,
    snapshots,
    t,
  });
  const formpackVersionDisplay =
    formpackMeta?.versionOrHash ??
    manifest?.version ??
    t('formpackVersionUpdatedUnknown');
  const formpackUpdatedAtDisplay = formpackMeta
    ? formatTimestamp(formpackMeta.updatedAt)
    : t('formpackVersionUpdatedUnknown');

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
      let nextData: FormDataState =
        formpackId === PACING_AMPELKARTEN_FORMPACK_ID
          ? mergePacingFormData(formData, incomingData, locale)
          : { ...incomingData };

      nextData = handleOfflabelFormChange(nextData);

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
    [formData, formpackId, handleOfflabelFormChange, locale, setFormData],
  );

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
  const { handleClearSnapshots, handleCreateSnapshot, handleRestoreSnapshot } =
    useSnapshotManager({
      activeRecord,
      buildSnapshotLabel,
      clearSnapshots,
      createSnapshot,
      formData,
      loadSnapshot,
      markAsSaved,
      requestConfirmation,
      setFormData,
      setPendingFormFocus,
      t,
      updateActiveRecord,
    });
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
  const formLoadingLabel = t('formpackLoading');
  const formEmptyMessage = t('formpackFormNoActiveRecord');

  const handleAcceptIntroGate = useCallback(() => {
    setPendingIntroFocus(true);
    setFormData((current) => {
      if (formpackId === PACING_AMPELKARTEN_FORMPACK_ID) {
        const sourceData =
          isPacingPresetContentEmpty(current) && isRecord(activeRecord?.data)
            ? (activeRecord.data as FormDataState)
            : current;
        const presetLocale = locale === 'en' ? 'en' : 'de';
        const variant = resolvePacingPresetVariant(
          getPathValue(sourceData, 'meta.variant'),
        );
        const nextFormData: FormDataState = isPacingPresetContentEmpty(
          sourceData,
        )
          ? (buildPacingAmpelkartenPreset(
              presetLocale,
              variant,
            ) as unknown as FormDataState)
          : sourceData;
        return setPathValueImmutable(
          nextFormData,
          introGateConfig!.acceptedFieldPath,
          true,
        );
      }

      return setPathValueImmutable(
        current,
        introGateConfig!.acceptedFieldPath,
        true,
      );
    });
  }, [activeRecord, formpackId, introGateConfig, locale]);

  const deferredFocusStates = useMemo(
    () => [
      {
        enabled: pendingIntroFocus && !isIntroGateVisible,
        onResolved: () => setPendingIntroFocus(false),
        selector: FORM_PRIMARY_FOCUS_SELECTOR,
      },
      {
        enabled: pendingFormFocus && !isIntroGateVisible,
        onResolved: () => setPendingFormFocus(false),
        selector: FORM_PRIMARY_FOCUS_SELECTOR,
      },
      {
        enabled:
          pendingOfflabelFocusSelector !== null &&
          pendingOfflabelFocusSelector !== '' &&
          !isIntroGateVisible,
        onResolved: clearPendingOfflabelFocusTarget,
        selector: pendingOfflabelFocusSelector,
      },
    ],
    [
      clearPendingOfflabelFocusTarget,
      isIntroGateVisible,
      pendingFormFocus,
      pendingIntroFocus,
      pendingOfflabelFocusSelector,
    ],
  );

  useDeferredFormFocusStates(formContentRef, deferredFocusStates);

  // Always use the custom field template so hidden conditional sections are
  // removed from the DOM even for formpacks without InfoBoxes.
  const templates = useMemo(
    () => ({
      ...formpackTemplates,
      FieldTemplate: FormpackFieldTemplate,
    }),
    [],
  );
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
    const keys = previewHelpers.getOrderedKeys(
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
        const childUi = previewHelpers.getUiSchemaNode(previewUiSchema, key);
        const label = previewHelpers.getLabel(key, childSchema, childUi);

        if (Array.isArray(entry)) {
          return previewHelpers.renderPreviewArray(
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
          return previewHelpers.renderPreviewObject(
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

  useEffect(() => {
    const guard = createAsyncGuard();

    const loadValidator = async () => {
      const module = await import('@rjsf/validator-ajv8');
      // Ajv2020 includes the draft 2020-12 meta schema used by formpacks.
      const loadedValidator = module.customizeValidator({
        AjvClass: Ajv2020,
      });
      if (guard.isActive()) {
        setValidator(loadedValidator);
      }
    };

    loadValidator().catch(ignoreAsyncError);

    return guard.deactivate;
  }, []);

  const hasDocumentContent = useMemo(
    () => hasPreviewValue(formData),
    [formData],
  );
  const isRecoverableFormpackLoadError =
    errorMessage === t('formpackLoadError') ||
    errorMessage === t('formpackSchemaUnavailable') ||
    errorMessage === t('formpackUiSchemaUnavailable');
  const handleRetryFormpackLoad = useCallback(() => {
    setAssetRefreshVersion((currentVersion) => currentVersion + 1);
  }, []);
  const handleResetAppShell = useCallback(() => {
    setIsResettingAppShell(true);
    resetAppShell().catch(ignoreAsyncError);
  }, []);

  if (isLoading) {
    return renderLoadingState(t('formpackDetailTitle'), t('formpackLoading'));
  }

  if (errorMessage || !manifest) {
    return renderErrorState({
      backToListLabel: t('formpackBackToList'),
      errorMessage,
      isRecoverable: isRecoverableFormpackLoadError,
      isResettingAppShell,
      onResetAppShell: handleResetAppShell,
      onRetry: handleRetryFormpackLoad,
      recoveryHint: t('formpackLoadRecoveryHint'),
      resetLabel: t('formpackResetAppShell'),
      resetPendingLabel: t('formpackResetAppShellInProgress'),
      retryLabel: t('formpackRetryLoad'),
      title: t('formpackDetailTitle'),
    });
  }

  // RATIONALE: Hide dev-only UI in production to reduce exposed metadata and UI surface.
  const showDevSections = isDevUiEnabled;
  const formatRecordUpdatedAt = (timestamp: string) =>
    t('formpackRecordUpdatedAt', { timestamp: formatTimestamp(timestamp) });

  const formatSnapshotCreatedAt = (timestamp: string) =>
    t('formpackSnapshotCreatedAt', { timestamp: formatTimestamp(timestamp) });
  const getJsonPreviewContent = () =>
    Object.keys(formData).length ? jsonPreview : t('formpackFormPreviewEmpty');
  const exportActions = (
    <FormpackExportActions
      PdfExportControlsComponent={LazyPdfExportControls}
      docxError={docxError}
      docxSuccess={docxSuccess}
      docxTemplateId={docxTemplateId}
      docxTemplateOptions={docxTemplateOptions}
      encryptJsonExport={encryptJsonExport}
      formData={formData}
      formpackId={formpackId}
      handleExportDocx={handleExportDocx}
      handleExportJson={handleExportJson}
      handlePdfExportError={handlePdfExportError}
      handlePdfExportSuccess={handlePdfExportSuccess}
      isDocxExporting={isDocxExporting}
      jsonExportError={jsonExportError}
      jsonExportPassword={jsonExportPassword}
      jsonExportPasswordConfirm={jsonExportPasswordConfirm}
      manifest={manifest}
      offlabelOutputLocale={offlabelOutputLocale}
      pdfError={pdfError}
      pdfSuccess={pdfSuccess}
      secondaryActions={
        <button type="button" className="app__button" onClick={handleResetForm}>
          {t('formpackFormReset')}
        </button>
      }
      setDocxTemplateId={setDocxTemplateId}
      setEncryptJsonExport={setEncryptJsonExport}
      setJsonExportPassword={setJsonExportPassword}
      setJsonExportPasswordConfirm={setJsonExportPasswordConfirm}
      storageBlocked={storageBlocked}
      t={t}
    />
  );

  const currentQuotaStatus =
    storageHealth.status === 'ok' ? null : storageHealth.status;
  const isPacingAmpelkarten = formpackId === PACING_AMPELKARTEN_FORMPACK_ID;
  const formClassNames = ['formpack-form', `formpack-form--${manifest.id}`];
  if (formpackId === 'offlabel-antrag') {
    // NOTE: Keep the alias while offlabel-specific layout selectors still use it.
    formClassNames.push('formpack-form--offlabel');
  }

  if (hasLetterLayout(formpackId)) {
    formClassNames.push('formpack-form--doctor-letter');
  }

  const formClassName = formClassNames.join(' ');
  const commonFormPanelProps = {
    FormComponent: LazyForm,
    activeRecordExists: Boolean(activeRecord),
    closeLabel: t('common.close'),
    emptyMessage: formEmptyMessage,
    formClassName,
    formContentRef,
    formContext,
    formData,
    formSchema,
    introGateEnabled: Boolean(introGateConfig?.enabled),
    introTexts,
    isIntroGateVisible,
    isIntroModalOpen,
    loadingLabel: formLoadingLabel,
    onApplyDummyData: handleApplyDummyData,
    onApplyProfile: handleApplyProfile,
    onCloseIntroModal: handleCloseIntroModal,
    onConfirmIntroGate: handleAcceptIntroGate,
    onFormChange: handleFormChange,
    onFormSubmit: handleFormSubmit,
    onOpenIntroModal: handleOpenIntroModal,
    onProfileSaveToggle: handleProfileSaveToggle,
    profileApplyDummyLabel: t('profileApplyDummyButton'),
    profileApplyLabel: t('profileApplyButton'),
    profileHasSavedData,
    profileSaveEnabled,
    profileStatus,
    profileStatusSuccessText: t('profileApplySuccess'),
    profileToggleLabel: t('profileSaveCheckbox'),
    showDevSections,
    templates,
    uiSchema: conditionalUiSchema,
    validator,
  };

  return (
    <section
      className={[
        'app__card',
        isPacingAmpelkarten ? 'app__card--pacing-ampelkarten' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
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
        <div className="formpack-detail__form">
          <FormContentSection title={t('formpackFormHeading')}>
            {renderFormContent({
              commonFormPanelProps,
              documentPreview,
              emptyPreviewLabel: t('formpackDocumentPreviewEmpty'),
              exportActions,
              hasDocumentContent,
              isPacingAmpelkarten,
              t,
              tFormpack,
            })}
          </FormContentSection>
          {isPacingAmpelkarten ? null : (
            <DocumentPreviewPanel
              title={t('formpackDocumentPreviewHeading')}
              isIntroGateVisible={isIntroGateVisible}
            >
              <FormpackDocumentPreviewContent
                documentPreview={documentPreview}
                emptyLabel={t('formpackDocumentPreviewEmpty')}
                formpackId={formpackId}
                hasDocumentContent={hasDocumentContent}
                offlabelPreviewDocuments={offlabelPreviewDocuments}
                onSelectOfflabelPreview={setSelectedOfflabelPreviewId}
                selectedOfflabelPreviewId={selectedOfflabelPreviewId}
              />
            </DocumentPreviewPanel>
          )}
          <FormpackToolsSection
            heading={t('formpackToolsHeading')}
            recordsPanelProps={{
              labels: {
                title: t('formpackRecordsHeading'),
                recordNew: t('formpackRecordNew'),
                recordsListLabel: t('formpackRecordsListLabel'),
                recordUntitled: t('formpackRecordUntitled'),
                recordLoad: t('formpackRecordLoad'),
                recordDelete: t('formpackRecordDelete'),
                recordActive: t('formpackRecordActive'),
                recordsLoading: t('formpackRecordsLoading'),
                recordsEmpty: t('formpackRecordsEmpty'),
              },
              records,
              activeRecordId: activeRecord?.id ?? null,
              isRecordsLoading,
              storageUnavailable: storageBlocked,
              storageErrorMessage,
              storageRecoveryActionLabel:
                storageError === 'locked' ? t('resetAllButton') : undefined,
              formatUpdatedAt: formatRecordUpdatedAt,
              onStorageRecoveryAction:
                storageError === 'locked'
                  ? () => {
                      handleResetAllStorageData().catch(ignoreAsyncError);
                    }
                  : undefined,
              onCreateRecord: () => {
                handleCreateRecord().catch(ignoreAsyncError);
              },
              onLoadRecord: (recordId) => {
                handleLoadRecord(recordId).catch(ignoreAsyncError);
              },
              onDeleteRecord: (record) => {
                handleDeleteRecord(record).catch(ignoreAsyncError);
              },
            }}
            importPanelProps={{
              labels: {
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
              },
              importInputRef,
              importFileName,
              importPassword,
              isImportFileEncrypted,
              importMode,
              importIncludeRevisions,
              importError,
              importSuccess,
              importJson,
              isImporting,
              activeRecordExists: Boolean(activeRecord),
              storageUnavailable: storageBlocked,
              onImportModeChange: setImportMode,
              onIncludeRevisionsChange: setImportIncludeRevisions,
              onImportPasswordChange: setImportPassword,
              onFileChange: (event) => {
                handleImportFileChange(event).catch(ignoreAsyncError);
              },
              onImport: () => {
                handleImport().catch(ignoreAsyncError);
              },
            }}
            snapshotsPanelProps={{
              labels: {
                title: t('formpackSnapshotsHeading'),
                snapshotsListLabel: t('formpackSnapshotsListLabel'),
                snapshotUntitled: t('formpackSnapshotUntitled'),
                snapshotRestore: t('formpackSnapshotRestore'),
                snapshotsLoading: t('formpackSnapshotsLoading'),
                snapshotsEmpty: t('formpackSnapshotsEmpty'),
                snapshotsNoRecord: t('formpackSnapshotsNoRecord'),
                snapshotCreate: t('formpackSnapshotCreate'),
                snapshotsClearAll: t('formpackSnapshotsClearAll'),
              },
              snapshots,
              activeRecordExists: Boolean(activeRecord),
              isSnapshotsLoading,
              storageUnavailable: storageBlocked,
              formatCreatedAt: formatSnapshotCreatedAt,
              onCreateSnapshot: () => {
                handleCreateSnapshot().catch(ignoreAsyncError);
              },
              onClearSnapshots: () => {
                handleClearSnapshots().catch(ignoreAsyncError);
              },
              onRestoreSnapshot: (snapshotId) => {
                handleRestoreSnapshot(snapshotId).catch(ignoreAsyncError);
              },
            }}
          />
          {showDevSections && (
            <div className="formpack-detail__section">
              <h3>{t('formpackFormPreviewHeading')}</h3>
              <pre className="formpack-preview">{getJsonPreviewContent()}</pre>
            </div>
          )}
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
              docxMapping: t('formpackDocxMapping'),
            }}
          />
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
