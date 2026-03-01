import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { RecordEntry, SnapshotEntry } from '../../../src/storage/types';
import {
  useRecords,
  useSnapshots,
  useAutosaveRecord,
} from '../../../src/storage/hooks';
import {
  createRecord as createRecordEntry,
  deleteRecord as deleteRecordEntry,
  getRecord as getRecordEntry,
  listRecords,
  updateRecord as updateRecordEntry,
} from '../../../src/storage/records';
import { StorageLockedError } from '../../../src/storage/atRestEncryption';
import { StorageUnavailableError } from '../../../src/storage/db';
import {
  createSnapshot as createSnapshotEntry,
  clearSnapshots as clearSnapshotsEntry,
  getSnapshot,
  listSnapshots,
} from '../../../src/storage/snapshots';

vi.mock('../../../src/storage/records', () => ({
  createRecord: vi.fn(),
  getRecord: vi.fn(),
  listRecords: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
}));

vi.mock('../../../src/storage/snapshots', () => ({
  createSnapshot: vi.fn(),
  getSnapshot: vi.fn(),
  listSnapshots: vi.fn(),
  clearSnapshots: vi.fn(),
}));

type RecordsHook = ReturnType<typeof useRecords>;
type SnapshotsHook = ReturnType<typeof useSnapshots>;

const FORM_PACK_ID = 'formpack-1';
const RECORD_ACTIVE_ID = 'record-active';
const RECORD_DELETE_ID = 'record-delete';
const SNAPSHOT_RECORD_ID = 'record-1';
const SNAPSHOT_ID = 'snapshot-1';

