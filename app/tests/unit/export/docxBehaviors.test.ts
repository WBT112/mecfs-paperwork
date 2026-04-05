// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  mapDocumentDataToTemplate,
  loadDocxTemplate,
  getDocxErrorKey,
} from '../../../src/export/docx';
import { OFFLABEL_ANTRAG_FORMPACK_ID } from '../../../src/formpacks/formpackIds';
import type { DocumentModel } from '../../../src/formpacks/documentModel';

const INVALID_PATH_ERROR = 'Invalid DOCX template path.';
const PERSON_NAME_PATH = 'person.name';

const MOCK_DOCUMENT_MODEL: DocumentModel = {
  diagnosisParagraphs: [],
  person: { name: 'Test', birthDate: '2000-01-01' },
  contacts: [],
  diagnoses: { formatted: 'None' },
  symptoms: '',
  medications: [],
  allergies: '',
  doctor: { name: 'Dr. Test', phone: '12345' },
};

describe('docx behaviors', () => {
  describe('path safety', () => {
    it('throws for absolute asset paths', async () => {
      await expect(
        loadDocxTemplate('test-path-1', '/absolute/path'),
      ).rejects.toThrow(INVALID_PATH_ERROR);
    });

    it('throws for paths with directory traversal', async () => {
      await expect(
        loadDocxTemplate('test-path-2', '../traversal'),
      ).rejects.toThrow(INVALID_PATH_ERROR);
    });

    it('throws for empty or whitespace-only paths', async () => {
      await expect(loadDocxTemplate('test-path-3', '')).rejects.toThrow(
        INVALID_PATH_ERROR,
      );
      await expect(loadDocxTemplate('test-path-4', '   ')).rejects.toThrow(
        INVALID_PATH_ERROR,
      );
    });
  });

  describe('mapping validation', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('filters out invalid fields and loops in mapping', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          fields: [
            { var: 'valid', path: PERSON_NAME_PATH },
            { var: '', path: PERSON_NAME_PATH },
            { var: 'valid', path: '  ' },
            null,
          ],
          loops: [{ var: 'loop', path: 'contacts' }, { var: 'loop' }],
        }),
      } as Response);

      const context = await mapDocumentDataToTemplate(
        'test-filter',
        'a4',
        MOCK_DOCUMENT_MODEL,
      );
      expect(context.valid).toBe('Test');
      expect(context.loop).toEqual([]);
    });

    it('handles mapping with optional loops and i18n prefix', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          fields: [{ var: 'test', path: PERSON_NAME_PATH }],
          i18n: { prefix: 'custom' },
        }),
      } as Response);

      const context = await mapDocumentDataToTemplate(
        'test-optional',
        'a4',
        MOCK_DOCUMENT_MODEL,
      );
      expect(context.test).toBe('Test');
    });

    it('throws when mapping version is unsupported', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 2,
          fields: [{ var: 't', path: 'p' }],
        }),
      } as Response);

      await expect(
        mapDocumentDataToTemplate('test-version', 'a4', MOCK_DOCUMENT_MODEL),
      ).rejects.toThrow('Unsupported DOCX mapping version: 2.');
    });

    it('throws when mapping has no valid fields', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          fields: [],
        }),
      } as Response);

      await expect(
        mapDocumentDataToTemplate('test-no-fields', 'a4', MOCK_DOCUMENT_MODEL),
      ).rejects.toThrow(
        'DOCX mapping payload must contain at least one valid field mapping.',
      );
    });

    it('throws when mapping payload is not a record', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => null,
      } as Response);

      await expect(
        mapDocumentDataToTemplate('test-null', 'a4', MOCK_DOCUMENT_MODEL),
      ).rejects.toThrow('Invalid DOCX mapping payload.');
    });
  });

  describe('logic branches and helpers', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles missing schema and uiSchema gracefully in mapDocumentDataToTemplate', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          fields: [{ var: 'name', path: PERSON_NAME_PATH }],
        }),
      } as Response);

      const context = await mapDocumentDataToTemplate(
        'test-missing-schemas',
        'a4',
        MOCK_DOCUMENT_MODEL,
        { schema: null, uiSchema: null },
      );
      expect(context.name).toBe('Test');
    });

    it('handles record loop entries correctly', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          fields: [{ var: 'unused', path: PERSON_NAME_PATH }],
          loops: [{ var: 'contactsVar', path: 'contacts' }],
        }),
      } as Response);

      const documentWithContacts = {
        ...MOCK_DOCUMENT_MODEL,
        contacts: [{ name: 'Sam', phone: '555', relation: 'Friend' }],
      };

      const context = await mapDocumentDataToTemplate(
        'test-record-loops',
        'a4',
        documentWithContacts,
      );
      expect(context.contactsVar).toEqual([
        { name: 'Sam', phone: '555', relation: 'Friend' },
      ]);
    });

    it('triggers offlabel liability fallback logic and hasMappedPath loops branch', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 1,
          fields: [{ var: 'unused', path: PERSON_NAME_PATH }],
          loops: [{ var: 'loop', path: 'arzt.liabilityParagraphs' }],
        }),
      } as Response);

      const offlabelData = {
        ...MOCK_DOCUMENT_MODEL,
        arzt: {
          paragraphs: ['Part 2'],
          liabilityParagraphs: ['Liability'],
        },
      };

      const context = await mapDocumentDataToTemplate(
        OFFLABEL_ANTRAG_FORMPACK_ID,
        'a4',
        offlabelData as any,
      );

      // shouldEmbedOfflabelLiabilityFallback should be false because liabilityParagraphs is mapped
      // and hasMappedPath should have traversed the loops branch
      expect(context.arzt).toBeUndefined(); // It was not appended to arzt.paragraphs
      expect(context.loop).toEqual(['Liability']);
    });
  });

  describe('error handling', () => {
    it('handles unexpected error types gracefully in getDocxErrorKey', () => {
      const errorFn = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Null error
      expect(getDocxErrorKey(null)).toBe('formpackDocxExportError');
      expect(errorFn).toHaveBeenCalledWith(
        'An unknown DOCX export error occurred.',
      );

      // Plain object without message
      errorFn.mockClear();
      expect(getDocxErrorKey({})).toBe('formpackDocxExportError');
      expect(errorFn).toHaveBeenCalledWith(
        'An unknown DOCX export error occurred.',
      );

      errorFn.mockRestore();
    });

    it('coerces non-Error objects with message in getDocxErrorKey', () => {
      const errorFn = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fakeError = { message: 'Something went wrong', name: 'FakeError' };

      expect(getDocxErrorKey(fakeError)).toBe('formpackDocxExportError');
      // Should log the name from the coerced error
      expect(errorFn).toHaveBeenCalledWith(
        'A DOCX export error occurred (type: TypeError).',
      );

      errorFn.mockRestore();
    });

    it('maps TemplateParseError and CommandSyntaxError to invalid syntax key', () => {
      const error1 = new Error('Parse failed');
      error1.name = 'TemplateParseError';
      expect(getDocxErrorKey(error1)).toBe('formpackDocxErrorInvalidSyntax');

      const error2 = new Error('Syntax failed');
      error2.name = 'CommandSyntaxError';
      expect(getDocxErrorKey(error2)).toBe('formpackDocxErrorInvalidSyntax');

      const error3 = new Error('If block failed');
      error3.name = 'IncompleteConditionalStatementError';
      expect(getDocxErrorKey(error3)).toBe('formpackDocxErrorIncompleteIf');
    });
  });
});
