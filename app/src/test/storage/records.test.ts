import { describe, vi, it, expect, beforeEach } from 'vitest';
import { createRecord } from '../../storage/records';
import { openStorage } from '../../storage/db';

vi.mock('../../storage/db', () => ({
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
