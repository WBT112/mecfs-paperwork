import { openStorage } from './db';
import type { FormpackMetaEntry } from './types';

export type UpsertFormpackMetaInput = {
  id: string;
  versionOrHash: string;
  version?: string;
  hash: string;
  updatedAt?: string;
};

export const getFormpackMeta = async (
  id: string,
): Promise<FormpackMetaEntry | null> => {
  const db = await openStorage();
  const entry = await db.get('formpackMeta', id);
  return entry ?? null;
};

export const upsertFormpackMeta = async (
  input: UpsertFormpackMetaInput,
): Promise<FormpackMetaEntry> => {
  const db = await openStorage();
  const nextEntry: FormpackMetaEntry = {
    id: input.id,
    versionOrHash: input.versionOrHash,
    version: input.version,
    hash: input.hash,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };

  await db.put('formpackMeta', nextEntry);
  return nextEntry;
};

export const listFormpackMeta = async (): Promise<FormpackMetaEntry[]> => {
  const db = await openStorage();
  const entries = await db.getAll('formpackMeta');
  return [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};
