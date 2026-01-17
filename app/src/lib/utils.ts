/**
 * Provides simple, shared utility functions.
 */

/**
 * Trims a string and returns null if the result is empty.
 * Also returns null if the input is null or undefined.
 * @param value The string to process.
 * @returns The trimmed string or null.
 */
export const emptyStringToNull = (
  value: string | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
