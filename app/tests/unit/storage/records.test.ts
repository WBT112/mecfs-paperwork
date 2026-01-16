import { describe, vi, it, expect, beforeEach } from 'vitest';
import {
  createRecord,
  getRecord,
  listRecords,
  updateRecord,
} from '../../../src/storage/records';
import { openStorage } from '../../../src/storage/db';

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
    const formpackId = 'test-formpack';
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
      { id: '1', updatedAt: '2023-01-01T00:00:00.000Z' },
      { id: '2', updatedAt: '2023-01-02T00:00:00.000Z' },
    ];
    mockDb.getAllFromIndex.mockResolvedValue(records);
    const result = await listRecords('test-formpack');
    expect(result).toEqual([records[1], records[0]]);
    expect(mockDb.getAllFromIndex).toHaveBeenCalledWith(
      'records',
      'by_formpackId',
      'test-formpack',
    );
  });

  it('should return an empty array if no records are found', async () => {
    mockDb.getAllFromIndex.mockResolvedValue([]);
    const result = await listRecords('test-formpack');
    expect(result).toEqual([]);
  });
});

describe('updateRecord', () => {
  const mockDb = {
    get: vi.fn(),
    put: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(openStorage).mockResolvedValue(mockDb as any);
    mockDb.get.mockClear();
    mockDb.put.mockClear();
  });

  it('should update the record and timestamps', async () => {
    const existingRecord = {
      id: '1',
      data: { a: 1 },
      title: 'Old Title',
      locale: 'en',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };
    mockDb.get.mockResolvedValue(existingRecord);

    const updates = {
      data: { a: 2 },
      title: 'New Title',
      locale: 'de' as const,
    };
    const result = await updateRecord('1', updates);

    expect(result?.data).toEqual(updates.data);
    expect(result?.title).toBe(updates.title);
    expect(result?.locale).toBe(updates.locale);
    expect(result?.createdAt).toBe(existingRecord.createdAt);
    expect(result?.updatedAt).not.toBe(existingRecord.updatedAt);
    expect(mockDb.put).toHaveBeenCalledWith('records', result);
  });

  it('should return null if the record is not found', async () => {
    mockDb.get.mockResolvedValue(undefined);
    const result = await updateRecord('1', {});
    expect(result).toBeNull();
    expect(mockDb.put).not.toHaveBeenCalled();
  });
});
