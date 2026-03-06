/**
 * Reads a localStorage entry while shielding callers from privacy-mode and
 * quota-related access errors.
 *
 * @param key - Storage key to read.
 * @returns The stored string value or `null` when the key is missing or access fails.
 */
export const readLocalStorage = (key: string): string | null => {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Persists a string value in localStorage while keeping callers resilient when
 * storage access is blocked.
 *
 * @param key - Storage key to write.
 * @param value - String value to persist.
 * @returns `true` when the write succeeded, otherwise `false`.
 */
export const writeLocalStorage = (key: string, value: string): boolean => {
  try {
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};
