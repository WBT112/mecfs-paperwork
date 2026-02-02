/// <reference types="vitest" />

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import {
  openDB,
  type IDBPDatabase,
  type IDBPTransaction,
  type OpenDBCallbacks,
} from 'idb';
import { openStorage, StorageUnavailableError } from '../../../src/storage/db';

// Mock the 'idb' library
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

describe('storage/db', () => {
  type MockObjectStore = {
    createIndex: Mock<
      (
        name: string,
        keyPath: string | string[],
        options?: IDBIndexParameters,
      ) => void
    >;
  };
  type MockDatabase = {
    objectStoreNames: { contains: Mock<(name: string) => boolean> };
    createObjectStore: Mock<
      (name: string, options: { keyPath: string }) => MockObjectStore
    >;
    close: Mock<() => void>;
    transaction?: Mock<() => unknown>;
  };

  const globalWithIndexedDb = globalThis as { indexedDB?: IDBFactory };

  // Store original indexedDB. `global` types don't see our JSDOM env.
  let originalIndexedDB: IDBFactory | undefined;

  beforeEach(() => {
    originalIndexedDB = globalWithIndexedDb.indexedDB;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original indexedDB
    globalWithIndexedDb.indexedDB = originalIndexedDB;
  });

  describe('openStorage', () => {
    it('should throw StorageUnavailableError if indexedDB is not available', async () => {
      globalWithIndexedDb.indexedDB = undefined;

      await expect(openStorage()).rejects.toThrow(StorageUnavailableError);
      await expect(openStorage()).rejects.toThrow('IndexedDB is unavailable.');
    });

    it('should open the database successfully when indexedDB is available', async () => {
      globalWithIndexedDb.indexedDB = {} as IDBFactory;
      const mockDb = { close: vi.fn() } as unknown as IDBPDatabase;
      (openDB as Mock).mockResolvedValue(mockDb);

      const db = await openStorage();

      expect(db).toBe(mockDb);
      expect(openDB).toHaveBeenCalledWith(
        'mecfs-paperwork',
        1,
        expect.any(Object),
      );
    });

    it('should call the upgrade callback to create object stores and indexes', async () => {
      globalWithIndexedDb.indexedDB = {} as IDBFactory;
      const createdStores: MockObjectStore[] = [];
      const mockDb: MockDatabase = {
        objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
        createObjectStore: vi.fn().mockImplementation(() => {
          const store = { createIndex: vi.fn() };
          createdStores.push(store);
          return store;
        }),
        close: vi.fn(),
        transaction: vi.fn(),
      };

      // Capture the upgrade callback
      let upgradeCallback: OpenDBCallbacks<unknown>['upgrade'] | undefined;

      (openDB as Mock).mockImplementation(
        (
          _name: string,
          _version: number,
          options: OpenDBCallbacks<unknown>,
        ) => {
          if (typeof options.upgrade === 'function') {
            upgradeCallback = options.upgrade;
          }
          return Promise.resolve(mockDb as unknown as IDBPDatabase);
        },
      );

      await openStorage();

      // Simulate the upgrade process by calling the captured callback
      expect(upgradeCallback).toBeDefined();
      if (!upgradeCallback) {
        throw new Error('upgrade callback not captured');
      }
      const runUpgrade = upgradeCallback;
      const upgradeEvent = {
        oldVersion: 0,
        newVersion: 1,
      } as IDBVersionChangeEvent;
      const upgradeTransaction = {} as IDBPTransaction<
        unknown,
        string[],
        'versionchange'
      >;
      runUpgrade(
        mockDb as unknown as IDBPDatabase,
        0,
        1,
        upgradeTransaction,
        upgradeEvent,
      );

      // Check for 'records' store and its indexes
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('records', {
        keyPath: 'id',
      });
      const recordStoreMock = createdStores[0];
      expect(recordStoreMock.createIndex).toHaveBeenCalledWith(
        'by_formpackId',
        'formpackId',
      );
      expect(recordStoreMock.createIndex).toHaveBeenCalledWith(
        'by_updatedAt',
        'updatedAt',
      );

      // Check for 'snapshots' store and its indexes
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('snapshots', {
        keyPath: 'id',
      });
      const snapshotStoreMock = createdStores[1];
      expect(snapshotStoreMock.createIndex).toHaveBeenCalledWith(
        'by_recordId',
        'recordId',
      );
      expect(snapshotStoreMock.createIndex).toHaveBeenCalledWith(
        'by_recordId_createdAt',
        ['recordId', 'createdAt'],
        { unique: false },
      );
    });

    it('should not create object stores if they already exist', async () => {
      globalWithIndexedDb.indexedDB = {} as IDBFactory;
      const mockDb: MockDatabase = {
        objectStoreNames: { contains: vi.fn().mockReturnValue(true) }, // They exist
        createObjectStore: vi.fn(),
        close: vi.fn(),
      };

      let upgradeCallback: OpenDBCallbacks<unknown>['upgrade'] | undefined;

      (openDB as Mock).mockImplementation(
        (
          _name: string,
          _version: number,
          options: OpenDBCallbacks<unknown>,
        ) => {
          if (typeof options.upgrade === 'function') {
            upgradeCallback = options.upgrade;
          }
          return Promise.resolve(mockDb as unknown as IDBPDatabase);
        },
      );

      await openStorage();

      expect(upgradeCallback).toBeDefined();
      if (!upgradeCallback) {
        throw new Error('upgrade callback not captured');
      }
      const runUpgrade = upgradeCallback;
      const upgradeEvent = {
        oldVersion: 0,
        newVersion: 1,
      } as IDBVersionChangeEvent;
      const upgradeTransaction = {} as IDBPTransaction<
        unknown,
        string[],
        'versionchange'
      >;
      runUpgrade(
        mockDb as unknown as IDBPDatabase,
        0,
        1,
        upgradeTransaction,
        upgradeEvent,
      );

      expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith('records');
      expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith(
        'snapshots',
      );
      expect(mockDb.createObjectStore).not.toHaveBeenCalled();
    });
  });
});
