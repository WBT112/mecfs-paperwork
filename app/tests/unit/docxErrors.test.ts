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

  it('falls back to the generic error key', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(getDocxErrorKey(new Error('Unknown'))).toBe(
      'formpackDocxExportError',
    );
    errorSpy.mockRestore();
  });

  it('handles plain objects with a message property', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = { message: 'Plain object error' };
    expect(getDocxErrorKey(error)).toBe('formpackDocxExportError');
    errorSpy.mockRestore();
  });
});
