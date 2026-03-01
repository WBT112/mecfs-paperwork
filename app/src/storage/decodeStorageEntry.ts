import { decodeStoredData, encryptStorageData } from './atRestEncryption';

type EntryWithData = {
  data: unknown;
};

/**
 * Decodes a persisted storage entry and optionally triggers background re-encryption.
 *
 * @remarks
 * RATIONALE: Records and snapshots share the same migration path from legacy
 * plaintext payloads to encrypted payload envelopes. Centralizing this logic
 * avoids drift between stores and keeps migrations consistent.
 *
 * @param entry - Persisted entry loaded from IndexedDB.
 * @param persistMigratedEntry - Background write function for migrated encrypted entries.
 * @returns Entry with decrypted plain object data.
 */
export const decodeStorageEntry = async <TEntry extends EntryWithData>(
  entry: TEntry,
  persistMigratedEntry: (entry: TEntry) => Promise<unknown>,
): Promise<Omit<TEntry, 'data'> & { data: Record<string, unknown> }> => {
  const { data, shouldReencrypt } = await decodeStoredData(entry.data);

  if (shouldReencrypt) {
    const migratedEntry = {
      ...entry,
      data: await encryptStorageData(data),
    } as TEntry;

    persistMigratedEntry(migratedEntry).catch(() => undefined);
  }

  return {
    ...entry,
    data,
  };
};
