import { describe, vi, it, expect, beforeEach, type Mock } from 'vitest';
import {
  createRecord,
  deleteRecord,
  getRecord,
  listRecords,
  updateRecord,
} from '../../../src/storage/records';
import {
  decodeStoredData,
  encryptStorageData,
} from '../../../src/storage/atRestEncryption';
import { openStorage } from '../../../src/storage/db';

const TEST_FORMPACK_ID = 'test-formpack';
const INITIAL_TIMESTAMP = '2023-01-01T00:00:00.000Z';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

vi.mock('../../../src/storage/atRestEncryption', () => ({
  encryptStorageData: vi.fn(
    async (data: Record<string, unknown>) =>
      data as unknown as Awaited<ReturnType<typeof encryptStorageData>>,
  ),
  decodeStoredData: vi.fn(async (value: unknown) => ({
    data: value as Record<string, unknown>,
    shouldReencrypt: false,
  })),
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
    put: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
    mockDb.get.mockClear();
    mockDb.put.mockReset();
    mockDb.put.mockResolvedValue(undefined);
    mockDb.put.mockClear();
    vi.mocked(decodeStoredData).mockReset();
    vi.mocked(decodeStoredData).mockImplementation(async (value: unknown) => ({
      data: value as Record<string, unknown>,
      shouldReencrypt: false,
    }));
  });

  it('should return the record if found', async () => {
    const record = { id: '1', data: { name: 'Test' }, name: 'Test' };
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

  it('re-encrypts migrated payloads in the background', async () => {
    const migratedData = { id: '1', migrated: true };
    mockDb.get.mockResolvedValue({ id: '1', data: { legacy: true } });
    vi.mocked(decodeStoredData).mockResolvedValueOnce({
      data: migratedData,
      shouldReencrypt: true,
    });

    const result = await getRecord('1');

    expect(result).toEqual({
      id: '1',
      data: migratedData,
    });
    expect(mockDb.put).toHaveBeenCalledWith('records', {
      id: '1',
      data: migratedData,
    });
  });
});

describe('listRecords', () => {
  const mockDb = {
    getAllFromIndex: vi.fn(),
    put: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
    mockDb.getAllFromIndex.mockClear();
    mockDb.put.mockClear();
    vi.mocked(decodeStoredData).mockReset();
    vi.mocked(decodeStoredData).mockImplementation(async (value: unknown) => ({
      data: value as Record<string, unknown>,
      shouldReencrypt: false,
    }));
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

  it('re-encrypts migrated list entries and suppresses background write failures', async () => {
    const migratedData = { decrypted: 'value' };
    const entry = {
      id: '1',
      data: { legacy: true },
      updatedAt: INITIAL_TIMESTAMP,
    };
    mockDb.getAllFromIndex.mockResolvedValue([entry]);
    vi.mocked(decodeStoredData).mockResolvedValueOnce({
      data: migratedData,
      shouldReencrypt: true,
    });
    vi.mocked(encryptStorageData).mockResolvedValueOnce(
      migratedData as unknown as Awaited<ReturnType<typeof encryptStorageData>>,
    );
    mockDb.put.mockRejectedValueOnce(new Error('background write failed'));

    const result = await listRecords(TEST_FORMPACK_ID);

    expect(result).toEqual([
      {
        ...entry,
        data: migratedData,
      },
    ]);
    expect(mockDb.put).toHaveBeenCalledWith('records', {
      ...entry,
      data: migratedData,
    });
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

  it('should keep existing data and locale when partial updates omit them', async () => {
    const existingRecord = {
      id: '1',
      data: { a: 1 },
      title: 'Old Title',
      locale: 'en',
      createdAt: INITIAL_TIMESTAMP,
      updatedAt: INITIAL_TIMESTAMP,
    };
    mockStore.get.mockResolvedValue(existingRecord);

    const resultPromise = updateRecord('1', { title: 'Renamed' });
    resolveDone?.();
    const result = await resultPromise;

    expect(result?.title).toBe('Renamed');
    expect(result?.data).toEqual(existingRecord.data);
    expect(result?.locale).toBe(existingRecord.locale);
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
