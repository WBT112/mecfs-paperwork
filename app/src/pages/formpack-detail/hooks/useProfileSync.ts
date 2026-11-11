import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import type { ConfirmationRequest } from '../../../components/useConfirmationDialog';
import {
  applyProfileData,
  extractProfileData,
} from '../../../lib/profile/profileMapping';
import type { FormpackId } from '../../../formpacks';
import {
  deleteProfile,
  getProfile,
  hasUsableProfileData,
  upsertProfile,
  type RecordEntry,
} from '../../../storage';
import {
  readLocalStorage,
  writeLocalStorage,
} from '../../../lib/safeLocalStorage';

const DEFAULT_PROFILE_ID = 'default';
const PROFILE_SAVE_KEY = 'mecfs-paperwork.profile.saveEnabled';

const readProfileSavePreference = (): boolean => {
  const stored = readLocalStorage(PROFILE_SAVE_KEY);
  return stored === null ? true : stored === 'true';
};

const persistProfileSavePreference = (enabled: boolean): void => {
  writeLocalStorage(PROFILE_SAVE_KEY, enabled ? 'true' : 'false');
};

const ignorePromiseError = (): undefined => undefined;

/**
 * Parameters for synchronizing reusable profile data with the current formpack.
 *
 * @remarks
 * SECURITY: The hook only reads and writes the local encrypted profile store.
 * It must not trigger any network request because the app is offline-first.
 */
export interface UseProfileSyncOptions {
  formpackId: FormpackId | null;
  formData: Record<string, unknown>;
  markAsSaved: (nextData: Record<string, unknown>) => void;
  requestConfirmation: (request: ConfirmationRequest) => Promise<boolean>;
  setFormData: (nextData: Record<string, unknown>) => void;
  t: (key: string) => string;
}

/**
 * Public profile-sync state and handlers used by the formpack detail screen.
 */
export interface UseProfileSyncResult {
  profileSaveEnabled: boolean;
  profileHasSavedData: boolean;
  profileStatus: string | null;
  clearProfileStatus: () => void;
  handleProfileRecordSaved: (record: RecordEntry) => void;
  handleProfileSaveToggle: (
    event: ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  handleApplyProfile: () => Promise<void>;
}

/**
 * Manages loading, saving, and applying reusable profile data for formpacks.
 *
 * @remarks
 * RATIONALE: `FormpackDetailPage` mixes many unrelated workflows. This hook
 * isolates profile-specific state transitions so the page can become a
 * composition shell over time.
 *
 * @param options - Dependencies required to keep profile state in sync with the active form.
 * @returns Profile-sync state plus event handlers for the detail page.
 */
export const useProfileSync = ({
  formpackId,
  formData,
  markAsSaved,
  requestConfirmation,
  setFormData,
  t,
}: UseProfileSyncOptions): UseProfileSyncResult => {
  const [profileSaveEnabled, setProfileSaveEnabled] = useState(() =>
    readProfileSavePreference(),
  );
  const [profileHasSavedData, setProfileHasSavedData] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const clearProfileStatus = useCallback(() => {
    setProfileStatus(null);
  }, []);

  const refreshProfileState = useCallback(async () => {
    try {
      const entry = await getProfile(DEFAULT_PROFILE_ID);
      setProfileHasSavedData(
        entry !== null && hasUsableProfileData(entry.data),
      );
    } catch {
      setProfileHasSavedData(false);
    }
  }, []);

  useEffect(() => {
    refreshProfileState().catch(ignorePromiseError);
  }, [refreshProfileState]);

  const handleProfileRecordSaved = useCallback(
    (record: RecordEntry) => {
      if (!profileSaveEnabled || !formpackId) {
        return;
      }

      const partial = extractProfileData(formpackId, record.data);
      upsertProfile(DEFAULT_PROFILE_ID, partial).then((entry) => {
        setProfileHasSavedData(hasUsableProfileData(entry.data));
      }, ignorePromiseError);
    },
    [formpackId, profileSaveEnabled],
  );

  const handleProfileSaveToggle = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const enabled = event.target.checked;
      setProfileSaveEnabled(enabled);
      persistProfileSavePreference(enabled);

      if (!enabled && profileHasSavedData) {
        try {
          const shouldDeleteExisting = await requestConfirmation({
            title: t('confirmationDialogTitle'),
            message: t('profileDeleteConfirmPrompt'),
            confirmLabel: t('common.delete'),
            cancelLabel: t('common.cancel'),
            tone: 'danger',
          });
          if (!shouldDeleteExisting) {
            return;
          }

          await deleteProfile(DEFAULT_PROFILE_ID);
          setProfileHasSavedData(false);
        } catch {
          // A failed confirmation or deletion must retain the saved-profile state.
        }
      }
    },
    [profileHasSavedData, requestConfirmation, t],
  );

  const handleApplyProfile = useCallback(async () => {
    setProfileStatus(null);

    if (!formpackId) {
      setProfileStatus(t('profileApplyError'));
      return;
    }

    try {
      const entry = await getProfile(DEFAULT_PROFILE_ID);
      if (!entry || !hasUsableProfileData(entry.data)) {
        setProfileStatus(t('profileApplyNoData'));
        return;
      }

      const next = applyProfileData(formpackId, formData, entry.data);
      setFormData(next);
      markAsSaved(next);
      setProfileStatus(t('profileApplySuccess'));
    } catch {
      setProfileStatus(t('profileApplyError'));
    }
  }, [formData, formpackId, markAsSaved, setFormData, t]);

  return {
    profileSaveEnabled,
    profileHasSavedData,
    profileStatus,
    clearProfileStatus,
    handleProfileRecordSaved,
    handleProfileSaveToggle,
    handleApplyProfile,
  };
};
