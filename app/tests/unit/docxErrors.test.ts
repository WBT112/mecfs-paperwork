import { describe, expect, it } from 'vitest';
import { getDocxErrorKey } from '../../src/export/docx';

const templateError = (id: string): Error => {
  const error = new Error(`Template error (${id})`) as Error & {
    properties: { id: string };
  };
  error.name = 'TemplateError';
  error.properties = { id };
  return error;
};

describe('getDocxErrorKey', () => {
  it('maps unterminated FOR loops', () => {
    expect(getDocxErrorKey(templateError('loop_unterminated'))).toBe(
      'formpackDocxErrorUnterminatedFor',
    );
  });

  it('maps incomplete IF blocks', () => {
    expect(getDocxErrorKey(templateError('tag_not_closed'))).toBe(
      'formpackDocxErrorIncompleteIf',
    );
  });

  it('maps template syntax errors', () => {
    expect(getDocxErrorKey(templateError('malformed_tag'))).toBe(
      'formpackDocxErrorInvalidSyntax',
    );
  });

  it('maps invalid command errors', () => {
    expect(getDocxErrorKey(templateError('render_error'))).toBe(
      'formpackDocxErrorInvalidCommand',
    );
  });

  it('handles aggregated error arrays', () => {
    const aggregatedError = {
      message: 'Multiple errors',
      errors: [templateError('render_error'), templateError('malformed_tag')],
    };
    expect(getDocxErrorKey(aggregatedError)).toBe(
      'formpackDocxErrorInvalidCommand',
    );
  });

  it('falls back to the generic error key', () => {
    expect(getDocxErrorKey(new Error('Unknown'))).toBe(
      'formpackDocxExportError',
    );
  });
});
