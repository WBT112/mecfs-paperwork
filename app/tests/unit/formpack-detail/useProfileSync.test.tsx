import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChangeEvent } from 'react';
import type { ProfileEntry, RecordEntry } from '../../../src/storage';

const mocked = vi.hoisted(() => ({
  applyProfileData: vi.fn(),
  deleteProfile: vi.fn(),
  extractProfileData: vi.fn(),
  getProfile: vi.fn(),
  hasUsableProfileData: vi.fn(),
  upsertProfile: vi.fn(),
}));

vi.mock('../../../src/lib/profile/profileMapping', () => ({
  applyProfileData: mocked.applyProfileData,
  extractProfileData: mocked.extractProfileData,
}));

vi.mock('../../../src/storage', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../src/storage')>();
  return {
    ...original,
    deleteProfile: mocked.deleteProfile,
    getProfile: mocked.getProfile,
    hasUsableProfileData: mocked.hasUsableProfileData,
    upsertProfile: mocked.upsertProfile,
  };
});

import { useProfileSync } from '../../../src/pages/formpack-detail/useProfileSync';

const DEFAULT_FORMPACK_ID = 'doctor-letter' as const;
const DEFAULT_PROFILE_ID = 'default';
const DEFAULT_LOCALE = 'de' as const;
const DEFAULT_TIMESTAMP = '2026-03-01T00:00:00.000Z';
const DEFAULT_PROFILE_DATA = { patient: { firstName: 'Ada' } };
const mockRequestConfirmation =
  vi.fn<
    (request: {
      title: string;
      message: unknown;
      confirmLabel: string;
      cancelLabel: string;
      tone?: 'default' | 'danger';
    }) => Promise<boolean>
  >();

const createProfileEntry = (
  data: ProfileEntry['data'] = DEFAULT_PROFILE_DATA,
): ProfileEntry => ({
  id: DEFAULT_PROFILE_ID,
  data,
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
});

const createRecord = (
  data: Record<string, unknown> = DEFAULT_PROFILE_DATA,
): RecordEntry => ({
  id: 'record-1',
  formpackId: DEFAULT_FORMPACK_ID,
  title: 'Draft',
  locale: DEFAULT_LOCALE,
  data,
  createdAt: DEFAULT_TIMESTAMP,
  updatedAt: DEFAULT_TIMESTAMP,
});

const getToggleEvent = (checked: boolean) =>
  ({
    target: { checked },
  }) as ChangeEvent<HTMLInputElement>;

const renderUseProfileSync = (formpackId: typeof DEFAULT_FORMPACK_ID | null) =>
  renderHook(() =>
    useProfileSync({
      formpackId,
      formData: {},
      markAsSaved: vi.fn(),
      requestConfirmation: mockRequestConfirmation,
      setFormData: vi.fn(),
      t: (key) => key,
    }),
  );

