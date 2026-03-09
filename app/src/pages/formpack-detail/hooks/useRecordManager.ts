import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ConfirmationRequest } from '../../../components/useConfirmationDialog';
import type { RecordEntry } from '../../../storage';
import type { SupportedLocale } from '../../../i18n/locale';
import { createAsyncGuard } from '../../../lib/asyncGuard';
import {
  readLocalStorage,
  writeLocalStorage,
} from '../../../lib/safeLocalStorage';

const LAST_ACTIVE_FORMPACK_KEY = 'mecfs-paperwork.lastActiveFormpackId';
const ignorePromiseResult = (): undefined => undefined;

/**
 * Dependencies required to manage active-record orchestration for the detail page.
 */
export interface UseRecordManagerOptions {
  activeRecord: RecordEntry | null;
  createRecord: (
    locale: SupportedLocale,
    data: Record<string, unknown>,
    title?: string,
  ) => Promise<RecordEntry | null>;
  deleteRecord: (recordId: string) => Promise<boolean>;
  formData: Record<string, unknown>;
  formpackId: string | null;
  hasLoadedRecords: boolean;
  hasManifest: boolean;
  isRecordsLoading: boolean;
  loadRecord: (recordId: string) => Promise<RecordEntry | null>;
  locale: SupportedLocale;
  markAsSaved: (nextData: Record<string, unknown>) => void;
  records: RecordEntry[];
  requestConfirmation: (request: ConfirmationRequest) => Promise<boolean>;
  setActiveRecord: (record: RecordEntry | null) => void;
  setFormData: (nextData: Record<string, unknown>) => void;
  setPendingFormFocus: (pending: boolean) => void;
  storageBlocked: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  title: string;
  updateActiveRecord: (
    recordId: string,
    updates: { data?: Record<string, unknown>; locale?: SupportedLocale },
  ) => Promise<RecordEntry | null>;
}

/**
 * Active-record handlers and persistence helpers exposed to the detail page.
 */
export interface UseRecordManagerResult {
  handleCreateRecord: () => Promise<void>;
  handleDeleteRecord: (record: RecordEntry) => Promise<void>;
  handleLoadRecord: (recordId: string) => Promise<void>;
  handleResetForm: () => Promise<void>;
  persistActiveRecordId: (recordId: string) => void;
}

/**
 * Encapsulates active-record restore and CRUD flows for the detail page.
 *
 * @remarks
 * RATIONALE: Record creation, restore, and draft switching are storage concerns
 * that do not belong in the page render tree. Keeping them here makes the page
 * a composition shell over stable hooks.
 *
 * @param options - Storage helpers and translated UI strings for record actions.
 * @returns Stable handlers for record reset/create/load/delete plus persistence.
 */
export const useRecordManager = ({
  activeRecord,
  createRecord,
  deleteRecord,
  formData,
  formpackId,
  hasLoadedRecords,
  hasManifest,
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
}: UseRecordManagerOptions): UseRecordManagerResult => {
  const hasRestoredRecordRef = useRef<string | null>(null);
  const confirmationDialogTitle = t('confirmationDialogTitle');
  const cancelLabel = t('common.cancel');
  const activeRecordStorageKey = useMemo(
    () => (formpackId ? `mecfs-paperwork.activeRecordId.${formpackId}` : null),
    [formpackId],
  );

  const readActiveRecordId = useCallback(() => {
    return readLocalStorage(activeRecordStorageKey!);
  }, [activeRecordStorageKey]);

  const persistActiveRecordId = useCallback(
    (recordId: string) => {
      if (!activeRecordStorageKey || !formpackId) {
        return;
      }

      writeLocalStorage(activeRecordStorageKey, recordId);
      writeLocalStorage(LAST_ACTIVE_FORMPACK_KEY, formpackId);
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
      return record?.formpackId === currentFormpackId ? record : null;
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

        if (!hasManifest || storageBlocked) {
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
      hasManifest,
      locale,
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

    if (!hasLoadedRecords || isRecordsLoading) {
      return;
    }

    if (hasRestoredRecordRef.current === formpackId) {
      return;
    }

    const guard = createAsyncGuard();
    const currentFormpackId = formpackId;
    hasRestoredRecordRef.current = formpackId;

    restoreActiveRecord(currentFormpackId, guard.isActive).then(
      ignorePromiseResult,
      ignorePromiseResult,
    );

    return guard.deactivate;
  }, [formpackId, hasLoadedRecords, isRecordsLoading, restoreActiveRecord]);

  const handleResetForm = useCallback(async () => {
    if (!activeRecord) {
      return;
    }

    const clearedData: Record<string, unknown> = {};
    setFormData(clearedData);

    const updated = await updateActiveRecord(activeRecord.id, {
      data: clearedData,
      locale,
    });
    if (updated) {
      markAsSaved(updated.data);
    }
    setPendingFormFocus(true);
  }, [
    activeRecord,
    locale,
    markAsSaved,
    setFormData,
    setPendingFormFocus,
    updateActiveRecord,
  ]);

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
    setFormData,
    setPendingFormFocus,
    t,
    title,
    updateActiveRecord,
  ]);

  const handleLoadRecord = useCallback(
    async (recordId: string) => {
      const record = await loadRecord(recordId);
      if (!record) {
        return;
      }

      markAsSaved(record.data);
      setFormData(record.data);
      persistActiveRecordId(record.id);
      setPendingFormFocus(true);
    },
    [
      loadRecord,
      markAsSaved,
      persistActiveRecordId,
      setFormData,
      setPendingFormFocus,
    ],
  );

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

  return {
    handleCreateRecord,
    handleDeleteRecord,
    handleLoadRecord,
    handleResetForm,
    persistActiveRecordId,
  };
};
