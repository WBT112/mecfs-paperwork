import { openDB } from 'idb';
import { openStorage, StorageUnavailableError } from '../../../src/storage/db';

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

describe('openStorage', () => {
  let originalIndexedDB: IDBFactory | undefined;

  beforeEach(() => {
    originalIndexedDB = global.indexedDB;
    // Mock IndexedDB if it's not available in the test environment
    if (!global.indexedDB) {
      // @ts-expect-error - JSDOM doesn't fully support IndexedDB
      global.indexedDB = {
        open: vi.fn(),
        deleteDatabase: vi.fn(),
        databases: vi.fn(),
      };
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.indexedDB = originalIndexedDB;
  });
  it('throws StorageUnavailableError when IndexedDB is not available', async () => {
    const originalIndexedDB = global.indexedDB;
    // @ts-expect-error - testing unavailability
    delete global.indexedDB;

    await expect(openStorage()).rejects.toThrow(StorageUnavailableError);

    global.indexedDB = originalIndexedDB;
  });

  it('configures the database with the correct stores and indexes', async () => {
    const mockDb = {
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      },
      createObjectStore: vi.fn().mockReturnValue({
        createIndex: vi.fn(),
      }),
    };
    (openDB as vi.Mock).mockImplementation((_name, _version, { upgrade }) => {
      upgrade(mockDb);
      return Promise.resolve(mockDb);
    });

    await openStorage();

    expect(mockDb.createObjectStore).toHaveBeenCalledWith('records', {
      keyPath: 'id',
    });
    expect(mockDb.createObjectStore).toHaveBeenCalledWith('snapshots', {
      keyPath: 'id',
    });

    const recordStore = mockDb.createObjectStore.mock.results[0].value;
    expect(recordStore.createIndex).toHaveBeenCalledWith(
      'by_formpackId',
      'formpackId',
    );
    expect(recordStore.createIndex).toHaveBeenCalledWith(
      'by_updatedAt',
      'updatedAt',
    );

    const snapshotStore = mockDb.createObjectStore.mock.results[1].value;
    expect(snapshotStore.createIndex).toHaveBeenCalledWith(
      'by_recordId',
      'recordId',
    );
    expect(snapshotStore.createIndex).toHaveBeenCalledWith(
      'by_recordId_createdAt',
      ['recordId', 'createdAt'],
      { unique: false },
    );
  });
});
