// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  normalizeExportRevisions,
  validateJsonImport,
  migrateExport,
  type JsonImportPayload,
} from '../../src/import/json';
import type { RJSFSchema } from '@rjsf/utils';

const DOCTOR_LETTER_ID = 'doctor-letter';

describe('import/json helpers', () => {
  it('normalizeExportRevisions handles undefined and invalid values', () => {
    expect(normalizeExportRevisions(undefined)).toEqual([]);
    // non-array
    expect(normalizeExportRevisions('nope')).toBe('invalid_revisions');
  });

  it('normalizeExportRevisions normalizes valid entries', () => {
    const revisions = [{ label: 'v1', data: { a: 1 } }];
    expect(normalizeExportRevisions(revisions)).toEqual([
      { label: 'v1', data: { a: 1 }, createdAt: undefined },
    ]);
  });

  it('validateJsonImport reports invalid json', () => {
    const schema = { type: 'object', properties: {} } as RJSFSchema;
    const res = validateJsonImport('', schema, DOCTOR_LETTER_ID);
    expect(res.error).not.toBeNull();
    expect(res.error?.code).toBe('invalid_json');
  });

  it('validateJsonImport rejects unknown formpack', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } },
    } as RJSFSchema;
    const payload = JSON.stringify({
      version: 1,
      formpack: { id: 'unknown' },
      record: { locale: 'de', data: { a: 'x' } },
    });
    const res = validateJsonImport(payload, schema, DOCTOR_LETTER_ID);
    expect(res.error?.code).toBe('unknown_formpack');
  });

  it('validateJsonImport rejects unsupported locale', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } },
    } as RJSFSchema;
    const payload = JSON.stringify({
      version: 1,
      formpack: { id: DOCTOR_LETTER_ID },
      record: { locale: 'fr', data: { a: 'x' } },
    });
    const res = validateJsonImport(payload, schema, DOCTOR_LETTER_ID);
    expect(res.error?.code).toBe('unsupported_locale');
  });

  it('validateJsonImport accepts valid payload', () => {
    const schema = {
      type: 'object',
      properties: { a: { type: 'string' } },
    } as RJSFSchema;
    const payload = JSON.stringify({
      version: 1,
      formpack: { id: DOCTOR_LETTER_ID },
      record: { locale: 'de', data: { a: 'x' } },
    });
    const res = validateJsonImport(payload, schema, DOCTOR_LETTER_ID);
    expect(res.error).toBeNull();
    expect(res.payload).toBeTruthy();
    expect(res.payload?.record.locale).toBe('de');
    expect(res.payload?.record.data).toEqual({ a: 'x' });
  });

  it('migrateExport is a noop in stub', () => {
    const p: JsonImportPayload = {
      version: 1,
      formpack: { id: DOCTOR_LETTER_ID },
      record: { locale: 'de', data: {} },
    };
    expect(migrateExport(p)).toBe(p);
  });
});
