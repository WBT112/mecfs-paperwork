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

/**
 * Checks if a value is a non-null, non-array object.
 * @param value The value to check.
 * @returns True if the value is a record, false otherwise.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

import sanitizeHtml from 'sanitize-html';

/**
 * Strips all HTML tags from a string to prevent XSS.
 * This implementation is safe for server-side rendering (SSR) environments.
 *
 * @param {string} str - The input string to be stripped.
 * @returns {string} The stripped string.
 */
export const stripHtml = (str: string): string => {
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  });
};
