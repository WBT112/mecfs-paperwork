/** Stable identifier used by the representative-letter tool. */
export const REPRESENTATIVE_LETTER_TOOL_ID = 'representative-letter';

/** Current schema version for the tab-local representative-letter state. */
export const REPRESENTATIVE_LETTER_STATE_VERSION = 1 as const;

/** Views available inside the representative-letter tool. */
export type RepresentativeLetterView = 'information' | 'letter';

/** Available lengths for the generated mail body. */
export type RepresentativeLetterBodyLength = 'short' | 'long';

/**
 * Tab-local selections used to assemble the representative letter.
 *
 * @remarks The state intentionally contains no identifying patient data and is
 * stored only in sessionStorage. Catalog identifiers are resolved from bundled
 * assets so no health-related selection is placed in a URL or network request.
 */
export type RepresentativeLetterState = {
  version: typeof REPRESENTATIVE_LETTER_STATE_VERSION;
  view: RepresentativeLetterView;
  recipientId: string | null;
  severityId: string | null;
  severityVariantId: string;
  careStatusId: string | null;
  careStatusVariantId: string;
  includePersonalDetailsInShortBody: boolean;
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
    view: 'information',
    recipientId: null,
    severityId: null,
    severityVariantId: 'standard',
    careStatusId: null,
    careStatusVariantId: 'standard',
    includePersonalDetailsInShortBody: false,
    bodyLength: 'short',
  });
