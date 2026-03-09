import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import { importRecordWithSnapshots } from '../../../src/storage/importRecord';
import { openStorage } from '../../../src/storage/db';

const TEST_FORMPACK_ID = 'test-formpack';
const EXISTING_RECORD_ID = 'existing-id';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

vi.mock('../../../src/storage/atRestEncryption', () => ({
  encryptStorageData: vi.fn(async (data: Record<string, unknown>) => data),
}));

describe('importRecordWithSnapshots', () => {
  type MockRecordStore = {
    get: Mock;
    put: Mock;
    add: Mock;
  };
  type MockSnapshotStore = {
    add: Mock;
  };
  type MockTransaction = {
    objectStore: Mock;
    done: Promise<void>;
  };
  type MockDb = {
    get: Mock;
    transaction: Mock;
  };

  let db: MockDb;
  let recordStore: MockRecordStore;
  let snapshotStore: MockSnapshotStore;
  let transaction: MockTransaction;
  type OpenStorageResult = Awaited<ReturnType<typeof openStorage>>;

  beforeEach(() => {
    recordStore = {
      get: vi.fn(),
      put: vi.fn(),
      add: vi.fn(),
    };
    snapshotStore = {
      add: vi.fn(),
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
      done: Promise.resolve(),
    };
    db = {
      get: vi.fn(),
      transaction: vi.fn(() => transaction),
    };
    vi.mocked(openStorage).mockResolvedValue(
      db as unknown as OpenStorageResult,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new record when mode is "new"', async () => {
    const options = {
      formpackId: TEST_FORMPACK_ID,
      data: { a: 1 },
      locale: 'en' as const,
      title: 'Test Record',
      mode: 'new' as const,
    };

    const result = await importRecordWithSnapshots(options);

    expect(recordStore.add).toHaveBeenCalledWith(
      expect.objectContaining({
        formpackId: TEST_FORMPACK_ID,
        title: 'Test Record',
      }),
    );
    expect(result.formpackId).toBe(TEST_FORMPACK_ID);
  });

  it('should overwrite an existing record when mode is "overwrite"', async () => {
    const existingRecord = {
      id: EXISTING_RECORD_ID,
      formpackId: TEST_FORMPACK_ID,
      title: 'Old Title',
      locale: 'en',
      data: { a: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.get.mockResolvedValue(existingRecord);

    const options = {
      formpackId: TEST_FORMPACK_ID,
      data: { a: 2 },
      locale: 'de' as const,
      title: 'New Title',
      mode: 'overwrite' as const,
      recordId: EXISTING_RECORD_ID,
    };

    await importRecordWithSnapshots(options);

    expect(recordStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EXISTING_RECORD_ID,
        title: 'New Title',
        locale: 'de',
        data: { a: 2 },
      }),
    );
  });

  it('keeps existing title on overwrite when no title is provided', async () => {
    const existingRecord = {
      id: EXISTING_RECORD_ID,
      formpackId: TEST_FORMPACK_ID,
      title: 'Existing Title',
      locale: 'en',
      data: { a: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.get.mockResolvedValue(existingRecord);

    await importRecordWithSnapshots({
      formpackId: TEST_FORMPACK_ID,
      data: { a: 3 },
      locale: 'en',
      mode: 'overwrite',
      recordId: EXISTING_RECORD_ID,
    });

    expect(recordStore.put).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EXISTING_RECORD_ID,
        title: 'Existing Title',
        data: { a: 3 },
      }),
    );
  });

  it('throws an error for overwrite mode if recordId is missing', async () => {
    const options = {
      formpackId: TEST_FORMPACK_ID,
      data: { a: 1 },
      locale: 'en' as const,
      mode: 'overwrite' as const,
    };

    await expect(importRecordWithSnapshots(options)).rejects.toThrow(
      'Missing record id for overwrite import.',
    );
  });

  it('throws an error for overwrite mode if record not found', async () => {
    db.get.mockResolvedValue(undefined);

    const options = {
      formpackId: TEST_FORMPACK_ID,
      data: { a: 1 },
      locale: 'en' as const,
      mode: 'overwrite' as const,
      recordId: 'non-existing-id',
    };

    await expect(importRecordWithSnapshots(options)).rejects.toThrow(
      'Record not found for import.',
    );
  });

  it('should import revisions for a new record', async () => {
    const options = {
      formpackId: TEST_FORMPACK_ID,
      data: { a: 1 },
      locale: 'en' as const,
      mode: 'new' as const,
      revisions: [
        { label: 'Revision 1', data: { a: 0 } },
        { label: 'Revision 2', data: { a: 1 } },
      ],
    };

    const result = await importRecordWithSnapshots(options);

    expect(snapshotStore.add).toHaveBeenCalledTimes(2);
    expect(snapshotStore.add).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: result.id,
        label: 'Revision 1',
      }),
    );
    expect(snapshotStore.add).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: result.id,
        label: 'Revision 2',
      }),
    );
  });
});
