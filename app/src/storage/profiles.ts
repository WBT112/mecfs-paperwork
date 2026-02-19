import { openStorage } from './db';
import type { ProfileData, ProfileEntry } from './types';

export const getProfile = async (id: string): Promise<ProfileEntry | null> => {
  const db = await openStorage();
  const entry = await db.get('profiles', id);
  return entry ?? null;
};

/**
 * Returns true if the profile data contains at least one non-empty string value.
 */
export const hasUsableProfileData = (data: ProfileData): boolean => {
  for (const category of Object.values(data)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard
    if (typeof category !== 'object' || category === null) {
      continue;
    }
    for (const value of Object.values(category as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim() !== '') {
        return true;
      }
    }
  }
  return false;
};

/**
 * Merges non-empty values from `partial` into the existing profile.
 * Empty/whitespace-only strings are ignored and never overwrite existing data.
 */
export const upsertProfile = async (
  id: string,
  partial: ProfileData,
): Promise<ProfileEntry> => {
  const db = await openStorage();
  const existing = await db.get('profiles', id);
  const now = new Date().toISOString();

  const merged = mergeProfileData(existing?.data ?? {}, partial);

  const entry: ProfileEntry = {
    id,
    data: merged,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.put('profiles', entry);
  return entry;
};

type StringRecord = Record<string, string | undefined>;

const mergeProfileData = (
  existing: ProfileData,
  partial: ProfileData,
): ProfileData => {
  const result: ProfileData = { ...existing };

  for (const key of ['patient', 'doctor', 'insurer'] as const) {
    const existingCategory = existing[key] as StringRecord | undefined;
    const partialCategory = partial[key] as StringRecord | undefined;

    if (!partialCategory) {
      continue;
    }

    const merged: StringRecord = { ...existingCategory };
    for (const [field, value] of Object.entries(partialCategory)) {
      if (typeof value === 'string' && value.trim() !== '') {
        merged[field] = value;
      }
    }

    result[key] = merged as ProfileData[typeof key];
  }

  return result;
};
