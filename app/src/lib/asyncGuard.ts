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
