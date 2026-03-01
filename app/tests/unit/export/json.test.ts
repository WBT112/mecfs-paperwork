import { describe, it, expect, vi } from 'vitest';
import type { RJSFSchema } from '@rjsf/utils';
import {
  buildJsonExportFilename,
  buildJsonExportPayload,
  type JsonExportPayload,
} from '../../../src/export/json';

const TEST_TIMESTAMP = '2023-10-27T10:00:00Z';
const TEST_FORMPACK_ID = 'test-formpack';
const TEST_RECORD_ID = 'record-abc-123';

const BASE_FORMPACK = { id: TEST_FORMPACK_ID, version: '1.1.0' };
const BASE_RECORD = {
  id: TEST_RECORD_ID,
  formpackId: TEST_FORMPACK_ID,
  title: 'Record',
  updatedAt: TEST_TIMESTAMP,
  locale: 'de' as const,
  data: {},
  createdAt: TEST_TIMESTAMP,
};

describe('buildJsonExportFilename', () => {
  it('should generate a correctly formatted and sanitized filename', () => {
    const payload: JsonExportPayload = {
      app: { id: 'mecfs-paperwork', version: '1.0.0' },
      formpack: { id: TEST_FORMPACK_ID, version: '1.1.0' },
      record: {
        id: TEST_RECORD_ID,
        name: '  My/Test\\Record Name  ',
        updatedAt: TEST_TIMESTAMP,
        locale: 'en',
        data: {},
      },
      locale: 'de',
      exportedAt: TEST_TIMESTAMP,
      data: {},
    };

    const expected = 'test-formpack_MyTestRecord-Name_2023-10-27_de.json';
    const actual = buildJsonExportFilename(payload);

    expect(actual).toBe(expected);
  });

  it('should use the record ID if the record name is missing', () => {
    const payload: JsonExportPayload = {
      app: { id: 'mecfs-paperwork', version: '1.0.0' },
      formpack: { id: TEST_FORMPACK_ID, version: '1.1.0' },
      record: {
        id: TEST_RECORD_ID,
        updatedAt: TEST_TIMESTAMP,
        locale: 'en',
        data: {},
      },
      locale: 'de',
      exportedAt: TEST_TIMESTAMP,
      data: {},
    };

    const expected = 'test-formpack_record-abc-123_2023-10-27_de.json';
    const actual = buildJsonExportFilename(payload);

    expect(actual).toBe(expected);
  });
});

describe('buildJsonExportPayload', () => {
  it('keeps invalid date-like values and unknown date formats unchanged', () => {
    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        slashDate: { type: 'string', format: 'date' },
        dotDate: { type: 'string', format: 'date' },
        freeTextDate: { type: 'string', format: 'date' },
      },
    };

    const payload = buildJsonExportPayload({
      formpack: BASE_FORMPACK,
      record: BASE_RECORD,
      data: {
        slashDate: '2024/02/31',
        dotDate: '31.02.2024',
        freeTextDate: 'next week',
      },
      locale: 'de',
      schema,
      exportedAt: TEST_TIMESTAMP,
    });

    expect(payload.data).toMatchObject({
      slashDate: '2024/02/31',
      dotDate: '31.02.2024',
      freeTextDate: 'next week',
    });
  });

  it('falls back to the original data when normalization result is not a record', () => {
    const schemaWithBooleanItems = {
      type: 'array',
      items: true,
    };
    const arrayData = ['2024/01/01', '31.01.2024'] as unknown as Record<
      string,
      unknown
    >;

    const payload = buildJsonExportPayload({
      formpack: BASE_FORMPACK,
      record: {
        ...BASE_RECORD,
        data: arrayData,
      },
      data: arrayData,
      locale: 'de',
      schema: schemaWithBooleanItems as unknown as Parameters<
        typeof buildJsonExportPayload
      >[0]['schema'],
      exportedAt: TEST_TIMESTAMP,
    });

    expect(payload.data).toBe(arrayData);
    expect(payload.record.data).toBe(arrayData);
  });

  it('uses 0.0.0 when app package version is unavailable', async () => {
    vi.resetModules();
    vi.doMock('../../../package.json', () => ({
      default: {},
    }));

    try {
      const jsonModule = await import('../../../src/export/json');
      const payload = jsonModule.buildJsonExportPayload({
        formpack: BASE_FORMPACK,
        record: BASE_RECORD,
        data: {},
        locale: 'de',
        exportedAt: TEST_TIMESTAMP,
      });

      expect(payload.app.version).toBe('0.0.0');
    } finally {
      vi.doUnmock('../../../package.json');
      vi.resetModules();
    }
  });
});
