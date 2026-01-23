import { describe, expect, it, vi } from 'vitest';
import type { RJSFSchema } from '@rjsf/utils';
import {
  buildJsonExportFilename,
  buildJsonExportPayload,
  downloadJsonExport,
} from '../../src/export/json';
import type { RecordEntry, SnapshotEntry } from '../../src/storage/types';

const APP_ID = 'mecfs-paperwork';
const APP_VERSION = '0.0.0';
const FORMPACK_ID = 'notfallpass';
const EXPORT_BLOB_URL = 'blob:json-export';
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

  it('omits revisions when none are provided', () => {
    const recordData = { note: 'hello' };
    const record: RecordEntry = {
      id: 'record-3',
      formpackId: FORMPACK_ID,
      title: 'No revisions',
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
    });

    expect(payload.revisions).toBeUndefined();
  });
});

describe('buildJsonExportFilename', () => {
  it('sanitizes the record name and formats the export date', () => {
    const payload = {
      app: { id: APP_ID, version: APP_VERSION },
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record: {
        id: 'record-4',
        name: 'Hello World! 2024',
        updatedAt: UPDATED_AT,
        locale: 'de' as const,
        data: {},
      },
      locale: 'de' as const,
      exportedAt: '2024-02-03T10:11:12.000Z',
      data: {},
    };

    expect(buildJsonExportFilename(payload)).toBe(
      'notfallpass_Hello-World-2024_2024-02-03_de.json',
    );
  });

  it('falls back to the record id and current date when needed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-04T05:06:07.000Z'));

    const payload = {
      app: { id: APP_ID, version: APP_VERSION },
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record: {
        id: 'record-5',
        name: '!!!',
        updatedAt: UPDATED_AT,
        locale: 'de' as const,
        data: {},
      },
      locale: 'de' as const,
      exportedAt: 'not-a-date',
      data: {},
    };

    expect(buildJsonExportFilename(payload)).toBe(
      'notfallpass_record_2024-02-04_de.json',
    );

    vi.useRealTimers();
  });

  it('uses the record id when no name is provided', () => {
    const payload = {
      app: { id: APP_ID, version: APP_VERSION },
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record: {
        id: 'record-7',
        updatedAt: UPDATED_AT,
        locale: 'de' as const,
        data: {},
      },
      locale: 'de' as const,
      exportedAt: '2024-02-05T01:02:03.000Z',
      data: {},
    };

    expect(buildJsonExportFilename(payload)).toBe(
      'notfallpass_record-7_2024-02-05_de.json',
    );
  });
});

describe('downloadJsonExport', () => {
  it('creates a download link and revokes the object URL', () => {
    vi.useFakeTimers();
    const payload = {
      app: { id: APP_ID, version: APP_VERSION },
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record: {
        id: 'record-6',
        updatedAt: UPDATED_AT,
        locale: 'de' as const,
        data: {},
      },
      locale: 'de' as const,
      exportedAt: CREATED_AT,
      data: {},
    };

    const createUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue(EXPORT_BLOB_URL);
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const link = document.createElement('a');
    const clickSpy = vi.spyOn(link, 'click');
    const removeSpy = vi.spyOn(link, 'remove');
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName) =>
        tagName === 'a' ? link : originalCreateElement(tagName),
      );

    downloadJsonExport(payload, 'export.json');

    expect(createUrlSpy).toHaveBeenCalledTimes(1);
    expect(link.href).toBe(EXPORT_BLOB_URL);
    expect(link.download).toBe('export.json');
    expect(link.rel).toBe('noopener');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);

    vi.runAllTimers();

    expect(revokeSpy).toHaveBeenCalledWith(EXPORT_BLOB_URL);

    createUrlSpy.mockRestore();
    revokeSpy.mockRestore();
    createElementSpy.mockRestore();
    clickSpy.mockRestore();
    removeSpy.mockRestore();
    vi.useRealTimers();
  });
});
