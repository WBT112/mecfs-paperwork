import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RecordEntry, SnapshotEntry } from '../../../src/storage/types';
import { useRecords, useSnapshots } from '../../../src/storage/hooks';
import {
  createRecord as createRecordEntry,
  deleteRecord as deleteRecordEntry,
  getRecord as getRecordEntry,
  listRecords,
  updateRecord as updateRecordEntry,
} from '../../../src/storage/records';
import { StorageUnavailableError } from '../../../src/storage/db';
import {
  clearSnapshots as clearSnapshotsEntry,
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

const renderRecordsHook = (formpackId: string) => {
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
    vi.mocked(createRecordEntry).mockReset();
    vi.mocked(getRecordEntry).mockReset();
    vi.mocked(updateRecordEntry).mockReset();
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
});