describe('useProfileSync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocked.applyProfileData.mockReset();
    mocked.deleteProfile.mockReset();
    mocked.extractProfileData.mockReset();
    mocked.getProfile.mockReset();
    mocked.hasUsableProfileData.mockReset();
    mocked.upsertProfile.mockReset();
    mocked.hasUsableProfileData.mockImplementation(
      (data: ProfileEntry['data']) => Boolean(data.patient?.firstName),
    );
    mocked.getProfile.mockResolvedValue(null);
    mocked.upsertProfile.mockResolvedValue(createProfileEntry());
    mockRequestConfirmation.mockReset();
    mockRequestConfirmation.mockResolvedValue(false);
  });

  it('loads saved profile state on mount and defaults autosave to enabled', async () => {
    mocked.getProfile.mockResolvedValue(createProfileEntry());

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(true);
    });

    expect(result.current.profileSaveEnabled).toBe(true);
    expect(mocked.getProfile).toHaveBeenCalledWith('default');
  });

  it('falls back to enabled and empty profile state when storage access fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    mocked.getProfile.mockRejectedValue(new Error('profile unavailable'));

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(false);
    });

    expect(result.current.profileSaveEnabled).toBe(true);
  });

  it('mirrors autosaved records into the reusable profile when enabled', async () => {
    const partial = { patient: { firstName: 'Ada' } };
    mocked.extractProfileData.mockReturnValue(partial);

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    act(() => {
      result.current.handleProfileRecordSaved(createRecord());
    });

    await waitFor(() => {
      expect(mocked.upsertProfile).toHaveBeenCalledWith('default', partial);
    });

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(true);
    });
  });

  it('skips profile mirroring when autosave sync is disabled', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('false');

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    act(() => {
      result.current.handleProfileRecordSaved(createRecord());
    });

    expect(mocked.upsertProfile).not.toHaveBeenCalled();
  });

  it('persists toggle changes and deletes saved profile data after confirmation', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    mocked.getProfile.mockResolvedValue(createProfileEntry());
    mocked.deleteProfile.mockResolvedValue(undefined);
    mockRequestConfirmation.mockResolvedValue(true);

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(true);
    });

    act(() => {
      result.current.handleProfileSaveToggle(getToggleEvent(false));
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      'mecfs-paperwork.profile.saveEnabled',
      'false',
    );
    expect(mockRequestConfirmation).toHaveBeenCalledWith({
      title: 'confirmationDialogTitle',
      message: 'profileDeleteConfirmPrompt',
      confirmLabel: 'common.delete',
      cancelLabel: 'common.cancel',
      tone: 'danger',
    });

    await waitFor(() => {
      expect(mocked.deleteProfile).toHaveBeenCalledWith('default');
    });

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(false);
    });
    expect(result.current.profileSaveEnabled).toBe(false);
  });

  it('persists enabled toggle state to localStorage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('false');

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(false);
    });

    act(() => {
      result.current.handleProfileSaveToggle(getToggleEvent(true));
    });

    expect(setItemSpy).toHaveBeenCalledWith(
      'mecfs-paperwork.profile.saveEnabled',
      'true',
    );
    expect(result.current.profileSaveEnabled).toBe(true);
  });

  it('keeps existing profile data when deletion is not confirmed', async () => {
    mocked.getProfile.mockResolvedValue(createProfileEntry());

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    await waitFor(() => {
      expect(result.current.profileHasSavedData).toBe(true);
    });

    act(() => {
      result.current.handleProfileSaveToggle(getToggleEvent(false));
    });

    await waitFor(() => {
      expect(mockRequestConfirmation).toHaveBeenCalledOnce();
    });
    expect(mocked.deleteProfile).not.toHaveBeenCalled();
    expect(result.current.profileHasSavedData).toBe(true);
  });

  it('ignores storage write failures when toggling profile sync', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    const { result } = renderUseProfileSync(DEFAULT_FORMPACK_ID);

    act(() => {
      result.current.handleProfileSaveToggle(getToggleEvent(false));
    });

    expect(result.current.profileSaveEnabled).toBe(false);
  });

  it('applies saved profile data to the current form and updates autosave baseline', async () => {
    const setFormData = vi.fn();
    const markAsSaved = vi.fn();
    const appliedData = {
      patient: { firstName: 'Ada' },
      doctor: { name: 'Dr' },
    };
    mocked.getProfile.mockResolvedValue(createProfileEntry());
    mocked.applyProfileData.mockReturnValue(appliedData);

    const { result } = renderHook(() =>
      useProfileSync({
        formpackId: DEFAULT_FORMPACK_ID,
        formData: { patient: { firstName: 'Old' } },
        markAsSaved,
        requestConfirmation: mockRequestConfirmation,
        setFormData,
        t: (key) => key,
      }),
    );

    await act(async () => {
      await result.current.handleApplyProfile();
    });

    expect(mocked.applyProfileData).toHaveBeenCalledWith(
      DEFAULT_FORMPACK_ID,
      { patient: { firstName: 'Old' } },
      createProfileEntry().data,
    );
    expect(setFormData).toHaveBeenCalledWith(appliedData);
    expect(markAsSaved).toHaveBeenCalledWith(appliedData);
    expect(result.current.profileStatus).toBe('profileApplySuccess');
  });

  it('reports missing profile data, clears stale status, and handles apply errors', async () => {
    const initialProps: { formpackId: typeof DEFAULT_FORMPACK_ID | null } = {
      formpackId: DEFAULT_FORMPACK_ID,
    };

    const { result, rerender } = renderHook(
      ({ formpackId }: { formpackId: typeof DEFAULT_FORMPACK_ID | null }) =>
        useProfileSync({
          formpackId,
          formData: {},
          markAsSaved: vi.fn(),
          requestConfirmation: mockRequestConfirmation,
          setFormData: vi.fn(),
          t: (key) => key,
        }),
      {
        initialProps,
      },
    );

    await act(async () => {
      await result.current.handleApplyProfile();
    });
    expect(result.current.profileStatus).toBe('profileApplyNoData');

    mocked.getProfile.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.handleApplyProfile();
    });
    expect(result.current.profileStatus).toBe('profileApplyError');

    act(() => {
      result.current.clearProfileStatus();
    });
    expect(result.current.profileStatus).toBeNull();

    rerender({ formpackId: null });
    await act(async () => {
      await result.current.handleApplyProfile();
    });
    expect(result.current.profileStatus).toBe('profileApplyError');
  });
});
