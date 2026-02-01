import { describe, expect, it } from 'vitest';
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
    expect(getDocxErrorKey(new Error('Unknown'))).toBe(
      'formpackDocxExportError',
    );
  });

  it('handles plain objects with a message property', () => {
    const error = { message: 'Plain object error' };
    expect(getDocxErrorKey(error)).toBe('formpackDocxExportError');
  });

  it('uses the generic error key for non-error values', () => {
    expect(getDocxErrorKey({})).toBe('formpackDocxExportError');
  });
});
