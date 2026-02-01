import { describe, it, expect } from 'vitest';
import { buildDocxExportFilename } from '../../src/export/docx';

const DEFAULT_FILENAME = 'document-my-template-20231120.docx';

describe('buildDocxExportFilename', () => {
  it('sanitizes special characters from formpack and template IDs', () => {
    const formpackId = 'formpack/123?';
    const templateId = String.raw`template\456!`;
    const date = new Date('2024-01-01T12:00:00Z');
    const filename = buildDocxExportFilename(
      formpackId,
      templateId as any,
      date,
    );
    expect(filename).toBe('formpack-123-template-456!-20240101.docx');
  });

  it('trims whitespace, collapses repeated hyphens, and handles empty formpackId', () => {
    const formpackId = '  ';
    const templateId = '  my template  ';
    const date = new Date('2023-11-20T12:00:00Z');
    const filename = buildDocxExportFilename(
      formpackId,
      templateId as any,
      date,
    );
    expect(filename).toBe(DEFAULT_FILENAME);
  });

  it('handles null and undefined formpackId', () => {
    const templateId = 'my-template';
    const date = new Date('2023-11-20T12:00:00Z');
    const filenameNull = buildDocxExportFilename(
      null as any,
      templateId as any,
      date,
    );
    const filenameUndefined = buildDocxExportFilename(
      undefined as any,
      templateId as any,
      date,
    );
    expect(filenameNull).toBe(DEFAULT_FILENAME);
    expect(filenameUndefined).toBe(DEFAULT_FILENAME);
  });
});
