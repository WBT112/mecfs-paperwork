import { isRecord } from './utils';

const BLOCKED_PATH_SEGMENTS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

const getPathSegments = (path: string): string[] =>
  path
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const isArraySegment = (segment: string): boolean => {
  const index = Number(segment);
  return Number.isInteger(index) && index >= 0;
};

const isObjectLike = (
  value: unknown,
): value is Record<string, unknown> | unknown[] =>
  isRecord(value) || Array.isArray(value);

const cloneNestedValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneNestedValue(entry));
  }
  if (isRecord(value)) {
    const cloned: Record<string, unknown> = {};
    Object.entries(value).forEach(([key, entry]) => {
      cloned[key] = cloneNestedValue(entry);
    });
    return cloned;
  }
  return value;
};

const cloneRecord = (
  value: Record<string, unknown>,
): Record<string, unknown> => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return cloneNestedValue(value) as Record<string, unknown>;
};

const createContainerForSegment = (
  segment: string | undefined,
): Record<string, unknown> | unknown[] =>
  isArraySegment(segment ?? '') ? [] : {};

const assignArraySegment = (
  cursor: unknown[],
  segments: string[],
  index: number,
  value: unknown,
): boolean => {
  const segment = segments[index];
  if (!isArraySegment(segment)) {
    return false;
  }

  const position = Number(segment);
  const isLeaf = index === segments.length - 1;
  if (isLeaf) {
    cursor[position] = value;
    return true;
  }

  if (!isObjectLike(cursor[position])) {
    cursor[position] = createContainerForSegment(segments[index + 1]);
  }

  return assignPathValue(cursor[position], segments, index + 1, value);
};

const assignObjectSegment = (
  cursor: Record<string, unknown>,
  segments: string[],
  index: number,
  value: unknown,
): boolean => {
  const segment = segments[index];
  const isLeaf = index === segments.length - 1;
  if (isLeaf) {
    cursor[segment] = value;
    return true;
  }

  if (!isObjectLike(cursor[segment])) {
    cursor[segment] = createContainerForSegment(segments[index + 1]);
  }

  return assignPathValue(cursor[segment], segments, index + 1, value);
};

function assignPathValue(
  cursor: unknown,
  segments: string[],
  index: number,
  value: unknown,
): boolean {
  const segment = segments[index];
  if (!segment || BLOCKED_PATH_SEGMENTS.has(segment)) {
    return false;
  }

  if (Array.isArray(cursor)) {
    return assignArraySegment(cursor, segments, index, value);
  }

  if (isRecord(cursor)) {
    return assignObjectSegment(cursor, segments, index, value);
  }

  return false;
}

/**
 * Reads a value via dot-path traversal on objects/arrays.
 * Returns `undefined` for invalid paths or incompatible structures.
 */
export const getPathValue = (source: unknown, path: string): unknown => {
  const segments = getPathSegments(path);
  if (segments.length === 0) {
    return undefined;
  }

  return segments.reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      if (!isArraySegment(segment)) {
        return undefined;
      }
      return current[Number(segment)];
    }
    if (isRecord(current)) {
      return current[segment];
    }
    return undefined;
  }, source);
};

/**
 * Mutates a target object by dot-path while blocking prototype-pollution segments.
 */
export const setPathValueMutableSafe = (
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const segments = getPathSegments(path);
  if (segments.length === 0) {
    return;
  }
  assignPathValue(target, segments, 0, value);
};

/**
 * Immutable variant of `setPathValueMutableSafe`.
 */
export const setPathValueImmutable = (
  source: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> => {
  const cloned = cloneRecord(source);
  setPathValueMutableSafe(cloned, path, value);
  return cloned;
};
