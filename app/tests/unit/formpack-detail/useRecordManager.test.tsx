import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecordManager } from '../../../src/pages/formpack-detail/hooks/useRecordManager';
import type { RecordEntry } from '../../../src/storage';

const DELETE_RECORD_ID = 'record-delete';

const RECORD: RecordEntry = {
  id: 'record-1',
  formpackId: 'doctor-letter',
  locale: 'de',
  title: 'Draft',
  createdAt: '2026-03-06T09:00:00.000Z',
  updatedAt: '2026-03-06T10:00:00.000Z',
  data: { field: 'value' },
};

const createHook = (
  overrides?: Partial<Parameters<typeof useRecordManager>[0]>,
) => {
  const createRecord = vi.fn().mockResolvedValue(null);
  const deleteRecord = vi.fn().mockResolvedValue(true);
  const loadRecord = vi.fn().mockResolvedValue(null);
  const markAsSaved = vi.fn();
  const requestConfirmation = vi.fn().mockResolvedValue(true);
  const setActiveRecord = vi.fn();
  const setFormData = vi.fn();
  const setPendingFormFocus = vi.fn();
  const updateActiveRecord = vi.fn().mockResolvedValue(RECORD);

  const options = {
    activeRecord: RECORD,
    createRecord,
    deleteRecord,
    formData: RECORD.data,
    formpackId: RECORD.formpackId,
    hasLoadedRecords: true,
    hasManifest: true,
    isRecordsLoading: false,
    loadRecord,
    locale: 'de' as const,
    markAsSaved,
    records: [RECORD],
    requestConfirmation,
    setActiveRecord,
    setFormData,
    setPendingFormFocus,
    storageBlocked: false,
    t: (key: string, options?: Record<string, unknown>) =>
      options?.title ? `${key}:${String(options.title)}` : key,
    title: 'Draft',
    updateActiveRecord,
    ...overrides,
  };

  const hook = renderHook(() => useRecordManager(options));
  return {
    ...hook,
    options,
    createRecord,
    deleteRecord,
    loadRecord,
    markAsSaved,
    requestConfirmation,
    setActiveRecord,
    setFormData,
    setPendingFormFocus,
    updateActiveRecord,
  };
};

