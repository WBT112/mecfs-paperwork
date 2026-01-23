import { describe, expect, it } from 'vitest';
import type { RJSFSchema } from '@rjsf/utils';
import { buildJsonExportPayload } from '../../src/export/json';
import type { RecordEntry, SnapshotEntry } from '../../src/storage/types';

const FORMPACK_ID = 'notfallpass';
const CREATED_AT = '2024-01-01T00:00:00.000Z';
const UPDATED_AT = '2024-01-02T00:00:00.000Z';
const NORMALIZED_BIRTHDATE = '1990-04-12';

const schema: RJSFSchema = {
  type: 'object',
  properties: {
    person: {
      type: 'object',
      properties: {
        birthDate: {
          type: 'string',
          format: 'date',
        },
      },
    },
  },
};

describe('buildJsonExportPayload', () => {
  it('normalizes date-formatted fields in exports', () => {
    const recordData = {
      person: {
        birthDate: '12.04.1990',
      },
    };
    const record: RecordEntry = {
      id: 'record-1',
      formpackId: FORMPACK_ID,
      title: 'Test record',
      locale: 'de',
      data: recordData,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    };
    const revisions: SnapshotEntry[] = [
      {
        id: 'snapshot-1',
        recordId: record.id,
        label: 'Snapshot 1',
        data: {
          person: {
            birthDate: '1990/04/12',
          },
        },
        createdAt: CREATED_AT,
      },
    ];

    const payload = buildJsonExportPayload({
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record,
      data: recordData,
      locale: 'de',
      revisions,
      schema,
    });

    const payloadData = payload.data as { person?: { birthDate?: string } };
    const payloadRevisions = payload.revisions as Array<{ data: unknown }>;
    const revisionData = payloadRevisions[0].data as {
      person?: { birthDate?: string };
    };

    expect(payloadData.person?.birthDate).toBe(NORMALIZED_BIRTHDATE);
    expect(revisionData.person?.birthDate).toBe(NORMALIZED_BIRTHDATE);
  });

  it('normalizes date values in arrays and allOf schemas', () => {
    const arraySchema: RJSFSchema = {
      type: 'object',
      properties: {
        dates: {
          type: 'array',
          items: { type: 'string', format: 'date' },
        },
        altDate: {
          allOf: [{ type: 'string', format: 'date' }],
        },
      },
    };
    const recordData = {
      dates: ['2024/04/12', '12.04.2024', '2024-04-13'],
      altDate: '12.04.1990',
    };
    const record: RecordEntry = {
      id: 'record-2',
      formpackId: FORMPACK_ID,
      title: 'Test record',
      locale: 'de',
      data: recordData,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    };

    const payload = buildJsonExportPayload({
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record,
      data: recordData,
      locale: 'de',
      schema: arraySchema,
    });

    const payloadData = payload.data as {
      dates?: string[];
      altDate?: string;
    };

    expect(payloadData.dates).toEqual([
      '2024-04-12',
      '2024-04-12',
      '2024-04-13',
    ]);
    expect(payloadData.altDate).toBe(NORMALIZED_BIRTHDATE);
  });
});
