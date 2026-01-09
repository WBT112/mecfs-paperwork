import { openStorage } from './db';
import type { SnapshotEntry } from './types';

const sortByCreatedAtDesc = (snapshots: SnapshotEntry[]): SnapshotEntry[] =>
  [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/**
 * Creates a snapshot for the provided record.
 */
export const createSnapshot = async (
  recordId: string,
  data: Record<string, unknown>,
  label?: string,
  createdAt?: string,
): Promise<SnapshotEntry> => {
  const db = await openStorage();
  const now = createdAt ?? new Date().toISOString();
  const snapshot: SnapshotEntry = {
    id: crypto.randomUUID(),
    recordId,
    label,
    data,
    createdAt: now,
  };

  await db.add('snapshots', snapshot);
  return snapshot;
};

/**
 * Lists snapshots for a record, ordered by newest first.
 */
export const listSnapshots = async (
  recordId: string,
): Promise<SnapshotEntry[]> => {
  const db = await openStorage();
  const snapshots = await db.getAllFromIndex(
    'snapshots',
    'by_recordId',
    recordId,
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
  const snapshot = await db.get('snapshots', snapshotId);
  return snapshot ?? null;
};
