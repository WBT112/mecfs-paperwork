import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { ConfirmationRequest } from '../../components/useConfirmationDialog';
import type { SupportedLocale } from '../../i18n/locale';
import { validateJsonImport, type JsonImportPayload } from '../../import/json';
import type { FormpackId, FormpackManifest } from '../../formpacks';
import {
  importRecordWithSnapshots,
  type RecordEntry,
  type SnapshotEntry,
} from '../../storage';
import { formpackDetailHelpers } from './formpackDetailHelpers';
import type { RJSFSchema } from '@rjsf/utils';

/**
 * Dependencies required to manage JSON import state for the detail page.
 *
 * @remarks
 * RATIONALE: Import combines file IO, optional decryption, schema validation,
 * storage writes, locale switching, and UI feedback. Keeping that orchestration
 * outside the page reduces the size of the route component without hiding any
 * business rules.
 */
export interface UseImportFlowOptions {
  activeRecord: RecordEntry | null;
  applyRecordUpdate: (record: RecordEntry) => void;
  formpackId: FormpackId | null;
  initialImportMode?: 'new' | 'overwrite';
  importInputRef: RefObject<HTMLInputElement | null>;
  manifest: FormpackManifest | null;
  markAsSaved: (nextData: Record<string, unknown>) => void;
  persistActiveRecordId: (recordId: string) => void;
  refreshSnapshots: () => Promise<SnapshotEntry[]> | Promise<void>;
  requestConfirmation: (request: ConfirmationRequest) => Promise<boolean>;
  schema: RJSFSchema | null;
  setFormData: Dispatch<SetStateAction<Record<string, unknown>>>;
  setLocale: (nextLocale: SupportedLocale) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
  title: string;
}

/**
 * Public import state and handlers consumed by the detail page.
 */
export interface UseImportFlowResult {
  clearImportSuccess: () => void;
  handleImport: () => Promise<void>;
  handleImportFileChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  importError: string | null;
  importFileName: string | null;
  importIncludeRevisions: boolean;
  importJson: string;
  importMode: 'new' | 'overwrite';
  importPassword: string;
  importSuccess: string | null;
  isImportFileEncrypted: boolean;
  isImporting: boolean;
  setImportIncludeRevisions: Dispatch<SetStateAction<boolean>>;
  setImportMode: Dispatch<SetStateAction<'new' | 'overwrite'>>;
  setImportPassword: Dispatch<SetStateAction<string>>;
}

const resetFileInput = (inputRef: RefObject<HTMLInputElement | null>): void => {
  if (inputRef.current) {
    inputRef.current.value = '';
  }
};

/**
 * Encapsulates the JSON import workflow for a formpack detail page.
 *
 * @param options - Route state and storage helpers needed for import.
 * @returns Import state plus event handlers for file selection and import.
 */
export const useImportFlow = ({
  activeRecord,
  applyRecordUpdate,
  formpackId,
  initialImportMode = 'new',
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
}: UseImportFlowOptions): UseImportFlowResult => {
  const [importJson, setImportJson] = useState('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isImportFileEncrypted, setIsImportFileEncrypted] = useState(false);
  const [importMode, setImportMode] = useState<'new' | 'overwrite'>(
    initialImportMode,
  );
  const [importIncludeRevisions, setImportIncludeRevisions] = useState(true);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const confirmationDialogTitle = t('confirmationDialogTitle');
  const cancelLabel = t('common.cancel');

  const clearImportSuccess = useCallback(() => {
    if (importSuccess) {
      setImportSuccess(null);
    }
  }, [importSuccess]);

  useEffect(() => {
    if (!activeRecord && importMode === 'overwrite') {
      setImportMode('new');
    }
  }, [activeRecord, importMode]);

  const resetImportState = useCallback(() => {
    setImportJson('');
    setImportFileName(null);
    setImportPassword('');
    setIsImportFileEncrypted(false);
    resetFileInput(importInputRef);
  }, [importInputRef]);

  const applyImportedRecord = useCallback(
    (record: RecordEntry) => {
      applyRecordUpdate(record);
      markAsSaved(record.data);
      setFormData(record.data);
      persistActiveRecordId(record.id);
    },
    [applyRecordUpdate, markAsSaved, persistActiveRecordId, setFormData],
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
      resetImportState();
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
    resetImportState,
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
        resetImportState();
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
    [resetImportState, t],
  );

  return {
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
  };
};
