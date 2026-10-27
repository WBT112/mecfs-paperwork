/** Stable identifier used by the representative-letter tool. */
export const REPRESENTATIVE_LETTER_TOOL_ID = 'representative-letter';

/** Current schema version for the tab-local representative-letter state. */
export const REPRESENTATIVE_LETTER_STATE_VERSION = 3 as const;

/** Views available inside the representative-letter tool. */
export type RepresentativeLetterView = 'information' | 'letter';

/** Available lengths for the generated mail body. */
export type RepresentativeLetterBodyLength = 'short' | 'long';

/**
 * Tab-local preferences used to assemble the representative letter.
 *
 * @remarks The state intentionally contains no identifying patient data and is
 * stored only in sessionStorage. The deliberately small state avoids retaining
 * health-related details that are not needed to create the letter.
 */
export type RepresentativeLetterState = {
  version: typeof REPRESENTATIVE_LETTER_STATE_VERSION;
  recipientId: string | null;
  bodyLength: RepresentativeLetterBodyLength;
};

/**
 * Creates a fresh state without personal selections.
 *
 * @returns The default state for a new tab-local workflow.
 */
export const createDefaultRepresentativeLetterState =
  (): RepresentativeLetterState => ({
    version: REPRESENTATIVE_LETTER_STATE_VERSION,
    recipientId: null,
    bodyLength: 'short',
  });
