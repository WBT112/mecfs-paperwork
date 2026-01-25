import { describe, it, expect, test } from 'vitest';
import { buildJsonExportPayload } from '../../src/export/json';
import { validateJsonImport } from '../../src/import/json';
import type { RecordEntry } from '../../src/storage/types';
import type { RJSFSchema } from '@rjsf/utils';

// Load the doctor-letter schema
import doctorLetterSchema from '../../../formpacks/doctor-letter/schema.json';

const FORMPACK_ID = 'doctor-letter';

describe('Doctor-Letter JSON Export/Import Roundtrip', () => {
  const FORMPACK_VERSION = '0.1.0';

  const createMockRecord = (data: Record<string, unknown>): RecordEntry => ({
    id: 'test-record-id',
    formpackId: FORMPACK_ID,
    title: 'Test Patient',
    locale: 'de',
    data,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  });

  it('should export and re-import doctor-letter with enum string values (Case 3: COVID-19)', () => {
    const testData = {
      patient: {
        firstName: 'Max',
        lastName: 'Mustermann',
        streetAndNumber: 'Musterstraße 123',
        postalCode: '12345',
        city: 'Berlin',
      },
      doctor: {
        practice: 'Praxis Dr. Schmidt',
        title: 'Dr.',
        gender: 'Frau',
        name: 'Schmidt',
        streetAndNumber: 'Ärzteweg 1',
        postalCode: '12345',
        city: 'Berlin',
      },
      decision: {
        q1: 'yes',
        q2: 'yes',
        q3: 'yes',
        q4: 'COVID-19',
        resolvedCaseText:
          'Der Patient weist ein vollständiges ME/CFS-Bild auf...',
      },
    };

    const record = createMockRecord(testData);

    // Export
    const exportPayload = buildJsonExportPayload({
      formpack: { id: FORMPACK_ID, version: FORMPACK_VERSION },
      record,
      data: testData,
      locale: 'de',
      schema: doctorLetterSchema as unknown as RJSFSchema,
    });

    // Verify export structure
    expect(exportPayload.formpack.id).toBe(FORMPACK_ID);
    expect(exportPayload.record.data.decision).toEqual(testData.decision);

    // Convert to JSON string (simulating file save/load)
    const exportedJson = JSON.stringify(exportPayload, null, 2);

    // Re-import
    const importResult = validateJsonImport(
      exportedJson,
      doctorLetterSchema as unknown as RJSFSchema,
      FORMPACK_ID,
    );

    // Verify import succeeds
    expect(importResult.error).toBeNull();
    expect(importResult.payload).not.toBeNull();

    if (importResult.payload) {
      expect(importResult.payload.formpack.id).toBe(FORMPACK_ID);
      expect(importResult.payload.record.locale).toBe('de');

      // Verify decision tree data is preserved
      const importedDecision = importResult.payload.record.data
        .decision as Record<string, unknown>;
      expect(importedDecision.q1).toBe('yes');
      expect(importedDecision.q2).toBe('yes');
      expect(importedDecision.q3).toBe('yes');
      expect(importedDecision.q4).toBe('COVID-19');
    }
  });

  it('should export and re-import doctor-letter with q1=no path (Case 0)', () => {
    const testData = {
      patient: {
        firstName: 'Anna',
        lastName: 'Beispiel',
        streetAndNumber: 'Beispielweg 456',
        postalCode: '54321',
        city: 'Hamburg',
      },
      doctor: {
        practice: 'Praxis Dr. Müller',
        title: 'Dr.',
        gender: 'Herr',
        name: 'Müller',
        streetAndNumber: 'Arztstraße 2',
        postalCode: '54321',
        city: 'Hamburg',
      },
      decision: {
        q1: 'no',
        q6: 'no',
        resolvedCaseText: 'Fall 0...',
      },
    };

    const record = createMockRecord(testData);

    // Export
    const exportPayload = buildJsonExportPayload({
      formpack: { id: FORMPACK_ID, version: FORMPACK_VERSION },
      record,
      data: testData,
      locale: 'de',
      schema: doctorLetterSchema as unknown as RJSFSchema,
    });

    const exportedJson = JSON.stringify(exportPayload, null, 2);

    // Re-import
    const importResult = validateJsonImport(
      exportedJson,
      doctorLetterSchema as unknown as RJSFSchema,
      FORMPACK_ID,
    );

    // Verify import succeeds
    expect(importResult.error).toBeNull();
    expect(importResult.payload).not.toBeNull();

    if (importResult.payload) {
      const importedDecision = importResult.payload.record.data
        .decision as Record<string, unknown>;
      expect(importedDecision.q1).toBe('no');
      expect(importedDecision.q6).toBe('no');
    }
  });

  it('should export and re-import doctor-letter with complete no-path (Case 5: EBV)', () => {
    const testData = {
      patient: {
        firstName: 'Test',
        lastName: 'User',
        streetAndNumber: 'Test St 1',
        postalCode: '11111',
        city: 'TestCity',
      },
      doctor: {
        practice: 'Test Practice',
        title: 'Dr.',
        gender: 'Frau',
        name: 'TestDoctor',
        streetAndNumber: 'Doctor St 1',
        postalCode: '11111',
        city: 'TestCity',
      },
      decision: {
        q1: 'no',
        q6: 'yes',
        q7: 'yes',
        q8: 'EBV',
        resolvedCaseText: 'Der Patient zeigt chronische Müdigkeit...',
      },
    };

    const record = createMockRecord(testData);

    // Export
    const exportPayload = buildJsonExportPayload({
      formpack: { id: FORMPACK_ID, version: FORMPACK_VERSION },
      record,
      data: testData,
      locale: 'de',
      schema: doctorLetterSchema as unknown as RJSFSchema,
    });

    const exportedJson = JSON.stringify(exportPayload, null, 2);

    // Re-import
    const importResult = validateJsonImport(
      exportedJson,
      doctorLetterSchema as unknown as RJSFSchema,
      FORMPACK_ID,
    );

    // Verify import succeeds
    expect(importResult.error).toBeNull();
    expect(importResult.payload).not.toBeNull();

    if (importResult.payload) {
      const importedDecision = importResult.payload.record.data
        .decision as Record<string, unknown>;
      expect(importedDecision.q1).toBe('no');
      expect(importedDecision.q6).toBe('yes');
      expect(importedDecision.q7).toBe('yes');
      expect(importedDecision.q8).toBe('EBV');
    }
  });

  it('should handle all enum values (yes/no) correctly', () => {
    const testData = {
      patient: {
        firstName: 'Enum',
        lastName: 'Test',
        streetAndNumber: 'Enum St 1',
        postalCode: '22222',
        city: 'EnumCity',
      },
      doctor: {
        practice: 'Enum Practice',
        title: 'Dr.',
        gender: 'Herr',
        name: 'EnumDoctor',
        streetAndNumber: 'Enum Dr St 1',
        postalCode: '22222',
        city: 'EnumCity',
      },
      decision: {
        q1: 'yes',
        q2: 'no',
        resolvedCaseText: 'Fall 11...',
      },
    };

    const record = createMockRecord(testData);

    const exportPayload = buildJsonExportPayload({
      formpack: { id: FORMPACK_ID, version: FORMPACK_VERSION },
      record,
      data: testData,
      locale: 'de',
      schema: doctorLetterSchema as unknown as RJSFSchema,
    });

    const exportedJson = JSON.stringify(exportPayload, null, 2);
    const importResult = validateJsonImport(
      exportedJson,
      doctorLetterSchema as unknown as RJSFSchema,
      FORMPACK_ID,
    );

    expect(importResult.error).toBeNull();
    expect(importResult.payload).not.toBeNull();

    if (importResult.payload) {
      const importedDecision = importResult.payload.record.data
        .decision as Record<string, unknown>;
      expect(importedDecision.q1).toBe('yes');
      expect(importedDecision.q2).toBe('no');
    }
  });

  test('should strip readOnly fields (resolvedCaseText) during import', async () => {
    // Simulate an export that includes the auto-generated resolvedCaseText
    const exportedJson = {
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record: {
        locale: 'de',
        data: {
          patient: {},
          doctor: {},
          decision: {
            q1: 'no',
            q6: 'yes',
            q7: 'yes',
            q8: 'EBV',
            resolvedCaseText:
              'Fall 5 - Der Patient zeigt chronische Müdigkeit und Post-Exertional Malaise nach einer EBV-Infektion.',
          },
        },
      },
    };

    const jsonString = JSON.stringify(exportedJson);
    const importResult = validateJsonImport(
      jsonString,
      doctorLetterSchema as RJSFSchema,
      FORMPACK_ID,
    );

    // Import should succeed despite readOnly field in exported data
    expect(importResult.error).toBeNull();
    expect(importResult.payload).not.toBeNull();

    if (importResult.payload) {
      const importedDecision = importResult.payload.record.data
        .decision as Record<string, unknown>;
      // Enum values should be preserved
      expect(importedDecision.q1).toBe('no');
      expect(importedDecision.q6).toBe('yes');
      expect(importedDecision.q7).toBe('yes');
      expect(importedDecision.q8).toBe('EBV');
      // ReadOnly field should be stripped during import
      expect(importedDecision.resolvedCaseText).toBeUndefined();
    }
  });

  test('should import partial data with empty patient/doctor objects', async () => {
    // User's exact scenario: export with partially filled decision tree
    // and empty patient/doctor objects (missing required fields)
    const exportedJson = {
      app: { id: 'mecfs-paperwork', version: '0.0.0' },
      formpack: { id: FORMPACK_ID, version: '0.1.0' },
      record: {
        id: 'c49acbdb-50dd-4bdd-8381-33da9bbbd371',
        name: 'Arztbrief',
        updatedAt: '2026-01-25T09:24:39.292Z',
        locale: 'de',
        data: {
          patient: {}, // Empty - missing required firstName, lastName
          doctor: {}, // Empty - missing required practice, name, title, gender
          decision: {
            q1: 'no',
            q6: 'yes',
            resolvedCaseText: 'Fall 0 - ...',
          },
        },
      },
      locale: 'de',
      exportedAt: '2026-01-25T09:31:44.861Z',
      data: {
        patient: {},
        doctor: {},
        decision: {
          q1: 'no',
          q6: 'yes',
          resolvedCaseText: 'Fall 0 - ...',
        },
      },
    };

    const jsonString = JSON.stringify(exportedJson);
    const importResult = validateJsonImport(
      jsonString,
      doctorLetterSchema as RJSFSchema,
      FORMPACK_ID,
    );

    // Import should succeed - lenient schema validation allows partial data
    expect(importResult.error).toBeNull();
    expect(importResult.payload).not.toBeNull();

    if (importResult.payload) {
      const importedData = importResult.payload.record.data;
      const importedPatient = importedData.patient as Record<string, unknown>;
      const importedDoctor = importedData.doctor as Record<string, unknown>;
      const importedDecision = importedData.decision as Record<string, unknown>;

      // Empty objects are preserved (lenient validation allows incomplete data)
      expect(Object.keys(importedPatient).length).toBe(0);
      expect(Object.keys(importedDoctor).length).toBe(0);

      // Decision data preserved
      expect(importedDecision.q1).toBe('no');
      expect(importedDecision.q6).toBe('yes');
      // ReadOnly field stripped
      expect(importedDecision.resolvedCaseText).toBeUndefined();
    }
  });
});
