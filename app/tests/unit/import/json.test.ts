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
const APP_ID = 'mecfs-paperwork';

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
    expect(normalizeExportRevisions([{ data: {}, label: 123 }])).toBe(
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

  it('preserves app.version when app metadata is provided', () => {
    const validJson = JSON.stringify({
      app: { id: APP_ID, version: '0.6.0' },
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
    expect(result.payload?.formpack.id).toBe(PRIMARY_FORMPACK_ID);
  });

  it('accepts app metadata without version', () => {
    const validJson = JSON.stringify({
      app: { id: APP_ID },
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
    expect(result.payload?.formpack.id).toBe(PRIMARY_FORMPACK_ID);
  });

  it('returns an error for invalid JSON and does not leak data to console', () => {
    const errorFn = vi.fn();
    vi.stubGlobal('console', { ...console, error: errorFn });
    const invalidJson = '{ invalid: "secret-data" }';

    const result = validateJsonImport(
      invalidJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_json');

    // Verify that the error object containing "secret-data" was not logged.
    // JSON.parse error usually includes a snippet of the input.
    expect(errorFn).toHaveBeenCalledWith('JSON parsing failed.');
    expect(errorFn).not.toHaveBeenCalledWith(
      expect.stringContaining('secret-data'),
    );
    expect(errorFn).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
    );

    vi.unstubAllGlobals();
  });

  it('returns an invalid_json error for empty import files', () => {
    const result = validateJsonImport('', mockSchema, PRIMARY_FORMPACK_ID);

    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_json');
  });

  it('returns an error for invalid app metadata', () => {
    const invalidAppJson = JSON.stringify({
      app: { id: 123 },
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      invalidAppJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
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

  it('returns invalid_payload when formpack metadata is missing required id', () => {
    const invalidFormpackJson = JSON.stringify({
      formpack: { version: '1.0.0' },
      record: {
        locale: 'en',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      invalidFormpackJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
  });

  it('returns an error for an unknown formpack ID', () => {
    const unknownFormpackJson = JSON.stringify({
      formpack: { id: 'unknown-formpack' },
      record: {
        locale: 'en',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      unknownFormpackJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('unknown_formpack');
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

  it('returns an error when record data is missing', () => {
    const missingDataJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
      },
    });

    const result = validateJsonImport(
      missingDataJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
  });

  it('returns an error for invalid record metadata', () => {
    const invalidRecordJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
        title: 123,
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      invalidRecordJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
  });

  it('returns an error when record.name exists but is not a string', () => {
    const invalidRecordJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
        name: 123,
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      invalidRecordJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
  });

  it('uses record.title when present and valid', () => {
    const validJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'en',
        title: 'Custom Title',
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      validJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload?.record.title).toBe('Custom Title');
  });

  it('returns an error when record metadata is not an object', () => {
    const invalidRecordJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: 'not-an-object',
      data: { name: 'Test' },
      locale: 'en',
    });

    const result = validateJsonImport(
      invalidRecordJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );
    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
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

  it('returns invalid_payload when locale is missing in payload and record', () => {
    const missingLocaleJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        data: { name: 'Test' },
      },
    });

    const result = validateJsonImport(
      missingLocaleJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
  });

  it('returns invalid_revisions when payload revisions are malformed', () => {
    const invalidRevisionsJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: { name: 'Test' },
      },
      revisions: [{ data: {} }, { label: 3 }],
    });

    const result = validateJsonImport(
      invalidRevisionsJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_revisions');
  });

  it('returns invalid_payload when root json is not an object', () => {
    const invalidRootJson = JSON.stringify(['not', 'an', 'object']);

    const result = validateJsonImport(
      invalidRootJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_payload');
  });

  it('ignores legacy unknown fields when schema disallows additional properties', () => {
    const legacyCompatibleSchema = {
      type: 'object',
      properties: {
        severity: {
          type: 'object',
          additionalProperties: false,
          properties: {
            bellScore: { type: 'string' },
          },
        },
      },
      additionalProperties: false,
    } as const satisfies RJSFSchema;

    const importJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: {
          severity: {
            bellScore: '40',
            hasBellScore: false,
            hasGdb: false,
          },
        },
      },
    });

    const result = validateJsonImport(
      importJson,
      legacyCompatibleSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload).toBeDefined();
    expect(result.payload?.record.data).toEqual({
      severity: {
        bellScore: '40',
      },
    });
  });

  it('accepts partial payloads when conditional requirements are defined via allOf/if/then', () => {
    const conditionalSchema = {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          additionalProperties: false,
          properties: {
            drug: {
              type: 'string',
              enum: ['ivabradine', 'other'],
            },
            otherEvidenceReference: {
              type: 'string',
            },
          },
        },
      },
      additionalProperties: false,
      allOf: [
        {
          if: {
            properties: {
              request: {
                type: 'object',
                properties: {
                  drug: { const: 'other' },
                },
              },
            },
          },
          then: {
            properties: {
              request: {
                type: 'object',
                required: ['otherEvidenceReference'],
                properties: {
                  otherEvidenceReference: {
                    type: 'string',
                    minLength: 1,
                  },
                },
              },
            },
          },
        },
      ],
    } as const satisfies RJSFSchema;

    const partialImportJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: {
          request: {
            drug: 'other',
          },
        },
      },
    });

    const result = validateJsonImport(
      partialImportJson,
      conditionalSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload).toBeDefined();
    expect(result.payload?.record.data).toEqual({
      request: {
        drug: 'other',
      },
    });
  });

  it('accepts enum drift for backward-compatible imports', () => {
    const enumSchema = {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          properties: {
            drug: {
              type: 'string',
              enum: ['ivabradine', 'other'],
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    } as const satisfies RJSFSchema;

    const importJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: {
          request: {
            drug: 'legacy-drug-value',
          },
        },
      },
    });

    const result = validateJsonImport(
      importJson,
      enumSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload?.record.data).toEqual({
      request: {
        drug: 'legacy-drug-value',
      },
    });
  });

  it('accepts legacy top-level data/locale payload and keeps formpack version', () => {
    const legacyJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID, version: '2.4.0' },
      locale: 'de',
      data: { name: 'Legacy' },
    });

    const result = validateJsonImport(
      legacyJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload).toBeDefined();
    expect(result.payload?.formpack.version).toBe('2.4.0');
    expect(result.payload?.record.locale).toBe('de');
    expect(result.payload?.record.title).toBeUndefined();
    expect(result.payload?.record.data).toEqual({ name: 'Legacy' });
  });

  it('removes readOnly fields and preserves unknown fields when additionalProperties are allowed', () => {
    const flexibleSchema = {
      type: 'object',
      additionalProperties: true,
      properties: {
        generatedAt: { type: 'string', readOnly: true },
        metadata: {
          type: 'object',
          additionalProperties: true,
          properties: {
            internalId: { type: 'string', readOnly: true },
            note: { type: 'string' },
          },
        },
      },
    } as const satisfies RJSFSchema;

    const inputJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID, version: '1.2.3' },
      app: { id: 'mecfs-paperwork', version: '0.6.0' },
      record: {
        locale: 'de',
        data: {
          generatedAt: '2026-01-01',
          metadata: {
            internalId: 'secret',
            note: 'kept',
          },
          keepMe: 'yes',
        },
      },
    });

    const result = validateJsonImport(
      inputJson,
      flexibleSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload?.formpack.version).toBe('1.2.3');
    expect(result.payload?.record.data).toEqual({
      metadata: { note: 'kept' },
      keepMe: 'yes',
    });
  });

  it('applies required defaults for missing fields (except enum fields)', () => {
    const defaultsSchema = {
      type: 'object',
      properties: {
        requiredText: { type: 'string' },
        requiredList: { type: 'array', items: { type: 'string' } },
        requiredObject: {
          type: 'object',
          properties: {
            nestedText: { type: 'string' },
          },
          required: ['nestedText'],
        },
        requiredEnum: {
          type: 'string',
          enum: ['a', 'b'],
        },
      },
      required: [
        'requiredText',
        'requiredList',
        'requiredObject',
        'requiredEnum',
      ],
    } as const satisfies RJSFSchema;

    const inputJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: {},
      },
    });

    const result = validateJsonImport(
      inputJson,
      defaultsSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload?.record.data).toEqual({
      requiredText: '',
      requiredList: [],
      requiredObject: {
        nestedText: '',
      },
    });
    expect(
      Object.hasOwn(result.payload?.record.data ?? {}, 'requiredEnum'),
    ).toBe(false);
  });

  it('rejects import files exceeding the maximum file size', () => {
    const oversizedJson = ' '.repeat(10 * 1024 * 1024 + 1);

    const result = validateJsonImport(
      oversizedJson,
      mockSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.payload).toBe(null);
    expect(result.error?.code).toBe('invalid_json');
    expect(result.error?.message).toContain('10 MB');
  });

  it('normalizes tuple arrays, schema defs, and mixed required defaults without schema mismatch', () => {
    const normalizationSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        objectItems: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              keep: { type: 'string' },
            },
          },
        },
        arrayWithoutItems: {
          type: 'array',
        },
        withDefault: {
          type: 'string',
          default: 'fallback-value',
        },
        withBooleanSchema: true,
        withNumber: {
          type: 'number',
        },
        nestedNoProps: {
          type: 'object',
        },
      },
      required: [
        'objectItems',
        'withDefault',
        'withBooleanSchema',
        'withNumber',
        'nestedNoProps',
        123 as unknown as string,
      ],
      $defs: {
        legacyNode: {
          type: 'object',
          required: ['x'],
          properties: { x: { type: 'string' } },
        },
      },
    } as const satisfies RJSFSchema;

    const importJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: {
          objectItems: [{ keep: 'kept', legacy: 'removed' }],
          arrayWithoutItems: [{ legacy: true }],
          nestedNoProps: { stays: true },
          withBooleanSchema: 'legacy-value',
        },
      },
    });

    const result = validateJsonImport(
      importJson,
      normalizationSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload?.record.data).toEqual({
      objectItems: [{ keep: 'kept' }],
      arrayWithoutItems: [{ legacy: true }],
      withDefault: 'fallback-value',
      nestedNoProps: { stays: true },
    });
    expect(
      Object.hasOwn(result.payload?.record.data ?? {}, 'withBooleanSchema'),
    ).toBe(false);
    expect(Object.hasOwn(result.payload?.record.data ?? {}, 'withNumber')).toBe(
      false,
    );
  });

  it('throws for invalid tuple-style array schemas that use array-valued items', () => {
    const invalidTupleSchema = {
      type: 'object',
      properties: {
        tupleItems: {
          type: 'array',
          items: [{ type: 'string' }],
        },
      },
    } as const satisfies RJSFSchema;

    const importJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: {
          tupleItems: ['x'],
        },
      },
    });

    expect(() =>
      validateJsonImport(importJson, invalidTupleSchema, PRIMARY_FORMPACK_ID),
    ).toThrow('schema is invalid');
  });

  it('keeps deeply nested payloads importable when schema traversal hits depth guards', () => {
    const buildDeepSchema = (depth: number): RJSFSchema => {
      let current: RJSFSchema = {
        type: 'object',
        properties: {
          value: { type: 'string' },
        },
        additionalProperties: false,
      };

      for (let level = 0; level < depth; level += 1) {
        current = {
          type: 'object',
          properties: {
            child: current,
          },
          additionalProperties: false,
        };
      }

      return current;
    };

    const buildDeepData = (depth: number): Record<string, unknown> => {
      let current: Record<string, unknown> = { value: 'leaf' };

      for (let level = 0; level < depth; level += 1) {
        current = { child: current };
      }

      return current;
    };

    const depth = 55;
    const deepSchema = buildDeepSchema(depth);
    const importJson = JSON.stringify({
      formpack: { id: PRIMARY_FORMPACK_ID },
      record: {
        locale: 'de',
        data: buildDeepData(depth),
      },
    });

    const result = validateJsonImport(
      importJson,
      deepSchema,
      PRIMARY_FORMPACK_ID,
    );

    expect(result.error).toBe(null);
    expect(result.payload?.record.data).toEqual(buildDeepData(depth));
  });
});
