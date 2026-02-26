import type { SupportedLocale } from '../i18n/locale';
import { decodeStoredData, encryptStorageData } from './atRestEncryption';
import { openStorage } from './db';
import type { RecordEntry } from './types';

const sortByUpdatedAtDesc = (records: RecordEntry[]): RecordEntry[] =>
  [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/**
 * Creates a new record for the provided formpack.
 */
export const createRecord = async (
  formpackId: string,
  locale: SupportedLocale,
  data: Record<string, unknown>,
  title?: string,
): Promise<RecordEntry> => {
  const db = await openStorage();
  const now = new Date().toISOString();
  const record: RecordEntry = {
    id: crypto.randomUUID(),
    formpackId,
    title,
    locale,
    data,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('records', {
    ...record,
    data: await encryptStorageData(record.data),
  });
  return record;
};

/**
 * Lists all records for a formpack, ordered by most recently updated.
 */
export const listRecords = async (
  formpackId: string,
): Promise<RecordEntry[]> => {
  const db = await openStorage();
  const persistedRecords = await db.getAllFromIndex(
    'records',
    'by_formpackId',
    formpackId,
  );

  const records = await Promise.all(
    persistedRecords.map(async (entry) => {
      const { data, shouldReencrypt } = await decodeStoredData(entry.data);
      if (shouldReencrypt) {
        const migrated = {
          ...entry,
          data: await encryptStorageData(data),
        };
        db.put('records', migrated).catch(() => undefined);
      }

      return {
        ...entry,
        data,
      };
    }),
  );

  return sortByUpdatedAtDesc(records);
};

/**
 * Gets a record by id.
 */
export const getRecord = async (id: string): Promise<RecordEntry | null> => {
  const db = await openStorage();
  const persisted = await db.get('records', id);
  if (!persisted) {
    return null;
  }

  const { data, shouldReencrypt } = await decodeStoredData(persisted.data);

  if (shouldReencrypt) {
    const migrated = {
      ...persisted,
      data: await encryptStorageData(data),
    };
    db.put('records', migrated).catch(() => undefined);
  }

  return {
    ...persisted,
    data,
  };
};

/**
 * Updates a record and returns the stored record.
 */
export const updateRecord = async (
  id: string,
  updates: {
    data?: Record<string, unknown>;
    title?: string;
    locale?: SupportedLocale;
  },
): Promise<RecordEntry | null> => {
  const db = await openStorage();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');
  const existing = await store.get(id);

  if (!existing) {
    return null;
  }

  const { data: existingData } = await decodeStoredData(existing.data);

  const updated: RecordEntry = {
    ...existing,
    ...updates,
    data: updates.data ?? existingData,
    locale: updates.locale ?? existing.locale,
    updatedAt: new Date().toISOString(),
  };

  await store.put({
    ...updated,
    data: await encryptStorageData(updated.data),
  });
  await tx.done;
  return updated;
};

/**
 * Deletes a record and all snapshots tied to it.
 */
export const deleteRecord = async (recordId: string): Promise<boolean> => {
  const db = await openStorage();
  const tx = db.transaction(['records', 'snapshots'], 'readwrite');
  const recordStore = tx.objectStore('records');
  const snapshotStore = tx.objectStore('snapshots');
  const existingRecord = await recordStore.get(recordId);
  const snapshotKeys = await snapshotStore
    .index('by_recordId')
    .getAllKeys(recordId);

  await Promise.all(snapshotKeys.map((key) => snapshotStore.delete(key)));

  if (existingRecord) {
    await recordStore.delete(recordId);
  }

  await tx.done;
  return Boolean(existingRecord);
};