describe('useRecordManager', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('restores the previously active record for the current formpack', async () => {
    globalThis.localStorage.setItem(
      'mecfs-paperwork.activeRecordId.doctor-letter',
      RECORD.id,
    );
    const loadRecord = vi.fn().mockResolvedValue(RECORD);
    const setActiveRecord = vi.fn();

    createHook({ loadRecord, records: [], setActiveRecord });

    await waitFor(() => {
      expect(loadRecord).toHaveBeenCalledWith(RECORD.id);
    });
    expect(setActiveRecord).toHaveBeenCalledWith(RECORD);
    expect(
      globalThis.localStorage.getItem('mecfs-paperwork.lastActiveFormpackId'),
    ).toBe(RECORD.formpackId);
  });

  it('falls back to the newest available record when no persisted draft can be restored', async () => {
    const fallback = { ...RECORD, id: 'record-2' };
    const loadRecord = vi.fn().mockResolvedValue(null);
    const setActiveRecord = vi.fn();

    createHook({
      activeRecord: null,
      loadRecord,
      records: [fallback],
      setActiveRecord,
    });

    await waitFor(() => {
      expect(setActiveRecord).toHaveBeenCalledWith(fallback);
    });
    expect(
      globalThis.localStorage.getItem(
        'mecfs-paperwork.activeRecordId.doctor-letter',
      ),
    ).toBe(fallback.id);
  });

  it('creates an initial record when no draft exists and storage is available', async () => {
    const created = { ...RECORD, id: 'record-3' };
    const createRecord = vi.fn().mockResolvedValue(created);
    const setActiveRecord = vi.fn();

    createHook({
      activeRecord: null,
      createRecord,
      loadRecord: vi.fn().mockResolvedValue(null),
      records: [],
      setActiveRecord,
    });

    await waitFor(() => {
      expect(createRecord).toHaveBeenCalledWith('de', RECORD.data, 'Draft');
    });
    expect(setActiveRecord).toHaveBeenCalledWith(created);
  });

  it('exposes reset, create, load, and delete handlers for draft management', async () => {
    const created = { ...RECORD, id: 'record-4', data: { field: 'new' } };
    const loaded = { ...RECORD, id: 'record-5', data: { field: 'loaded' } };
    const updateActiveRecord = vi
      .fn()
      .mockResolvedValueOnce(RECORD)
      .mockResolvedValueOnce({ ...RECORD, data: {} });
    const createRecord = vi.fn().mockResolvedValue(created);
    const loadRecord = vi.fn().mockResolvedValue(loaded);
    const deleteRecord = vi.fn().mockResolvedValue(true);
    const markAsSaved = vi.fn();
    const requestConfirmation = vi.fn().mockResolvedValue(true);
    const setFormData = vi.fn();
    const setPendingFormFocus = vi.fn();

    const { result } = createHook({
      createRecord,
      deleteRecord,
      loadRecord,
      markAsSaved,
      requestConfirmation,
      setFormData,
      setPendingFormFocus,
      updateActiveRecord,
    });

    await act(async () => {
      await result.current.handleCreateRecord();
    });
    expect(updateActiveRecord).toHaveBeenCalledWith(RECORD.id, {
      data: RECORD.data,
      locale: 'de',
    });
    expect(createRecord).toHaveBeenCalledWith('de', RECORD.data, 'Draft');
    expect(markAsSaved).toHaveBeenCalledWith(created.data);
    expect(setFormData).toHaveBeenCalledWith(created.data);
    expect(setPendingFormFocus).toHaveBeenCalledWith(true);

    await act(async () => {
      await result.current.handleLoadRecord(loaded.id);
    });
    expect(loadRecord).toHaveBeenCalledWith(loaded.id);
    expect(markAsSaved).toHaveBeenCalledWith(loaded.data);

    await act(async () => {
      await result.current.handleResetForm();
    });
    expect(setFormData).toHaveBeenCalledWith({});
    expect(updateActiveRecord).toHaveBeenLastCalledWith(RECORD.id, {
      data: {},
      locale: 'de',
    });

    await act(async () => {
      await result.current.handleDeleteRecord({
        ...RECORD,
        id: DELETE_RECORD_ID,
      });
    });
    expect(requestConfirmation).toHaveBeenCalled();
    expect(deleteRecord).toHaveBeenCalledWith(DELETE_RECORD_ID);
  });

  it('keeps destructive handlers best-effort when storage is unavailable or confirmation is denied', async () => {
    const setActiveRecord = vi.fn();
    createHook({
      activeRecord: null,
      createRecord: vi.fn(),
      hasManifest: false,
      loadRecord: vi.fn().mockResolvedValue(null),
      records: [],
      setActiveRecord,
      storageBlocked: true,
    });

    await waitFor(() => {
      expect(setActiveRecord).toHaveBeenCalledWith(null);
    });

    const deleteRecord = vi.fn();
    const requestConfirmation = vi.fn().mockResolvedValue(false);
    const { result } = createHook({
      deleteRecord,
      requestConfirmation,
    });

    await act(async () => {
      await result.current.handleDeleteRecord({
        ...RECORD,
        id: DELETE_RECORD_ID,
      });
    });
    expect(requestConfirmation).toHaveBeenCalledTimes(1);
    expect(deleteRecord).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleDeleteRecord(RECORD);
    });
    expect(requestConfirmation).toHaveBeenCalledTimes(1);
  });

  it('returns early when record operations cannot produce a draft', async () => {
    const createRecord = vi.fn().mockResolvedValue(null);
    const loadRecord = vi.fn().mockResolvedValue(null);
    const markAsSaved = vi.fn();
    const setFormData = vi.fn();
    const setPendingFormFocus = vi.fn();
    const updateActiveRecord = vi.fn().mockResolvedValue(null);

    const { result } = createHook({
      createRecord,
      loadRecord,
      markAsSaved,
      setFormData,
      setPendingFormFocus,
      updateActiveRecord,
    });

    await act(async () => {
      await result.current.handleCreateRecord();
    });
    expect(createRecord).not.toHaveBeenCalled();
    expect(markAsSaved).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.handleLoadRecord('missing-record');
    });
    expect(loadRecord).toHaveBeenCalledWith('missing-record');
    expect(setFormData).not.toHaveBeenCalled();
    expect(setPendingFormFocus).not.toHaveBeenCalled();

    const createWithoutActiveRecord = vi.fn().mockResolvedValue(null);
    const { result: noActiveResult } = createHook({
      activeRecord: null,
      createRecord: createWithoutActiveRecord,
      loadRecord,
      markAsSaved,
      records: [],
      setFormData,
      setPendingFormFocus,
      updateActiveRecord,
    });

    await act(async () => {
      await noActiveResult.current.handleCreateRecord();
    });
    expect(createWithoutActiveRecord).toHaveBeenCalledWith(
      'de',
      RECORD.data,
      'Draft',
    );
    expect(markAsSaved).not.toHaveBeenCalled();
  });

  it('no-ops persistence and reset when there is no active formpack or active record', async () => {
    const setFormData = vi.fn();
    const updateActiveRecord = vi.fn();
    const setPendingFormFocus = vi.fn();

    const { result } = createHook({
      activeRecord: null,
      formpackId: null,
      hasLoadedRecords: false,
      setFormData,
      setPendingFormFocus,
      updateActiveRecord,
    });

    act(() => {
      result.current.persistActiveRecordId('ignored-record');
    });
    expect(
      globalThis.localStorage.getItem('mecfs-paperwork.lastActiveFormpackId'),
    ).toBeNull();

    await act(async () => {
      await result.current.handleResetForm();
    });
    expect(setFormData).not.toHaveBeenCalled();
    expect(updateActiveRecord).not.toHaveBeenCalled();
    expect(setPendingFormFocus).not.toHaveBeenCalled();
  });
});
