import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FormpackMetaEntry, RecordEntry, SnapshotEntry } from './types';

const DB_NAME = 'mecfs-paperwork';
const DB_VERSION = 2;

/**
 * Typed schema for the IndexedDB storage.
 */
interface MecfsPaperworkDB extends DBSchema {
  records: {
    key: string;
    value: RecordEntry;
    indexes: {
      by_formpackId: string;
      by_updatedAt: string;
    };
  };
  snapshots: {
    key: string;
    value: SnapshotEntry;
    indexes: {
      by_recordId: string;
      by_recordId_createdAt: [string, string];
    };
  };
  formpackMeta: {
    key: string;
    value: FormpackMetaEntry;
    indexes: {
      by_updatedAt: string;
    };
  };
}

/**
 * Error for cases where IndexedDB is not available.
 */
export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

const isIndexedDbAvailable = (): boolean => typeof indexedDB !== 'undefined';

/**
 * Opens the IndexedDB connection for the app.
 */
export const openStorage = async (): Promise<
  IDBPDatabase<MecfsPaperworkDB>
> => {
  if (!isIndexedDbAvailable()) {
    throw new StorageUnavailableError('IndexedDB is unavailable.');
  }

  return openDB<MecfsPaperworkDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // NOTE: This upgrade callback only runs when the DB_VERSION is incremented.
      // Any schema changes (adding/removing object stores or indexes) require
      // a version bump for them to be applied.
      if (!database.objectStoreNames.contains('records')) {
        const recordStore = database.createObjectStore('records', {
          keyPath: 'id',
        });
        recordStore.createIndex('by_formpackId', 'formpackId');
        recordStore.createIndex('by_updatedAt', 'updatedAt');
      }

      if (!database.objectStoreNames.contains('snapshots')) {
        const snapshotStore = database.createObjectStore('snapshots', {
          keyPath: 'id',
        });
        snapshotStore.createIndex('by_recordId', 'recordId');
        snapshotStore.createIndex(
          'by_recordId_createdAt',
          ['recordId', 'createdAt'],
          { unique: false },
        );
      }

      if (!database.objectStoreNames.contains('formpackMeta')) {
        const formpackMetaStore = database.createObjectStore('formpackMeta', {
          keyPath: 'id',
        });
        formpackMetaStore.createIndex('by_updatedAt', 'updatedAt');
      }
    },
  });
};
