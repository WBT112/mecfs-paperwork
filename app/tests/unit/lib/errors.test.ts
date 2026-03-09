import { describe, expect, it } from 'vitest';
import { toError } from '../../../src/lib/errors';

describe('toError', () => {
  it('returns the original Error instance when reason is already an Error', () => {
    const reason = new Error('original');
    expect(toError(reason, 'fallback')).toBe(reason);
  });

  it('creates a fallback Error when reason is not an Error', () => {
    const error = toError({ message: 'nope' }, 'fallback-message');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('fallback-message');
  });
});
