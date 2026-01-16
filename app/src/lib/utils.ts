/**
 * Provides simple, shared utility functions.
 */

/**
 * Trims a string and returns null if the result is empty.
 * @param value The string to process.
 * @returns The trimmed string or null.
 */
export const emptyStringToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Checks if a value is a non-null, non-array object.
 * @param value The value to check.
 * @returns True if the value is a record, false otherwise.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
