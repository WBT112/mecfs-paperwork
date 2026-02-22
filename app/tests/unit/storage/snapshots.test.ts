import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import {
  clearSnapshots,
  createSnapshot,
  getSnapshot,
  listSnapshots,
} from '../../../src/storage/snapshots';
import { openStorage } from '../../../src/storage/db';

const RECORD_ID = 'record-1';
const SNAPSHOT_ID = 'snapshot-123';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

describe('snapshots storage', () => {
  type MockSnapshotIndex = {
    getAllKeys: Mock;
    getAll: Mock;
  };
  type MockSnapshotStore = {
    add: Mock;
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
      getAllKeys: vi.fn().mockResolvedValue([]),
      getAll: vi.fn().mockResolvedValue([]),
    };
    snapshotStore = {
      add: vi.fn(),
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

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a snapshot with generated metadata', async () => {
    const now = new Date('2025-01-02T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => SNAPSHOT_ID) });

    snapshotIndex.getAllKeys.mockResolvedValue([SNAPSHOT_ID]);

    const resultPromise = createSnapshot(RECORD_ID, { field: 'value' }, 'Auto');
    resolveDone?.();
    const snapshot = await resultPromise;

    expect(snapshot).toEqual({
      id: SNAPSHOT_ID,
      recordId: RECORD_ID,
      label: 'Auto',
      data: { field: 'value' },
      createdAt: now.toISOString(),
    });
    expect(snapshotStore.add).toHaveBeenCalledWith(snapshot);
  });

  it('lists snapshots sorted by newest first', async () => {
    const snapshots = [
      {
        id: 'one',
        recordId: RECORD_ID,
        data: {},
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'two',
        recordId: RECORD_ID,
        data: {},
        createdAt: '2024-01-03T00:00:00.000Z',
      },
      {
        id: 'three',
        recordId: RECORD_ID,
        data: {},
        createdAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    db.getAllFromIndex?.mockResolvedValue(snapshots);

    const result = await listSnapshots(RECORD_ID);

    expect(db.getAllFromIndex).toHaveBeenCalledWith(
      'snapshots',
      'by_recordId',
      RECORD_ID,
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
    const recordId = RECORD_ID;
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
