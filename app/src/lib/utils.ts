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
