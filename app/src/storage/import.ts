import type { SupportedLocale } from '../i18n/locale';
import { openStorage } from './db';
import type { RecordEntry, SnapshotEntry } from './types';

export type ImportSnapshotPayload = {
  label?: string;
  data: Record<string, unknown>;
  createdAt?: string;
};

export type ImportRecordOptions = {
  formpackId: string;
  data: Record<string, unknown>;
  locale: SupportedLocale;
  title?: string;
  mode: 'new' | 'overwrite';
  recordId?: string;
  revisions?: ImportSnapshotPayload[];
};

/**
 * Imports a record and snapshots in a single transaction to avoid partial writes.
 */
export const importRecordWithSnapshots = async (
  options: ImportRecordOptions,
): Promise<RecordEntry> => {
  const db = await openStorage();
  const now = new Date().toISOString();
  const tx = db.transaction(['records', 'snapshots'], 'readwrite');
  const recordStore = tx.objectStore('records');
  const snapshotStore = tx.objectStore('snapshots');
  let record: RecordEntry;

  if (options.mode === 'overwrite') {
    if (!options.recordId) {
      throw new Error('Missing record id for overwrite import.');
    }

    const existing = await recordStore.get(options.recordId);
    if (!existing || existing.formpackId !== options.formpackId) {
      throw new Error('Record not found for import.');
    }

    record = {
      ...existing,
      title: options.title ?? existing.title,
      locale: options.locale,
      data: options.data,
      updatedAt: now,
    };

    await recordStore.put(record);
  } else {
    record = {
      id: crypto.randomUUID(),
      formpackId: options.formpackId,
      title: options.title,
      locale: options.locale,
      data: options.data,
      createdAt: now,
      updatedAt: now,
    };

    await recordStore.add(record);
  }

  if (options.revisions?.length) {
    for (const revision of options.revisions) {
      const snapshot: SnapshotEntry = {
        id: crypto.randomUUID(),
        recordId: record.id,
        label: revision.label,
        data: revision.data,
        createdAt: revision.createdAt ?? now,
      };
      await snapshotStore.add(snapshot);
    }
  }

  await tx.done;
  return record;
};
