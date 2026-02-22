import { describe, vi, it, expect, beforeEach, type Mock } from 'vitest';
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
} from '../../../src/storage/records';
import { openStorage } from '../../../src/storage/db';

const TEST_FORMPACK_ID = 'test-formpack';
const INITIAL_TIMESTAMP = '2023-01-01T00:00:00.000Z';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

describe('createRecord', () => {
  const mockDb = {
    add: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
    mockDb.add.mockClear();
  });

  it('should create a new record with the correct data', async () => {
    const formpackId = TEST_FORMPACK_ID;
    const locale = 'en';
    const data = { a: 1 };
    const title = 'Test Record';

    const record = await createRecord(formpackId, locale, data, title);

    expect(record.formpackId).toBe(formpackId);
    expect(record.locale).toBe(locale);
    expect(record.data).toEqual(data);
    expect(record.title).toBe(title);
    expect(record.id).toEqual(expect.any(String));
    expect(record.createdAt).toEqual(expect.any(String));
    expect(record.updatedAt).toEqual(expect.any(String));
    expect(record.createdAt).toEqual(record.updatedAt);

    expect(mockDb.add).toHaveBeenCalledOnce();
    expect(mockDb.add).toHaveBeenCalledWith('records', record);
  });
});

describe('getRecord', () => {
  const mockDb = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
    mockDb.get.mockClear();
  });

  it('should return the record if found', async () => {
    const record = { id: '1', name: 'Test' };
    mockDb.get.mockResolvedValue(record);
    const result = await getRecord('1');
    expect(result).toEqual(record);
    expect(mockDb.get).toHaveBeenCalledWith('records', '1');
  });

  it('should return null if the record is not found', async () => {
    mockDb.get.mockResolvedValue(undefined);
    const result = await getRecord('1');
    expect(result).toBeNull();
  });
});

describe('listRecords', () => {
  const mockDb = {
    getAllFromIndex: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
    mockDb.getAllFromIndex.mockClear();
  });

  it('should return a sorted list of records', async () => {
    const records = [
      { id: '1', updatedAt: INITIAL_TIMESTAMP },
      { id: '2', updatedAt: '2023-01-02T00:00:00.000Z' },
    ];
    mockDb.getAllFromIndex.mockResolvedValue(records);
    const result = await listRecords(TEST_FORMPACK_ID);
    expect(result).toEqual([records[1], records[0]]);
    expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
      'records',
      'by_formpackId',
      TEST_FORMPACK_ID,
    );
  });

  it('should return an empty array if no records are found', async () => {
    mockDb.getAllFromIndex.mockResolvedValue([]);
    const result = await listRecords(TEST_FORMPACK_ID);
    expect(result).toEqual([]);
  });
});

describe('updateRecord', () => {
  let mockStore: { get: Mock; put: Mock };
  let mockTx: { objectStore: Mock; done: Promise<void> };
  let resolveDone: (() => void) | undefined;
  let mockDb: { transaction: Mock };

  beforeEach(() => {
    mockStore = {
      get: vi.fn(),
      put: vi.fn(),
    };
    mockTx = {
      objectStore: vi.fn(() => mockStore),
      done: new Promise<void>((resolve) => {
        resolveDone = resolve;
      }),
    };
    mockDb = {
      transaction: vi.fn(() => mockTx),
    };
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
  });

  it('should update the record and timestamps', async () => {
    const existingRecord = {
      id: '1',
      data: { a: 1 },
      title: 'Old Title',
      locale: 'en',
      createdAt: INITIAL_TIMESTAMP,
      updatedAt: INITIAL_TIMESTAMP,
    };
    mockStore.get.mockResolvedValue(existingRecord);

    const updates = {
      data: { a: 2 },
      title: 'New Title',
      locale: 'de' as const,
    };
    const resultPromise = updateRecord('1', updates);
    resolveDone?.();
    const result = await resultPromise;

    expect(result?.data).toEqual(updates.data);
    expect(result?.title).toBe(updates.title);
    expect(result?.locale).toBe(updates.locale);
    expect(result?.createdAt).toBe(existingRecord.createdAt);
    expect(result?.updatedAt).not.toBe(existingRecord.updatedAt);
    expect(mockStore.put).toHaveBeenCalledWith(result);
    expect(mockDb.transaction).toHaveBeenCalledWith('records', 'readwrite');
  });

  it('should return null if the record is not found', async () => {
    mockStore.get.mockResolvedValue(undefined);
    const result = await updateRecord('1', {});
    expect(result).toBeNull();
    expect(mockStore.put).not.toHaveBeenCalled();
  });
});

describe('deleteRecord', () => {
  const SNAPSHOT_ID = 'snapshot-1';
  const SNAPSHOT_ID_2 = 'snapshot-2';
  type MockRecordStore = {
    get: Mock;
    delete: Mock;
  };
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
    transaction: Mock;
  };

  let db: MockDb;
  let recordStore: MockRecordStore;
  let snapshotStore: MockSnapshotStore;
  let snapshotIndex: MockSnapshotIndex;
  let transaction: MockTransaction;
  let resolveDone: (() => void) | undefined;

  beforeEach(() => {
    recordStore = {
      get: vi.fn(),
      delete: vi.fn(),
    };
    snapshotIndex = {
      getAllKeys: vi.fn(),
    };
    snapshotStore = {
      index: vi.fn(() => snapshotIndex),
      delete: vi.fn(),
    };
    transaction = {
      objectStore: vi.fn((storeName: string) => {
        if (storeName === 'records') {
          return recordStore;
        }
        if (storeName === 'snapshots') {
          return snapshotStore;
        }
        return undefined;
      }),
      done: new Promise<void>((resolve) => {
        resolveDone = resolve;
      }),
    };
    db = {
      transaction: vi.fn(() => transaction),
    };
    vi.mocked(openStorage).mockResolvedValue(db as any);
  });

  it('deletes the record and snapshots in a single transaction', async () => {
    const recordId = 'record-1';
    recordStore.get.mockResolvedValue({ id: recordId });
    snapshotIndex.getAllKeys.mockResolvedValue([SNAPSHOT_ID, SNAPSHOT_ID_2]);

    let resolved = false;
    const resultPromise = deleteRecord(recordId).then((result) => {
      resolved = true;
      return result;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    resolveDone?.();
    const result = await resultPromise;

    expect(result).toBe(true);
    expect(db.transaction).toHaveBeenCalledWith(
      ['records', 'snapshots'],
      'readwrite',
    );
    expect(recordStore.get).toHaveBeenCalledWith(recordId);
    expect(snapshotIndex.getAllKeys).toHaveBeenCalledWith(recordId);
    expect(snapshotStore.delete).toHaveBeenCalledTimes(2);
    expect(snapshotStore.delete).toHaveBeenCalledWith(SNAPSHOT_ID);
    expect(snapshotStore.delete).toHaveBeenCalledWith(SNAPSHOT_ID_2);
    expect(recordStore.delete).toHaveBeenCalledWith(recordId);
  });

  it('returns false when the record does not exist', async () => {
    const recordId = 'missing-record';
    recordStore.get.mockResolvedValue(undefined);
    snapshotIndex.getAllKeys.mockResolvedValue([SNAPSHOT_ID]);

    const resultPromise = deleteRecord(recordId);
    resolveDone?.();
    const result = await resultPromise;

    expect(result).toBe(false);
    expect(recordStore.delete).not.toHaveBeenCalled();
    expect(snapshotStore.delete).toHaveBeenCalledWith(SNAPSHOT_ID);
  });
});
