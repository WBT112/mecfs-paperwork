import { describe, expect, it } from 'vitest';
import {
  createAsyncGuard,
  ignoreAsyncError,
} from '../../../src/lib/asyncGuard';

describe('asyncGuard', () => {
  it('starts active and deactivates permanently', () => {
    const guard = createAsyncGuard();

    expect(guard.isActive()).toBe(true);

    guard.deactivate();

    expect(guard.isActive()).toBe(false);
    guard.deactivate();
    expect(guard.isActive()).toBe(false);
  });

  it('silently swallows intentionally ignored async errors', () => {
    expect(ignoreAsyncError(new Error('ignored'))).toBeUndefined();
    expect(ignoreAsyncError('ignored')).toBeUndefined();
  });
});
