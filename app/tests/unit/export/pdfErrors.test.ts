import { describe, expect, it } from 'vitest';
import { normalizePdfExportError } from '../../../src/export/pdf/errors';

describe('normalizePdfExportError', () => {
  it('returns Error instances as-is', () => {
    const error = new Error('boom');
    expect(normalizePdfExportError(error)).toBe(error);
  });

  it('wraps string errors', () => {
    expect(normalizePdfExportError('nope').message).toBe('nope');
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(normalizePdfExportError({}).message).toBe('PDF export failed.');
  });
});
