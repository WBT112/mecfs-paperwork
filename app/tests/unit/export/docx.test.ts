// Tests for app/src/export/docx.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  buildDocxExportFilename,
  exportDocx,
} from '../../../src/export/docx';
import * as records from '../../../src/storage/records';
import * as loader from '../../../src/formpacks/loader';

describe('app/src/export/docx.ts', () => {
  describe('buildDocxExportFilename()', () => {
    const testDate = new Date('2023-10-26T10:00:00Z');

    it('should generate a correctly formatted filename with valid inputs', () => {
      const filename = buildDocxExportFilename('my-formpack', 'a4', testDate);
      expect(filename).toBe('my-formpack-a4-20231026.docx');
    });

    it('should sanitize special characters from formpackId and templateId', () => {
      const filename = buildDocxExportFilename(
        ' formpack/123?*<>|\\ ',
        ' template/456?*<>|\\ ' as any,
        testDate,
      );
      expect(filename).toBe('formpack-123-template-456-20231026.docx');
    });

    it('should default to "document" for an empty or whitespace formpackId', () => {
      const filename1 = buildDocxExportFilename('', 'a4', testDate);
      expect(filename1).toBe('document-a4-20231026.docx');

      const filename2 = buildDocxExportFilename('   ', 'a4', testDate);
      expect(filename2).toBe('document-a4-20231026.docx');
    });

    it('should handle leading/trailing characters that become hyphens', () => {
      const filename = buildDocxExportFilename(
        '__formpack__',
        '**template**' as any,
        testDate,
      );
      expect(filename).toBe('formpack-template-20231026.docx');
    });
  });

  describe('exportDocx()', () => {
    beforeEach(() => {
      // Mock dependencies to isolate the function
      vi.spyOn(records, 'getRecord').mockResolvedValue(null);
      vi.spyOn(loader, 'loadFormpackManifest').mockResolvedValue({
        id: 'test-formpack',
        name: 'Test Formpack',
        version: '1.0.0',
        description: 'A test formpack',
        questions: [],
        docx: {
          mapping: 'docx/mapping.json',
          templates: {
            a4: 'docx/template-a4.docx',
          },
        },
      });
    });

    it('should throw an error with the record ID if the record is not found', async () => {
      const options = {
        formpackId: 'test-formpack',
        recordId: 'record-123',
        variant: 'a4' as const,
        locale: 'en' as const,
      };

      await expect(exportDocx(options)).rejects.toThrow(
        'Unable to load the requested record: record-123.',
      );
    });
  });
});
