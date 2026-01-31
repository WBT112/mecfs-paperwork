import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { clearSnapshots } from '../../../src/storage/snapshots';
import { openStorage } from '../../../src/storage/db';

vi.mock('../../../src/storage/db', () => ({
  openStorage: vi.fn(),
}));

describe('clearSnapshots', () => {
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
      transaction: vi.fn(() => transaction),
    };
    vi.mocked(openStorage).mockResolvedValue(db as any);
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
