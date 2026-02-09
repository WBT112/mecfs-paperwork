/**
 * Redaction helper for diagnostics bundle.
 * Strips known sensitive keys and values to prevent accidental leakage
 * of personal or medical data.
 */

const FORBIDDEN_KEYS = new Set([
  'data',
  'title',
  'label',
  'value',
  'text',
  'content',
  'body',
  'payload',
  'password',
  'secret',
  'token',
  'cookie',
  'session',
  'authorization',
  'name',
  'email',
  'phone',
  'address',
  'diagnosis',
  'medication',
  'symptom',
  'treatment',
  'doctor',
  'patient',
  'health',
  'medical',
  'condition',
]);

const FORBIDDEN_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{2,4}[./-]\d{2}[./-]\d{2,4}\b/,
];

export const isForbiddenKey = (key: string): boolean =>
  FORBIDDEN_KEYS.has(key.toLowerCase());

export const containsForbiddenPattern = (value: string): boolean =>
  FORBIDDEN_PATTERNS.some((pattern) => pattern.test(value));

const REDACTED_PLACEHOLDER = '[REDACTED]';

export const redactValue = (key: string, value: unknown): unknown => {
  if (isForbiddenKey(key)) {
    return REDACTED_PLACEHOLDER;
  }

  if (typeof value === 'string' && containsForbiddenPattern(value)) {
    return REDACTED_PLACEHOLDER;
  }

  return value;
};

export const redactObject = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isForbiddenKey(key)) {
      result[key] = REDACTED_PLACEHOLDER;
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
      continue;
    }

    if (typeof value === 'string' && containsForbiddenPattern(value)) {
      result[key] = REDACTED_PLACEHOLDER;
      continue;
    }

    result[key] = value;
  }

  return result;
};
