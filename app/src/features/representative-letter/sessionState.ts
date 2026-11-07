import {
  REPRESENTATIVE_LETTER_STATE_VERSION,
  createDefaultRepresentativeLetterState,
  type RepresentativeLetterState,
} from './model';

/** Storage key reserved for the representative-letter workflow. */
export const REPRESENTATIVE_LETTER_SESSION_KEY =
  'mecfs-paperwork.representative-letter.state.v3';
const LEGACY_V2_REPRESENTATIVE_LETTER_SESSION_KEY =
  'mecfs-paperwork.representative-letter.state.v2';
const LEGACY_V1_REPRESENTATIVE_LETTER_SESSION_KEY =
  'mecfs-paperwork.representative-letter.state.v1';

/** Minimal storage contract used by the tab-local state helpers. */
export type RepresentativeLetterSessionStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isOptionalId = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const parseState = (value: unknown): RepresentativeLetterState | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (value.version !== REPRESENTATIVE_LETTER_STATE_VERSION) {
    return null;
  }
  if (!isOptionalId(value.recipientId)) {
    return null;
  }
  if (value.bodyLength !== 'short' && value.bodyLength !== 'long') {
    return null;
  }

  return {
    version: REPRESENTATIVE_LETTER_STATE_VERSION,
    recipientId: value.recipientId,
    bodyLength: value.bodyLength,
  };
};

const parseLegacyV2State = (
  value: unknown,
): RepresentativeLetterState | null => {
  if (!isRecord(value) || value.version !== 2) {
    return null;
  }
  if (!isOptionalId(value.recipientId)) {
    return null;
  }
  if (value.bodyLength !== 'short' && value.bodyLength !== 'long') {
    return null;
  }

  return {
    version: REPRESENTATIVE_LETTER_STATE_VERSION,
    recipientId: value.recipientId,
    bodyLength: value.bodyLength,
  };
};

/**
 * Reads and validates the representative-letter state from one browser tab.
 *
 * @param storage - The sessionStorage instance belonging to the current tab.
 * @returns The stored state, or a fresh default when access or validation fails.
 */
export const readRepresentativeLetterState = (
  storage: RepresentativeLetterSessionStorage = globalThis.sessionStorage,
): RepresentativeLetterState => {
  try {
    const serialized = storage.getItem(REPRESENTATIVE_LETTER_SESSION_KEY);
    if (serialized) {
      return (
        parseState(JSON.parse(serialized) as unknown) ??
        createDefaultRepresentativeLetterState()
      );
    }

    const legacySerialized = storage.getItem(
      LEGACY_V2_REPRESENTATIVE_LETTER_SESSION_KEY,
    );
    storage.removeItem(LEGACY_V2_REPRESENTATIVE_LETTER_SESSION_KEY);
    storage.removeItem(LEGACY_V1_REPRESENTATIVE_LETTER_SESSION_KEY);
    if (!legacySerialized) {
      return createDefaultRepresentativeLetterState();
    }

    const migrated = parseLegacyV2State(
      JSON.parse(legacySerialized) as unknown,
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
  storage: RepresentativeLetterSessionStorage = globalThis.sessionStorage,
): boolean => {
  try {
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
  storage: RepresentativeLetterSessionStorage = globalThis.sessionStorage,
): boolean => {
  try {
    storage.removeItem(REPRESENTATIVE_LETTER_SESSION_KEY);
    storage.removeItem(LEGACY_V2_REPRESENTATIVE_LETTER_SESSION_KEY);
    storage.removeItem(LEGACY_V1_REPRESENTATIVE_LETTER_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
};
