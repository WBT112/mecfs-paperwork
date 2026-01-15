// Tests for app/src/export/docx.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { exportDocx } from '../../../src/export/docx';
import * as records from '../../../src/storage/records';
import * as loader from '../../../src/formpacks/loader';
import type { FormpackManifest } from '../../../src/formpacks/types';

describe('app/src/export/docx.ts', () => {
  describe('exportDocx()', () => {
    beforeEach(() => {
      // Mock dependencies to isolate the function
      vi.spyOn(records, 'getRecord').mockResolvedValue(null);
      vi.spyOn(loader, 'loadFormpackManifest').mockResolvedValue({
        id: 'test-formpack',
        version: '1.0.0',
        defaultLocale: 'en',
        locales: ['en'],
        titleKey: 'test-title',
        descriptionKey: 'test-description',
        exports: ['docx'],
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
