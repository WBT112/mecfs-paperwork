import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFormpackMeta,
  listFormpackMeta,
  upsertFormpackMeta,
} from '../../../src/storage/formpackMeta';
import { openStorage } from '../../../src/storage/db';

const FORMPACK_ID = 'doctor-letter';
const FORMPACK_META_STORE = 'formpackMeta';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

describe('storage/formpackMeta', () => {
  const mockDb = {
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(openStorage).mockResolvedValue(mockDb as never);
  });

  it('returns metadata by id', async () => {
    mockDb.get.mockResolvedValue({ id: FORMPACK_ID, hash: 'abc' });

    const result = await getFormpackMeta(FORMPACK_ID);

    expect(result).toEqual({ id: FORMPACK_ID, hash: 'abc' });
    expect(mockDb.get).toHaveBeenCalledWith(FORMPACK_META_STORE, FORMPACK_ID);
  });

  it('upserts metadata with generated timestamp fallback', async () => {
    const result = await upsertFormpackMeta({
      id: FORMPACK_ID,
      versionOrHash: '1.0.0',
      version: '1.0.0',
      hash: 'abc',
    });

    expect(result.id).toBe(FORMPACK_ID);
    expect(result.updatedAt).toEqual(expect.any(String));
    expect(mockDb.put).toHaveBeenCalledWith(FORMPACK_META_STORE, result);
  });

  it('lists metadata sorted by updatedAt descending', async () => {
    mockDb.getAll.mockResolvedValue([
      { id: 'a', updatedAt: '2026-02-01T00:00:00.000Z' },
      { id: 'b', updatedAt: '2026-02-02T00:00:00.000Z' },
    ]);

    const result = await listFormpackMeta();

    expect(result.map((entry) => entry.id)).toEqual(['b', 'a']);
    expect(mockDb.getAll).toHaveBeenCalledWith(FORMPACK_META_STORE);
  });
});
