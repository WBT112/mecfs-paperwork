import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  clearSnapshots,
  createSnapshot,
  getSnapshot,
  listSnapshots,
} from '../../../src/storage/snapshots';
import { openStorage } from '../../../src/storage/db';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

describe('snapshots storage', () => {
  type MockSnapshotIndex = {
    getAllKeys: Mock;
  };
  type MockSnapshotStore = {
    index: Mock;
    delete: Mock;
  };
  type MockTransaction = {
    objectStore: Mock;
    done: Promise<void>;
  };
  type MockDb = {
    add?: Mock;
    get?: Mock;
    getAllFromIndex?: Mock;
    transaction?: Mock;
  };

  let db: MockDb;
  let snapshotStore: MockSnapshotStore;
  let snapshotIndex: MockSnapshotIndex;
  let transaction: MockTransaction;
  let resolveDone: (() => void) | undefined;

  beforeEach(() => {
    snapshotIndex = {
      getAllKeys: vi.fn(),
    };
    snapshotStore = {
      index: vi.fn(() => snapshotIndex),
      delete: vi.fn(),
    };
    transaction = {
      objectStore: vi.fn(() => snapshotStore),
      done: new Promise<void>((resolve) => {
        resolveDone = resolve;
      }),
    };
    db = {
      add: vi.fn(),
      get: vi.fn(),
      getAllFromIndex: vi.fn(),
      transaction: vi.fn(() => transaction),
    };
    vi.mocked(openStorage).mockResolvedValue(db as any);
  });

  it('creates a snapshot with generated metadata', async () => {
    const now = new Date('2025-01-02T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'snapshot-123') });

    const snapshot = await createSnapshot(
      'record-1',
      { field: 'value' },
      'Auto',
    );

    expect(snapshot).toEqual({
      id: 'snapshot-123',
      recordId: 'record-1',
      label: 'Auto',
      data: { field: 'value' },
      createdAt: now.toISOString(),
    });
    expect(db.add).toHaveBeenCalledWith('snapshots', snapshot);

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('lists snapshots sorted by newest first', async () => {
    const snapshots = [
      {
        id: 'one',
        recordId: 'record-1',
        data: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'two',
        recordId: 'record-1',
        data: {},
        createdAt: '2024-01-03T00:00:00.000Z',
      },
      {
        id: 'three',
        recordId: 'record-1',
        data: {},
        createdAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    db.getAllFromIndex?.mockResolvedValue(snapshots);

    const result = await listSnapshots('record-1');

    expect(db.getAllFromIndex).toHaveBeenCalledWith(
      'snapshots',
      'by_recordId',
      'record-1',
    );
    expect(result.map((entry) => entry.id)).toEqual(['two', 'three', 'one']);
  });

  it('returns null when a snapshot is missing', async () => {
    db.get?.mockResolvedValue(undefined);

    const result = await getSnapshot('missing');

    expect(db.get).toHaveBeenCalledWith('snapshots', 'missing');
    expect(result).toBeNull();
  });

  it('clears snapshots for the record and waits for the transaction', async () => {
    const recordId = 'record-1';
    snapshotIndex.getAllKeys.mockResolvedValue(['snapshot-1', 'snapshot-2']);

    let resolved = false;
    const resultPromise = clearSnapshots(recordId).then((result) => {
      resolved = true;
      return result;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    resolveDone?.();
    const result = await resultPromise;

    expect(result).toBe(2);
    expect(db.transaction).toHaveBeenCalledWith('snapshots', 'readwrite');
    expect(snapshotIndex.getAllKeys).toHaveBeenCalledWith(recordId);
    expect(snapshotStore.delete).toHaveBeenCalledTimes(2);
    expect(snapshotStore.delete).toHaveBeenCalledWith('snapshot-1');
    expect(snapshotStore.delete).toHaveBeenCalledWith('snapshot-2');
  });
});
