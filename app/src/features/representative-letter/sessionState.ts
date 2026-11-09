import {
  REPRESENTATIVE_LETTER_STATE_VERSION,
  createDefaultRepresentativeLetterState,
  type RepresentativeLetterState,
} from './model';
import { isLetterVariantSelection, selectLetterVariants } from './variants';

/** Storage key reserved for the representative-letter workflow. */
export const REPRESENTATIVE_LETTER_SESSION_KEY =
  'mecfs-paperwork.representative-letter.state.v5';
const LEGACY_V4_REPRESENTATIVE_LETTER_SESSION_KEY =
  'mecfs-paperwork.representative-letter.state.v4';

/** Minimal storage contract used by the tab-local state helpers. */
export type RepresentativeLetterSessionStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

// SECURITY: Retired states may contain health-related free text; never parse it.
const discardRetiredStates = (
  storage: RepresentativeLetterSessionStorage,
): void => {
  for (const version of [1, 2, 3]) {
    storage.removeItem(
      `mecfs-paperwork.representative-letter.state.v${version}`,
    );
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalId = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const parseVersionedState = (
  value: unknown,
  expectedVersion: number,
): RepresentativeLetterState | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (value.version !== expectedVersion) {
    return null;
  }
  if (!isOptionalId(value.recipientId)) {
    return null;
  }

  const variant =
    expectedVersion === REPRESENTATIVE_LETTER_STATE_VERSION &&
    isLetterVariantSelection(value.variant)
      ? value.variant
      : selectLetterVariants();

  return {
    version: REPRESENTATIVE_LETTER_STATE_VERSION,
    recipientId: value.recipientId,
    variant,
  };
};

/**
 * Reads and validates the representative-letter state from one browser tab.
 *
 * @param storage - The sessionStorage instance belonging to the current tab.
 * @returns The stored state, or a fresh default when access or validation fails.
 */
export const readRepresentativeLetterState = (
  storage?: RepresentativeLetterSessionStorage,
): RepresentativeLetterState => {
  try {
    storage ??= globalThis.sessionStorage;
    discardRetiredStates(storage);
    const serialized = storage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY);
    if (serialized) {
      return (
        parseVersionedState(
          JSON.parse(serialized) as unknown,
          REPRESENTATIVE_LETTER_STATE_VERSION,
        ) ?? createDefaultRepresentativeLetterState()
      );
    }

    const legacyV4Serialized = storage.getItem(
      LEGACY_V4_REPRESENTATIVE_LETTER_SESSION_KEY,
    );
    storage.removeItem(LEGACY_V4_REPRESENTATIVE_LETTER_SESSION_KEY);
    if (!legacyV4Serialized) {
      return createDefaultRepresentativeLetterState();
    }

    const migrated = parseVersionedState(
      JSON.parse(legacyV4Serialized) as unknown,
      4,
    );
    if (!migrated) {
      return createDefaultRepresentativeLetterState();
    }
    storage.setItem(
      REPRESENTATIVE_LETTER_SESSION_KEY,
      JSON.stringify(migrated),
    );
    return migrated;
  } catch {
    return createDefaultRepresentativeLetterState();
  }
};

/**
 * Writes the representative-letter state to the current browser tab.
 *
 * @param state - Valid state to persist.
 * @param storage - The sessionStorage instance belonging to the current tab.
 * @returns Whether the write succeeded.
 */
export const writeRepresentativeLetterState = (
  state: RepresentativeLetterState,
  storage?: RepresentativeLetterSessionStorage,
): boolean => {
  try {
    storage ??= globalThis.sessionStorage;
    storage.setItem(REPRESENTATIVE_LETTER_SESSION_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

/**
 * Removes only the representative-letter state from the current browser tab.
 *
 * @param storage - The sessionStorage instance belonging to the current tab.
 * @returns Whether the removal succeeded.
 */
export const clearRepresentativeLetterState = (
  storage?: RepresentativeLetterSessionStorage,
): boolean => {
  try {
    storage ??= globalThis.sessionStorage;
    storage.removeItem(REPRESENTATIVE_LETTER_SESSION_KEY);
    storage.removeItem(LEGACY_V4_REPRESENTATIVE_LETTER_SESSION_KEY);
    discardRetiredStates(storage);
    return true;
  } catch {
    return false;
  }
};
