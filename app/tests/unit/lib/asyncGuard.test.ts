import { describe, expect, it } from 'vitest';
import { createAsyncGuard } from '../../../src/lib/asyncGuard';

describe('asyncGuard', () => {
  it('starts active and deactivates permanently', () => {
    const guard = createAsyncGuard();

    expect(guard.isActive()).toBe(true);

    guard.deactivate();

    expect(guard.isActive()).toBe(false);
    guard.deactivate();
    expect(guard.isActive()).toBe(false);
  });
});
