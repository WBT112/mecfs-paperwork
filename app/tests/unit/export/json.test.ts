import { describe, it, expect } from 'vitest';
import {
  buildJsonExportFilename,
  type JsonExportPayload,
} from '../../../src/export/json';

const TEST_TIMESTAMP = '2023-10-27T10:00:00Z';

describe('buildJsonExportFilename', () => {
  it('should generate a correctly formatted and sanitized filename', () => {
    const payload: JsonExportPayload = {
      app: { id: 'mecfs-paperwork', version: '1.0.0' },
      formpack: { id: 'test-formpack', version: '1.1.0' },
      record: {
        id: 'record-abc-123',
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
      formpack: { id: 'test-formpack', version: '1.1.0' },
      record: {
        id: 'record-abc-123',
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
