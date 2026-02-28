import { encryptStorageData } from './atRestEncryption';
import { openStorage } from './db';
import { decodeStorageEntry } from './decodeStorageEntry';
import type { SnapshotEntry } from './types';

/** Maximum number of snapshots retained per record. */
const MAX_SNAPSHOTS_PER_RECORD = 50;

const sortByCreatedAtDesc = (snapshots: SnapshotEntry[]): SnapshotEntry[] =>
  [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/**
 * Creates a snapshot for the provided record.
 * Automatically removes the oldest snapshots when the per-record limit is exceeded.
 */
export const createSnapshot = async (
  recordId: string,
  data: Record<string, unknown>,
  label?: string,
): Promise<SnapshotEntry> => {
  const db = await openStorage();
  const now = new Date().toISOString();
  const snapshot: SnapshotEntry = {
    id: crypto.randomUUID(),
    recordId,
    label,
    data,
    createdAt: now,
  };

  const tx = db.transaction('snapshots', 'readwrite');
  const store = tx.objectStore('snapshots');
  await store.add({
    ...snapshot,
    data: await encryptStorageData(snapshot.data),
  });

  // Enforce per-record retention limit
  const allKeys = await store.index('by_recordId').getAllKeys(recordId);
  if (allKeys.length > MAX_SNAPSHOTS_PER_RECORD) {
    const allSnapshots = await store.index('by_recordId').getAll(recordId);
    const sorted = sortByCreatedAtDesc(allSnapshots);
    const toDelete = sorted.slice(MAX_SNAPSHOTS_PER_RECORD);
    await Promise.all(toDelete.map((s) => store.delete(s.id)));
  }

  await tx.done;
  return snapshot;
};

/**
 * Lists snapshots for a record, ordered by newest first.
 */
export const listSnapshots = async (
  recordId: string,
): Promise<SnapshotEntry[]> => {
  const db = await openStorage();
  const persistedSnapshots = await db.getAllFromIndex(
    'snapshots',
    'by_recordId',
    recordId,
  );

  const snapshots = await Promise.all(
    persistedSnapshots.map((entry) =>
      decodeStorageEntry(entry, (migrated) => db.put('snapshots', migrated)),
    ),
  );

  return sortByCreatedAtDesc(snapshots);
};

/**
 * Gets a snapshot by id.
 */
export const getSnapshot = async (
  snapshotId: string,
): Promise<SnapshotEntry | null> => {
  const db = await openStorage();
  const persisted = await db.get('snapshots', snapshotId);
  if (!persisted) {
    return null;
  }

  return decodeStorageEntry(persisted, (migrated) =>
    db.put('snapshots', migrated),
  );
};

/**
 * Removes all snapshots tied to a record.
 */
export const clearSnapshots = async (recordId: string): Promise<number> => {
  const db = await openStorage();
  const tx = db.transaction('snapshots', 'readwrite');
  const snapshotStore = tx.objectStore('snapshots');
  const snapshotKeys = await snapshotStore
    .index('by_recordId')
    .getAllKeys(recordId);

  await Promise.all(snapshotKeys.map((key) => snapshotStore.delete(key)));
  await tx.done;

  return snapshotKeys.length;
};
