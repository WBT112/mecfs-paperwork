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
import { openDB, type IDBPDatabase, type OpenDBCallbacks } from 'idb';
import { openStorage, StorageUnavailableError } from '../../../src/storage/db';

// Mock the 'idb' library
vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

describe('storage/db', () => {
  // Store original indexedDB. `global` types don't see our JSDOM env.
  let originalIndexedDB: IDBFactory | undefined = (global as any).indexedDB;

  beforeEach(() => {
    originalIndexedDB = (global as any).indexedDB;
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original indexedDB
    (global as any).indexedDB = originalIndexedDB;
  });

  describe('openStorage', () => {
    it('should throw StorageUnavailableError if indexedDB is not available', async () => {
      (global as any).indexedDB = undefined;

      await expect(openStorage()).rejects.toThrow(StorageUnavailableError);
      await expect(openStorage()).rejects.toThrow('IndexedDB is unavailable.');
    });

    it('should open the database successfully when indexedDB is available', async () => {
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
      const mockDb = {
        objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
        createObjectStore: vi.fn().mockReturnValue({
          createIndex: vi.fn(),
        }),
        close: vi.fn(),
        transaction: vi.fn(),
      };

      // Capture the upgrade callback
      let upgradeCallback: OpenDBCallbacks<any>['upgrade'];

      (openDB as Mock).mockImplementation(
        (
          _name: string,
          _version: number,
          options: OpenDBCallbacks<unknown>,
        ) => {
          if (options && typeof options.upgrade === 'function') {
            upgradeCallback = options.upgrade;
          }
          return Promise.resolve(mockDb);
        },
      );

      await openStorage();

      // Simulate the upgrade process by calling the captured callback
      if (upgradeCallback) {
        // We cast because we are in a test environment and don't need a full event
        upgradeCallback(mockDb as any, 0, 1, null as any, {} as any);
      } else {
        throw new Error('Upgrade callback was not captured');
      }

      // Check for 'records' store and its indexes
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('records', {
        keyPath: 'id',
      });
      const recordStoreMock = mockDb.createObjectStore.mock.results[0].value;
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
      const snapshotStoreMock = mockDb.createObjectStore.mock.results[1].value;
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
      const mockDb = {
        objectStoreNames: { contains: vi.fn().mockReturnValue(true) }, // They exist
        createObjectStore: vi.fn(),
        close: vi.fn(),
      };

      let upgradeCallback: OpenDBCallbacks<any>['upgrade'];

      (openDB as Mock).mockImplementation(
        (
          _name: string,
          _version: number,
          options: OpenDBCallbacks<unknown>,
        ) => {
          if (options && typeof options.upgrade === 'function') {
            upgradeCallback = options.upgrade;
          }
          return Promise.resolve(mockDb);
        },
      );

      await openStorage();

      if (upgradeCallback) {
        upgradeCallback(mockDb as any, 0, 1, null as any, {} as any);
      } else {
        throw new Error('Upgrade callback was not captured');
      }

      expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith('records');
      expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith(
        'snapshots',
      );
      expect(mockDb.createObjectStore).not.toHaveBeenCalled();
    });
  });
});
