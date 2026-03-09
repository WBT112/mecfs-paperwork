// @vitest-environment node
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
    const errorFn = vi.fn();
    vi.stubGlobal('console', { ...console, error: errorFn });
    const sensitiveError = new Error('Sensitive data in error message');
    sensitiveError.name = 'UnknownError';

    expect(getDocxErrorKey(sensitiveError)).toBe('formpackDocxExportError');

    expect(errorFn).toHaveBeenCalledWith(
      'A DOCX export error occurred (type: UnknownError).',
    );
    expect(errorFn).not.toHaveBeenCalledWith(expect.anything(), sensitiveError);
    expect(errorFn).not.toHaveBeenCalledWith(
      expect.stringContaining('Sensitive data'),
    );

    vi.unstubAllGlobals();
  });

  it('handles plain objects with a message property', () => {
    const errorFn = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = { message: 'Plain object error' };
    expect(getDocxErrorKey(error)).toBe('formpackDocxExportError');
    errorFn.mockRestore();
  });

  it('uses the generic error key for non-error values and does not leak them', () => {
    const errorFn = vi.fn();
    vi.stubGlobal('console', { ...console, error: errorFn });
    const weirdError = { some: 'sensitive-data' };

    expect(getDocxErrorKey(weirdError)).toBe('formpackDocxExportError');

    expect(errorFn).toHaveBeenCalledWith(
      'An unknown DOCX export error occurred.',
    );
    expect(errorFn).not.toHaveBeenCalledWith(expect.anything(), weirdError);
    expect(errorFn).not.toHaveBeenCalledWith(
      expect.stringContaining('sensitive-data'),
    );

    vi.unstubAllGlobals();
  });
});
