import { describe, it, expect, vi } from 'vitest';
import {
  normalizeExportRevisions,
  validateJsonImport,
} from '../../../src/import/json';

const formpackIds = vi.hoisted(() => ({
  PRIMARY_FORMPACK_ID: 'my-formpack',
  SECONDARY_FORMPACK_ID: 'another-formpack',
}));

vi.mock('../../../src/formpacks/registry', () => ({
  FORMPACK_IDS: [
    formpackIds.PRIMARY_FORMPACK_ID,
    formpackIds.SECONDARY_FORMPACK_ID,
  ],
}));

const { PRIMARY_FORMPACK_ID, SECONDARY_FORMPACK_ID } = formpackIds;

describe('normalizeExportRevisions', () => {
  it('returns an empty array for undefined input', () => {
    expect(normalizeExportRevisions(undefined)).toEqual([]);
  });

  it('returns "invalid_revisions" for non-array input', () => {
    expect(normalizeExportRevisions({})).toBe('invalid_revisions');
    expect(normalizeExportRevisions(null)).toBe('invalid_revisions');
    expect(normalizeExportRevisions(123)).toBe('invalid_revisions');
    expect(normalizeExportRevisions('string')).toBe('invalid_revisions');
  });

  it('returns "invalid_revisions" for arrays containing invalid entries', () => {
    expect(normalizeExportRevisions([{}])).toBe('invalid_revisions');
    expect(normalizeExportRevisions([{ data: {} }, { label: 123 }])).toBe(
      'invalid_revisions',
    );
    expect(
      normalizeExportRevisions([{ data: {}, createdAt: new Date() }]),
    ).toBe('invalid_revisions');
    expect(normalizeExportRevisions([{ data: 'not-an-object' }])).toBe(
      'invalid_revisions',
    );
  });

  it('correctly normalizes valid revision arrays', () => {
    const revisions = [
      {
        label: 'Revision 1',
        data: { a: 1 },
        createdAt: '2023-01-01T00:00:00.000Z',
      },
      { data: { b: 2 } },
    ];
    const expected = [
      {
        label: 'Revision 1',
        data: { a: 1 },
        createdAt: '2023-01-01T00:00:00.000Z',
      },
      { data: { b: 2 } },
    ];
    expect(normalizeExportRevisions(revisions)).toEqual(expected);
  });
});

import type { RJSFSchema } from '@rjsf/utils';

describe('validateJsonImport', () => {
  const mockSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    required: ['name'],
  } as const satisfies RJSFSchema;

  it('returns a payload for valid JSON', () => {
    const validJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      validJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.error).toBe(null);
    expect(result.payload).toBeDefined();
    expect(result.payload?.formpack.id).toBe(PRIMARY_FORMPACK_ID);
  });

  it('returns an error for invalid JSON', () => {
    const result = validateJsonImport(
      '{ invalid json }',
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_json');
  });

  it('returns an error for a formpack ID mismatch', () => {
    const mismatchedJson = JSON.stringify({
      formpack: { id: SECONDARY_FORMPACK_ID },
      record: {
        locale: 'en',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      mismatchedJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('formpack_mismatch');
  });

  it('returns an error for a schema mismatch', () => {
    const schemaMismatchJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
        data: { name: 123 },
      },
    });

    const result = validateJsonImport(
      schemaMismatchJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('schema_mismatch');
  });

  it('returns an error for an unsupported locale', () => {
    const unsupportedLocaleJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'xx-XX',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      unsupportedLocaleJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('unsupported_locale');
  });
});
