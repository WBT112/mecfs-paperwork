// Tests for app/src/export/docx.ts
import { describe, it, expect } from 'vitest';
import { buildDocxExportFilename } from '../../../src/export/docx';

describe('app/src/export/docx.ts', () => {
  describe('buildDocxExportFilename()', () => {
    const testDate = new Date('2023-10-26T10:00:00Z');

    it('should generate a correctly formatted filename with valid inputs', () => {
      const filename = buildDocxExportFilename(
        'my-formpack',
        'a4',
        testDate,
      );
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
});
