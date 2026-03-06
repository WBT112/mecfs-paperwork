import { useCallback } from 'react';
import type { ConfirmationRequest } from '../../components/useConfirmationDialog';
import type { RecordEntry, SnapshotEntry } from '../../storage';

/**
 * Dependencies required to manage snapshot actions for the active record.
 */
export interface UseSnapshotManagerOptions {
  activeRecord: RecordEntry | null;
  buildSnapshotLabel: () => string;
  clearSnapshots: () => Promise<number>;
  createSnapshot: (
    data: Record<string, unknown>,
    label?: string,
  ) => Promise<SnapshotEntry | null>;
  formData: Record<string, unknown>;
  loadSnapshot: (snapshotId: string) => Promise<SnapshotEntry | null>;
  markAsSaved: (nextData: Record<string, unknown>) => void;
  requestConfirmation: (request: ConfirmationRequest) => Promise<boolean>;
  setFormData: (nextData: Record<string, unknown>) => void;
  setPendingFormFocus: (pending: boolean) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  updateActiveRecord: (
    recordId: string,
    updates: { data?: Record<string, unknown> },
  ) => Promise<RecordEntry | null>;
}

/**
 * Snapshot action handlers exposed to the detail page.
 */
export interface UseSnapshotManagerResult {
  handleClearSnapshots: () => Promise<void>;
  handleCreateSnapshot: () => Promise<void>;
  handleRestoreSnapshot: (snapshotId: string) => Promise<void>;
}

/**
 * Encapsulates snapshot creation, restore, and bulk-delete flows.
 *
 * @param options - Storage helpers and UI callbacks required for snapshot actions.
 * @returns Snapshot event handlers for the detail page.
 */
export const useSnapshotManager = ({
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
}: UseSnapshotManagerOptions): UseSnapshotManagerResult => {
  const confirmationDialogTitle = t('confirmationDialogTitle');
  const cancelLabel = t('common.cancel');

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
      setPendingFormFocus(true);
    },
    [
      activeRecord,
      loadSnapshot,
      markAsSaved,
      setFormData,
      setPendingFormFocus,
      updateActiveRecord,
    ],
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

  return {
    handleClearSnapshots,
    handleCreateSnapshot,
    handleRestoreSnapshot,
  };
};
