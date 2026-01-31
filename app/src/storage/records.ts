import type { SupportedLocale } from '../i18n/locale';
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

  await db.add('records', record);
  return record;
};

/**
 * Lists all records for a formpack, ordered by most recently updated.
 */
export const listRecords = async (
  formpackId: string,
): Promise<RecordEntry[]> => {
  const db = await openStorage();
  const records = await db.getAllFromIndex(
    'records',
    'by_formpackId',
    formpackId,
  );
  return sortByUpdatedAtDesc(records);
};

/**
 * Gets a record by id.
 */
export const getRecord = async (id: string): Promise<RecordEntry | null> => {
  const db = await openStorage();
  const record = await db.get('records', id);
  return record ?? null;
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
  const existing = await db.get('records', id);

  if (!existing) {
    return null;
  }

  const updated: RecordEntry = {
    ...existing,
    ...updates,
    data: updates.data ?? existing.data,
    locale: updates.locale ?? existing.locale,
    updatedAt: new Date().toISOString(),
  };

  await db.put('records', updated);
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