const createRecord = (overrides: Partial<RecordEntry> = {}): RecordEntry => ({
  id: 'record-1',
  formpackId: FORM_PACK_ID,
  title: 'Draft',
  locale: 'de',
  data: { field: 'value' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createSnapshot = (
  overrides: Partial<SnapshotEntry> = {},
): SnapshotEntry => ({
  id: SNAPSHOT_ID,
  recordId: SNAPSHOT_RECORD_ID,
  label: 'Snapshot',
  data: { field: 'snapshot' },
  createdAt: new Date().toISOString(),
  ...overrides,
});

const renderRecordsHook = (formpackId: string | null) => {
  let latest: RecordsHook | null = null;

  const TestComponent = () => {
    const value = useRecords(formpackId);
    useEffect(() => {
      latest = value;
    }, [value]);
    return null;
  };

  render(<TestComponent />);

  return {
    getLatest: () => latest,
  };
};

const renderSnapshotsHook = (recordId: string | null) => {
  let latest: SnapshotsHook | null = null;

  const TestComponent = () => {
    const value = useSnapshots(recordId);
    useEffect(() => {
      latest = value;
    }, [value]);
    return null;
  };

  render(<TestComponent />);

  return {
    getLatest: () => latest,
  };
};

describe('storage hooks', () => {
  beforeEach(() => {
    vi.mocked(listRecords).mockResolvedValue([]);
    vi.mocked(listSnapshots).mockResolvedValue([]);
    vi.mocked(deleteRecordEntry).mockReset();
    vi.mocked(clearSnapshotsEntry).mockReset();
    vi.mocked(createSnapshotEntry).mockReset();
    vi.mocked(createRecordEntry).mockReset();
    vi.mocked(getRecordEntry).mockReset();
    vi.mocked(updateRecordEntry).mockReset();
    vi.mocked(getSnapshot).mockReset();
  });

  it('creates a record and sets active/records', async () => {
    const newRecord = createRecord({ id: 'created-1' });
    vi.mocked(createRecordEntry).mockResolvedValue(newRecord);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let result: RecordEntry | null | undefined;
    await act(async () => {
      result = await getLatest()?.createRecord('de', { field: 'x' }, 't');
    });

    expect(result).toEqual(newRecord);
    expect(getLatest()?.activeRecord).toEqual(newRecord);
    expect(getLatest()?.records).toContainEqual(newRecord);
  });

  it('maps StorageUnavailableError to unavailable on createRecord', async () => {
    vi.mocked(createRecordEntry).mockRejectedValue(
      new StorageUnavailableError('no idb'),
    );

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let result: RecordEntry | null | undefined;
    await act(async () => {
      result = await getLatest()?.createRecord('de', {}, 't');
    });

    expect(result).toBeNull();
    expect(getLatest()?.errorCode).toBe('unavailable');
  });

  it('maps StorageLockedError to locked on createRecord', async () => {
    vi.mocked(createRecordEntry).mockRejectedValue(
      new StorageLockedError('missing_key', 'locked'),
    );

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let result: RecordEntry | null | undefined;
    await act(async () => {
      result = await getLatest()?.createRecord('de', {}, 't');
    });

    expect(result).toBeNull();
    expect(getLatest()?.errorCode).toBe('locked');
  });

  it('loads a record and sets it active; returns null when not found', async () => {
    const record = createRecord({ id: 'load-1' });
    vi.mocked(getRecordEntry).mockResolvedValue(record);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let loaded: RecordEntry | null | undefined;
    await act(async () => {
      loaded = await getLatest()?.loadRecord(record.id);
    });

    expect(loaded).toEqual(record);
    expect(getLatest()?.activeRecord).toEqual(record);

    vi.mocked(getRecordEntry).mockResolvedValue(null);
    await act(async () => {
      loaded = await getLatest()?.loadRecord('missing');
    });
    expect(loaded).toBeNull();
  });

  it('updates an active record and handles not-found', async () => {
    const original = createRecord({ id: 'u1' });
    const updated = { ...original, title: 'Updated' };
    vi.mocked(updateRecordEntry).mockResolvedValue(updated);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.applyRecordUpdate(original);
      getLatest()?.setActiveRecord(original);
    });

    let result: RecordEntry | null | undefined;
    await act(async () => {
      result = await getLatest()?.updateActiveRecord(original.id, {
        title: 'Updated',
      });
    });

    expect(result).toEqual(updated);
    expect(getLatest()?.activeRecord).toEqual(updated);

    vi.mocked(updateRecordEntry).mockResolvedValue(null);
    await act(async () => {
      result = await getLatest()?.updateActiveRecord('missing', { title: 'x' });
    });
    expect(result).toBeNull();

    vi.mocked(updateRecordEntry).mockRejectedValue(new Error('write failed'));
    await act(async () => {
      result = await getLatest()?.updateActiveRecord(original.id, {
        title: 'Will fail',
      });
    });
    expect(result).toBeNull();
    expect(getLatest()?.errorCode).toBe('operation');
  });

  it('refresh merges active record when list is empty', async () => {
    vi.mocked(listRecords).mockResolvedValue([]);
    const active = createRecord({ id: 'active-merge' });

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.applyRecordUpdate(active);
      getLatest()?.setActiveRecord(active);
    });

    await act(async () => {
      await getLatest()?.refresh();
    });

    expect(getLatest()?.records).toContainEqual(active);
  });

  it('sets operation error when records refresh fails', async () => {
    vi.mocked(listRecords).mockRejectedValue(new Error('list failed'));

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await waitFor(() => {
      expect(getLatest()?.isLoading).toBe(false);
    });

    expect(getLatest()?.errorCode).toBe('operation');
  });

  it('refresh resets local record state when no formpack id is available', async () => {
    const { getLatest } = renderRecordsHook(null);

    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      await getLatest()?.refresh();
    });

    expect(getLatest()?.records).toEqual([]);
    expect(getLatest()?.activeRecord).toBeNull();
    expect(getLatest()?.hasLoaded).toBe(false);
  });

  it('returns null from createRecord when formpack id is missing', async () => {
    const { getLatest } = renderRecordsHook(null);

    await waitFor(() => expect(getLatest()).not.toBeNull());

    let created: RecordEntry | null | undefined;
    await act(async () => {
      created = await getLatest()?.createRecord('de', { field: 'x' }, 'title');
    });

    expect(created).toBeNull();
    expect(createRecordEntry).not.toHaveBeenCalled();
  });

  it('sets operation error when loadRecord throws', async () => {
    vi.mocked(getRecordEntry).mockRejectedValue(new Error('read failed'));

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let loaded: RecordEntry | null | undefined;
    await act(async () => {
      loaded = await getLatest()?.loadRecord('broken-id');
    });

    expect(loaded).toBeNull();
    expect(getLatest()?.errorCode).toBe('operation');
  });

  it('clears active record during refresh when it belongs to another formpack', async () => {
    const record = createRecord({ id: 'present' });
    vi.mocked(listRecords).mockResolvedValue([record]);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.setActiveRecord(
        createRecord({ id: 'foreign', formpackId: 'other-formpack' }),
      );
    });

    await act(async () => {
      await getLatest()?.refresh();
    });

    expect(getLatest()?.activeRecord).toBeNull();
  });

  it('keeps active record when refresh result already contains it', async () => {
    const active = createRecord({ id: 'already-listed' });
    vi.mocked(listRecords).mockResolvedValue([active]);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.setActiveRecord(active);
    });

    await waitFor(() => {
      expect(getLatest()?.activeRecord?.id).toBe(active.id);
    });

    await act(async () => {
      await getLatest()?.refresh();
    });

    expect(getLatest()?.activeRecord?.id).toBe(active.id);
  });

  it('prevents deleting the active record', async () => {
    const record = createRecord({ id: RECORD_ACTIVE_ID });
    const { getLatest } = renderRecordsHook(FORM_PACK_ID);

    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.setActiveRecord(record);
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await getLatest()?.deleteRecord(record.id);
    });

    expect(result).toBe(false);
    expect(deleteRecordEntry).not.toHaveBeenCalled();
  });

  it('deletes a non-active record and updates local state', async () => {
    const recordActive = createRecord({ id: RECORD_ACTIVE_ID });
    const recordToDelete = createRecord({
      id: RECORD_DELETE_ID,
      updatedAt: new Date(Date.now() - 1000).toISOString(),
    });
    vi.mocked(deleteRecordEntry).mockResolvedValue(true);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.applyRecordUpdate(recordActive);
      getLatest()?.applyRecordUpdate(recordToDelete);
      getLatest()?.setActiveRecord(recordActive);
    });

    await act(async () => {
      await getLatest()?.deleteRecord(recordToDelete.id);
    });

    expect(deleteRecordEntry).toHaveBeenCalledWith(recordToDelete.id);
    expect(getLatest()?.records).toEqual([recordActive]);
  });

  it('returns false and sets an error when delete fails', async () => {
    const recordActive = createRecord({ id: RECORD_ACTIVE_ID });
    const recordToDelete = createRecord({ id: RECORD_DELETE_ID });
    vi.mocked(deleteRecordEntry).mockRejectedValue(new Error('boom'));

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.applyRecordUpdate(recordActive);
      getLatest()?.applyRecordUpdate(recordToDelete);
      getLatest()?.setActiveRecord(recordActive);
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await getLatest()?.deleteRecord(recordToDelete.id);
    });

    expect(result).toBe(false);
    expect(getLatest()?.errorCode).toBe('operation');
  });

  it('returns false without mutating state when deleteRecordEntry returns false', async () => {
    const recordActive = createRecord({ id: RECORD_ACTIVE_ID });
    const recordToDelete = createRecord({ id: RECORD_DELETE_ID });
    vi.mocked(deleteRecordEntry).mockResolvedValue(false);

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.applyRecordUpdate(recordActive);
      getLatest()?.applyRecordUpdate(recordToDelete);
      getLatest()?.setActiveRecord(recordActive);
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await getLatest()?.deleteRecord(recordToDelete.id);
    });

    expect(result).toBe(false);
    expect(getLatest()?.records).toEqual([recordActive, recordToDelete]);
  });

  it('keeps a concurrently switched active record during refresh', async () => {
    let resolveListRecords: ((records: RecordEntry[]) => void) | null = null;
    vi.mocked(listRecords).mockImplementation(
      () =>
        new Promise<RecordEntry[]>((resolve) => {
          resolveListRecords = resolve;
        }),
    );

    const { getLatest } = renderRecordsHook(FORM_PACK_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await act(async () => {
      getLatest()?.setActiveRecord(createRecord({ id: 'active-inflight-1' }));
    });

    let refreshPromise: Promise<void> | undefined;
    await act(async () => {
      refreshPromise = getLatest()?.refresh();
    });

    await act(async () => {
      getLatest()?.setActiveRecord(createRecord({ id: 'active-inflight-2' }));
    });

    expect(resolveListRecords).toBeTypeOf('function');
    resolveListRecords!([]);

    await act(async () => {
      await refreshPromise;
    });

    expect(getLatest()?.activeRecord?.id).toBe('active-inflight-2');
  });

  it('clears snapshots for a record and resets local state', async () => {
    const snapshot = createSnapshot({ recordId: SNAPSHOT_RECORD_ID });
    vi.mocked(listSnapshots).mockResolvedValue([snapshot]);
    vi.mocked(clearSnapshotsEntry).mockResolvedValue(1);

    const { getLatest } = renderSnapshotsHook(snapshot.recordId);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await waitFor(() => expect(getLatest()?.snapshots).toEqual([snapshot]));

    let result: number | undefined;
    await act(async () => {
      result = await getLatest()?.clearSnapshots();
    });

    expect(result).toBe(1);
    expect(clearSnapshotsEntry).toHaveBeenCalledWith(snapshot.recordId);
    expect(getLatest()?.snapshots).toEqual([]);
  });

  it('returns 0 when clearing snapshots without a record id', async () => {
    const { getLatest } = renderSnapshotsHook(null);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let result: number | undefined;
    await act(async () => {
      result = await getLatest()?.clearSnapshots();
    });

    expect(result).toBe(0);
    expect(clearSnapshotsEntry).not.toHaveBeenCalled();
  });

  it('loads a snapshot by id', async () => {
    const snapshot = createSnapshot({ id: 'snap-load' });
    vi.mocked(getSnapshot).mockResolvedValue(snapshot);

    const { getLatest } = renderSnapshotsHook(SNAPSHOT_RECORD_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let loaded: SnapshotEntry | null | undefined;
    await act(async () => {
      loaded = await getLatest()?.loadSnapshot('snap-load');
    });

    expect(loaded).toEqual(snapshot);
    expect(getSnapshot).toHaveBeenCalledWith('snap-load');
  });

  it('creates a snapshot and prepends it to local state', async () => {
    const existingSnapshot = createSnapshot({ id: 'snap-existing' });
    const createdSnapshot = createSnapshot({ id: 'snap-created' });
    vi.mocked(listSnapshots).mockResolvedValue([existingSnapshot]);
    vi.mocked(createSnapshotEntry).mockResolvedValue(createdSnapshot);

    const { getLatest } = renderSnapshotsHook(SNAPSHOT_RECORD_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());
    await waitFor(() =>
      expect(getLatest()?.snapshots).toEqual([existingSnapshot]),
    );

    let created: SnapshotEntry | null | undefined;
    await act(async () => {
      created = await getLatest()?.createSnapshot({ field: 'next' }, 'New');
    });

    expect(created).toEqual(createdSnapshot);
    expect(createSnapshotEntry).toHaveBeenCalledWith(
      SNAPSHOT_RECORD_ID,
      { field: 'next' },
      'New',
    );
    expect(getLatest()?.snapshots).toEqual([createdSnapshot, existingSnapshot]);
  });

  it('returns null when creating snapshots without a record id', async () => {
    const { getLatest } = renderSnapshotsHook(null);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let created: SnapshotEntry | null | undefined;
    await act(async () => {
      created = await getLatest()?.createSnapshot({ field: 'x' }, 'Ignored');
    });

    expect(created).toBeNull();
    expect(createSnapshotEntry).not.toHaveBeenCalled();
  });

  it('sets unavailable error when snapshot creation fails due missing storage', async () => {
    vi.mocked(createSnapshotEntry).mockRejectedValue(
      new StorageUnavailableError('no idb'),
    );

    const { getLatest } = renderSnapshotsHook(SNAPSHOT_RECORD_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let created: SnapshotEntry | null | undefined;
    await act(async () => {
      created = await getLatest()?.createSnapshot({ field: 'x' }, 'Fail');
    });

    expect(created).toBeNull();
    expect(getLatest()?.errorCode).toBe('unavailable');
  });

  it('sets error when loadSnapshot fails', async () => {
    vi.mocked(getSnapshot).mockRejectedValue(new Error('read error'));

    const { getLatest } = renderSnapshotsHook(SNAPSHOT_RECORD_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let loaded: SnapshotEntry | null | undefined;
    await act(async () => {
      loaded = await getLatest()?.loadSnapshot('snap-fail');
    });

    expect(loaded).toBeNull();
    expect(getLatest()?.errorCode).toBe('operation');
  });

  it('sets error when clearSnapshots fails', async () => {
    vi.mocked(clearSnapshotsEntry).mockRejectedValue(new Error('clear error'));

    const { getLatest } = renderSnapshotsHook(SNAPSHOT_RECORD_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    let result: number | undefined;
    await act(async () => {
      result = await getLatest()?.clearSnapshots();
    });

    expect(result).toBe(0);
    expect(getLatest()?.errorCode).toBe('operation');
  });

  it('sets error when snapshot refresh fails', async () => {
    vi.mocked(listSnapshots).mockRejectedValue(new Error('refresh failed'));

    const { getLatest } = renderSnapshotsHook(SNAPSHOT_RECORD_ID);
    await waitFor(() => expect(getLatest()).not.toBeNull());

    await waitFor(() => {
      expect(getLatest()?.isLoading).toBe(false);
    });

    expect(getLatest()?.errorCode).toBe('operation');
  });
});

describe('useAutosaveRecord', () => {
  const AUTOSAVE_DELAY = 50;
  const AUTOSAVE_RECORD_ID = 'autosave-record';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(updateRecordEntry).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderAutosaveHook = (initialProps: {
    recordId: string | null;
    formData: Record<string, unknown>;
    baselineData: Record<string, unknown> | null;
    onSaved?: (record: RecordEntry) => void;
    onError?: (code: string) => void;
  }) => {
    type HookResult = ReturnType<typeof useAutosaveRecord>;
    let latest: HookResult | null = null;

    const TestComponent = (props: typeof initialProps) => {
      const value = useAutosaveRecord(
        props.recordId,
        props.formData,
        'de',
        props.baselineData,
        {
          delay: AUTOSAVE_DELAY,
          onSaved: props.onSaved,
          onError: props.onError,
        },
      );
      useEffect(() => {
        latest = value;
      }, [value]);
      return null;
    };

    const { rerender, unmount } = render(<TestComponent {...initialProps} />);

    return {
      getLatest: () => latest,
      rerender: (props: typeof initialProps) =>
        rerender(<TestComponent {...props} />),
      unmount,
    };
  };

  const expectAutosaveErrorCode = async (
    rejectedValue: Error,
    expectedCode: string,
  ) => {
    vi.mocked(updateRecordEntry).mockRejectedValue(rejectedValue);
    const onError = vi.fn();

    const { rerender } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'initial' },
      baselineData: { field: 'initial' },
      onError,
    });

    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: { field: 'initial' },
      onError,
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onError).toHaveBeenCalledWith(expectedCode);
  };

  it('does not save when recordId is null', async () => {
    renderAutosaveHook({
      recordId: null,
      formData: { field: 'value' },
      baselineData: null,
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('does not save when formData equals baseline', async () => {
    const data = { field: 'value' };

    renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: data,
      baselineData: data,
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('updates autosave baseline when baselineData changes for the same record id', async () => {
    vi.mocked(updateRecordEntry).mockResolvedValue(
      createRecord({ id: AUTOSAVE_RECORD_ID }),
    );

    const { rerender } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'latest' },
      baselineData: { field: 'old' },
    });

    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'latest' },
      baselineData: { field: 'latest' },
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('saves after delay when formData changes from baseline', async () => {
    const savedRecord = createRecord({ id: AUTOSAVE_RECORD_ID });
    vi.mocked(updateRecordEntry).mockResolvedValue(savedRecord);
    const onSaved = vi.fn();

    const { rerender } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'initial' },
      baselineData: { field: 'initial' },
      onSaved,
    });

    // Change form data
    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: { field: 'initial' },
      onSaved,
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    // Wait for the async updateRecordEntry to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(updateRecordEntry).toHaveBeenCalledWith(AUTOSAVE_RECORD_ID, {
      data: { field: 'changed' },
      locale: 'de',
    });
    expect(onSaved).toHaveBeenCalledWith(savedRecord);
  });

  it('calls onError when save fails', async () => {
    await expectAutosaveErrorCode(new Error('db error'), 'operation');
  });

  it('returns markAsSaved that updates the baseline', async () => {
    vi.mocked(updateRecordEntry).mockResolvedValue(
      createRecord({ id: AUTOSAVE_RECORD_ID }),
    );

    // Use a stable reference for baselineData to avoid the second effect
    // resetting lastSavedRef on each render (mirrors real behavior where
    // activeRecord.data is a stable reference).
    const stableBaseline = { field: 'initial' };

    const { getLatest, rerender } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'initial' },
      baselineData: stableBaseline,
    });

    // Mark current data as saved manually
    act(() => {
      getLatest()?.markAsSaved({ field: 'changed' });
    });

    // Now re-render with { field: 'changed' } — should NOT trigger save
    // because markAsSaved already updated the baseline
    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: stableBaseline,
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('uses the default autosave delay when options are omitted', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    vi.mocked(updateRecordEntry).mockResolvedValue(
      createRecord({ id: AUTOSAVE_RECORD_ID }),
    );

    const TestComponent = ({
      formData,
    }: {
      formData: Record<string, unknown>;
    }) => {
      useAutosaveRecord(AUTOSAVE_RECORD_ID, formData, 'de', {
        field: 'initial',
      });
      return null;
    };

    const { rerender } = render(
      <TestComponent formData={{ field: 'initial' }} />,
    );
    rerender(<TestComponent formData={{ field: 'changed' }} />);

    await act(async () => {
      vi.advanceTimersByTime(1300);
    });

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(setTimeoutSpy.mock.calls.at(-1)?.[1]).toBe(1200);
  });

  it('initializes autosave baseline from null and still persists pending data', async () => {
    vi.mocked(updateRecordEntry).mockResolvedValue(
      createRecord({ id: AUTOSAVE_RECORD_ID }),
    );

    renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: null,
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    expect(updateRecordEntry).toHaveBeenCalledWith(AUTOSAVE_RECORD_ID, {
      data: { field: 'changed' },
      locale: 'de',
    });
  });

  it('cleans up timeout on unmount', async () => {
    vi.mocked(updateRecordEntry).mockResolvedValue(
      createRecord({ id: AUTOSAVE_RECORD_ID }),
    );

    const { rerender, unmount } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'initial' },
      baselineData: { field: 'initial' },
    });

    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: { field: 'initial' },
    });

    // Unmount before the timer fires
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DELAY + 100);
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('calls onError with unavailable for StorageUnavailableError', async () => {
    await expectAutosaveErrorCode(
      new StorageUnavailableError('no idb'),
      'unavailable',
    );
  });

  it('calls onError with locked for StorageLockedError', async () => {
    await expectAutosaveErrorCode(
      new StorageLockedError('missing_key', 'locked'),
      'locked',
    );
  });

  it('flushes pending autosave immediately on beforeunload', async () => {
    const savedRecord = createRecord({ id: AUTOSAVE_RECORD_ID });
    vi.mocked(updateRecordEntry).mockResolvedValue(savedRecord);

    const { rerender } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'initial' },
      baselineData: { field: 'initial' },
    });

    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: { field: 'initial' },
    });

    await act(async () => {
      globalThis.dispatchEvent(new Event('beforeunload'));
      await Promise.resolve();
    });

    expect(updateRecordEntry).toHaveBeenCalledWith(AUTOSAVE_RECORD_ID, {
      data: { field: 'changed' },
      locale: 'de',
    });
  });

  it('does not flush on beforeunload when data is already saved', async () => {
    renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'saved' },
      baselineData: { field: 'saved' },
    });

    await act(async () => {
      globalThis.dispatchEvent(new Event('beforeunload'));
      await Promise.resolve();
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('returns early on beforeunload when no record id is present', async () => {
    renderAutosaveHook({
      recordId: null,
      formData: { field: 'changed' },
      baselineData: null,
    });

    await act(async () => {
      globalThis.dispatchEvent(new Event('beforeunload'));
      await Promise.resolve();
    });

    expect(updateRecordEntry).not.toHaveBeenCalled();
  });

  it('does not call onError when beforeunload flush fails', async () => {
    vi.mocked(updateRecordEntry).mockRejectedValue(new Error('flush failed'));
    const onError = vi.fn();

    const { rerender } = renderAutosaveHook({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'initial' },
      baselineData: { field: 'initial' },
      onError,
    });

    rerender({
      recordId: AUTOSAVE_RECORD_ID,
      formData: { field: 'changed' },
      baselineData: { field: 'initial' },
      onError,
    });

    await act(async () => {
      globalThis.dispatchEvent(new Event('beforeunload'));
      await Promise.resolve();
    });

    expect(onError).not.toHaveBeenCalled();
  });
});
