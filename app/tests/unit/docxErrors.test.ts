import { describe, expect, it, vi } from 'vitest';
import { getDocxErrorKey } from '../../src/export/docx';

const errorWithName = (name: string): Error => {
  const error = new Error('Template error');
  error.name = name;
  return error;
};

describe('getDocxErrorKey', () => {
  it('maps unterminated FOR loops', () => {
    expect(getDocxErrorKey(errorWithName('UnterminatedForLoopError'))).toBe(
      'formpackDocxErrorUnterminatedFor',
    );
  });

  it('maps incomplete IF blocks', () => {
    expect(
      getDocxErrorKey(errorWithName('IncompleteConditionalStatementError')),
    ).toBe('formpackDocxErrorIncompleteIf');
  });

  it('maps template syntax errors', () => {
    expect(getDocxErrorKey(errorWithName('TemplateParseError'))).toBe(
      'formpackDocxErrorInvalidSyntax',
    );
  });

  it('maps invalid command errors', () => {
    expect(getDocxErrorKey(errorWithName('InvalidCommandError'))).toBe(
      'formpackDocxErrorInvalidCommand',
    );
  });

  it('handles aggregated error arrays', () => {
    const errors = [
      errorWithName('InvalidCommandError'),
      errorWithName('TemplateParseError'),
    ];
    expect(getDocxErrorKey(errors)).toBe('formpackDocxErrorInvalidCommand');
  });

  it('falls back to the generic error key and does not leak the error object', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sensitiveError = new Error('Sensitive data in error message');
    sensitiveError.name = 'UnknownError';

    expect(getDocxErrorKey(sensitiveError)).toBe('formpackDocxExportError');

    expect(consoleSpy).toHaveBeenCalledWith(
      'A DOCX export error occurred (type: UnknownError).',
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      sensitiveError,
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Sensitive data'),
    );

    consoleSpy.mockRestore();
  });

  it('handles plain objects with a message property', () => {
    const error = { message: 'Plain object error' };
    expect(getDocxErrorKey(error)).toBe('formpackDocxExportError');
  });

  it('uses the generic error key for non-error values and does not leak them', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const weirdError = { some: 'sensitive-data' };

    expect(getDocxErrorKey(weirdError)).toBe('formpackDocxExportError');

    expect(consoleSpy).toHaveBeenCalledWith(
      'An unknown DOCX export error occurred.',
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.anything(), weirdError);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('sensitive-data'),
    );

    consoleSpy.mockRestore();
  });
});
