import { describe, expect, it } from 'vitest';
import {
  createAsyncGuard,
  ignoreAsyncError,
  runIfActive,
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

  it('runs callbacks only while the guard is active', () => {
    const guard = createAsyncGuard();
    let calls = 0;

    const activeResult = runIfActive(guard, () => {
      calls += 1;
      return 'active';
    });

    guard.deactivate();

    const inactiveResult = runIfActive(guard, () => {
      calls += 1;
      return 'inactive';
    });

    expect(activeResult).toBe('active');
    expect(inactiveResult).toBeUndefined();
    expect(calls).toBe(1);
  });
});
