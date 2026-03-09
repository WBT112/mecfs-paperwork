import type { SupportedLocale } from '../i18n/locale';
import { encryptStorageData } from './atRestEncryption';
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
  let record: RecordEntry;
  let encryptedRecordData:
    | Awaited<ReturnType<typeof encryptStorageData>>
    | undefined;

  if (options.mode === 'overwrite') {
    if (!options.recordId) {
      throw new TypeError('Missing record id for overwrite import.');
    }

    const existing = await db.get('records', options.recordId);
    if (existing?.formpackId !== options.formpackId) {
      throw new TypeError('Record not found for import.');
    }

    record = {
      ...existing,
      title: options.title ?? existing.title,
      locale: options.locale,
      data: options.data,
      updatedAt: now,
    };
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
  }

  encryptedRecordData = await encryptStorageData(record.data);
  const encryptedRevisions = options.revisions?.length
    ? await Promise.all(
        options.revisions.map(async (revision) => ({
          ...revision,
          encryptedData: await encryptStorageData(revision.data),
        })),
      )
    : [];

  const tx = db.transaction(['records', 'snapshots'], 'readwrite');
  const recordStore = tx.objectStore('records');
  const snapshotStore = tx.objectStore('snapshots');

  if (options.mode === 'overwrite') {
    await recordStore.put({
      ...record,
      data: encryptedRecordData,
    });
  } else {
    await recordStore.add({
      ...record,
      data: encryptedRecordData,
    });
  }

  if (encryptedRevisions.length) {
    for (const revision of encryptedRevisions) {
      const snapshot: SnapshotEntry = {
        id: crypto.randomUUID(),
        recordId: record.id,
        label: revision.label,
        data: revision.data,
        createdAt: revision.createdAt ?? now,
      };
      await snapshotStore.add({
        ...snapshot,
        data: revision.encryptedData,
      });
    }
  }

  await tx.done;
  return record;
};
