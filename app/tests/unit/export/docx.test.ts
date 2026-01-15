import { describe, it, expect } from 'vitest';
import { buildDocxExportFilename } from '../../../src/export/docx';

describe('buildDocxExportFilename', () => {
  const testDate = new Date('2023-10-27T10:00:00Z');

  it('should correctly sanitize various problematic inputs for filename parts', () => {
    // Baseline with clean inputs
    expect(buildDocxExportFilename('formpack-id', 'a4', testDate)).toBe(
      'formpack-id-a4-20231027.docx',
    );

    // Handles various illegal characters and whitespace sequences
    expect(
      buildDocxExportFilename('  a b/c\\d:e*f?g"h<i>j|k_l ', 'a4', testDate),
    ).toBe('a-b-c-d-e-f-g-h-i-j-k-l-a4-20231027.docx');

    // Fallback for formpackId that sanitizes to an empty string
    expect(buildDocxExportFilename(' :/\\*?"<>|_ ', 'a4', testDate)).toBe(
      'document-a4-20231027.docx',
    );

    // Correctly removes leading/trailing hyphens that result from sanitization
    expect(buildDocxExportFilename('/formpack/', 'a4', testDate)).toBe(
      'formpack-a4-20231027.docx',
    );

    // Truncates overlong parts to 80 characters
    const longPart = 'a'.repeat(100);
    const truncatedPart = 'a'.repeat(80);
    expect(buildDocxExportFilename(longPart, 'a4', testDate)).toBe(
      `${truncatedPart}-a4-20231027.docx`,
    );

    // Handles null/undefined-like inputs gracefully despite TS types
    expect(buildDocxExportFilename(null as any, 'a4', testDate)).toBe(
      'document-a4-20231027.docx',
    );
    expect(buildDocxExportFilename(undefined as any, 'a4', testDate)).toBe(
      'document-a4-20231027.docx',
    );
  });
});
