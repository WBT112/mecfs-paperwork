import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importRecordWithSnapshots } from '../../../src/storage/import';
import { openStorage } from '../../../src/storage/db';

const TEST_FORMPACK_ID = 'test-formpack';
const EXISTING_RECORD_ID = 'existing-id';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

describe('importRecordWithSnapshots', () => {
  let db: any;
  let recordStore: any;
  let snapshotStore: any;
  let transaction: any;

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
      objectStore: vi.fn((storeName) => {
        if (storeName === 'records') return recordStore;
        if (storeName === 'snapshots') return snapshotStore;
      }),
      done: Promise.resolve(),
    };
    db = {
      transaction: vi.fn(() => transaction),
    };
    vi.mocked(openStorage).mockResolvedValue(db);
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
    recordStore.get.mockResolvedValue(existingRecord);

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
    recordStore.get.mockResolvedValue(undefined);

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
