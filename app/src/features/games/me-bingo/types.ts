import type { SupportedLocale } from '../../../i18n/locale';

/**
 * Persistent milestone state for a ME Bingo session or summary.
 */
export type MeBingoStatus = 'idle' | 'playing' | 'bingo' | 'full-card';

/**
 * Editorial content categories used to balance each bingo card.
 */
export type MeBingoPromptCategory =
  | 'minimization-visibility'
  | 'push-and-movement'
  | 'medical-psychologizing'
  | 'wellness-advice'
  | 'daily-life-expectations';

/**
 * Localized prompt definition used to build random bingo cards.
 *
 * @remarks
 * Prompt content lives outside UI components so translations and editorial
 * updates can be maintained without touching interaction logic.
 */
export interface MeBingoPromptDefinition {
  id: string;
  category: MeBingoPromptCategory;
  labels: Record<SupportedLocale, string>;
}

/**
 * A single square on the ME Bingo board.
 */
export interface MeBingoCell {
  cellId: string;
  entryId: string;
  isFree: boolean;
  isMarked: boolean;
}

/**
 * Derived board state after evaluating the current markings.
 */
export interface MeBingoEvaluation {
  lineIndexes: number[][];
  lineCount: number;
  markedCount: number;
  status: Exclude<MeBingoStatus, 'idle'>;
  isFullCard: boolean;
}

/**
 * In-memory state for the active ME Bingo round.
 */
export interface MeBingoGameState extends MeBingoEvaluation {
  board: MeBingoCell[];
  startedAt: number;
  bingoAt: number | null;
  fullCardAt: number | null;
}

/**
 * Minimal local-only statistics for ME Bingo.
 *
 * @remarks
 * The stored payload intentionally avoids any user-specific or content-specific
 * information. It only tracks aggregate counters needed for lightweight
 * progression feedback.
 */
export interface MeBingoStats {
  playedRounds: number;
  bingoCount: number;
  fullCardCount: number;
  lastStatus: MeBingoStatus;
  bestLineCount: number;
}
