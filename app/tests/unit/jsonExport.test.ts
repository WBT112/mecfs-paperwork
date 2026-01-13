import { describe, expect, it } from 'vitest';
import type { RJSFSchema } from '@rjsf/utils';
import { buildJsonExportPayload } from '../../src/export/json';
import type { RecordEntry, SnapshotEntry } from '../../src/storage/types';

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
      formpackId: 'notfallpass',
      title: 'Test record',
      locale: 'de',
      data: recordData,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
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
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];

    const payload = buildJsonExportPayload({
      formpack: { id: 'notfallpass', version: '0.1.0' },
      record,
      data: recordData,
      locale: 'de',
      revisions,
      schema,
    });

    const payloadData = payload.data as { person?: { birthDate?: string } };
    const revisionData = payload.revisions?.[0].data as {
      person?: { birthDate?: string };
    };

    expect(payloadData.person?.birthDate).toBe('1990-04-12');
    expect(revisionData?.person?.birthDate).toBe('1990-04-12');
  });
});
