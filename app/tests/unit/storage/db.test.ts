// Vitest must be configured to unstub globals after each test.
// We also need a mock for the IndexedDB API.
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { openStorage, StorageUnavailableError } from '../../../src/storage/db';
import { deleteDB, type IDBPDatabase } from 'idb';
import type { MecfsPaperworkDB } from '../../../src/storage/db';

const DB_NAME = 'mecfs-paperwork';

describe('storage/db', () => {
  let db: IDBPDatabase<MecfsPaperworkDB> | undefined;

  afterEach(async () => {
    // Ensure the connection is closed before trying to delete the database
    db?.close();
    await deleteDB(DB_NAME);
  });

  it('should open the database and create object stores and indexes on upgrade', async () => {
    // Sanity check exports
    expect(openStorage).toBeDefined();
    expect(StorageUnavailableError).toBeDefined();

    db = await openStorage();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(1);

    // Check if object stores were created
    expect(db.objectStoreNames).toContain('records');
    expect(db.objectStoreNames).toContain('snapshots');

    // Check if indexes were created for 'records' store
    const recordsTx = db.transaction('records', 'readonly');
    const recordsStore = recordsTx.objectStore('records');
    expect(recordsStore.indexNames).toContain('by_formpackId');
    expect(recordsStore.indexNames).toContain('by_updatedAt');
    await recordsTx.done;

    // Check if indexes were created for 'snapshots' store
    const snapshotsTx = db.transaction('snapshots', 'readonly');
    const snapshotsStore = snapshotsTx.objectStore('snapshots');
    expect(snapshotsStore.indexNames).toContain('by_recordId');
    expect(snapshotsStore.indexNames).toContain('by_recordId_createdAt');
    await snapshotsTx.done;
  });

  describe('when IndexedDB is unavailable', () => {
    beforeEach(() => {
      vi.stubGlobal('indexedDB', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should throw StorageUnavailableError', async () => {
      await expect(openStorage()).rejects.toThrow(StorageUnavailableError);
      await expect(openStorage()).rejects.toThrow('IndexedDB is unavailable.');
    });
  });
});
