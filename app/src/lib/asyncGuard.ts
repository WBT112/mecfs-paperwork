/**
 * Lightweight lifecycle guard for async follow-up work inside effects.
 *
 * @remarks
 * RATIONALE: Several pages and hooks need the same "ignore late async result
 * after unmount" behavior. Keeping the flag logic in one helper reduces drift
 * across effects without introducing a heavier abstraction.
 */
export interface AsyncGuard {
  /**
   * Returns whether the guarded effect is still active.
   *
   * @returns `true` while the surrounding effect is mounted.
   */
  isActive: () => boolean;
  /**
   * Marks the guard as inactive.
   *
   * @returns Void.
   */
  deactivate: () => void;
}

/**
 * Runs a callback only while the associated guard is still active.
 *
 * @param guard - Guard returned by {@link createAsyncGuard}.
 * @param action - Callback that may update state when the guard is still active.
 * @returns The callback result while active, otherwise `undefined`.
 */
export const runIfActive = <T>(
  guard: AsyncGuard,
  action: () => T,
): T | undefined => {
  if (!guard.isActive()) {
    return undefined;
  }

  return action();
};

/**
 * Creates a mutable guard for async work that must stop updating state after
 * the owning effect unmounts.
 *
 * @returns Guard object with read and cleanup functions.
 */
export const createAsyncGuard = (): AsyncGuard => {
  let active = true;

  return {
    isActive: () => active,
    deactivate: () => {
      active = false;
    },
  };
};

/**
 * Consumes deliberately ignored async errors to avoid unhandled rejection noise
 * in fire-and-forget UI flows.
 *
 * @param _error - Rejected async value that is intentionally ignored.
 * @returns Void.
 * @remarks
 * RATIONALE: Some UI follow-up work should never block the primary interaction
 * path. Centralizing the no-op handler keeps coverage deterministic and avoids
 * repeating inline ignore callbacks across components.
 */
export const ignoreAsyncError = (_error: unknown): void => {
  // Intentionally empty.
};
