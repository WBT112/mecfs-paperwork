/**
 * Supported day phases in the Spoon Manager mini-game.
 */
export type GamePhase = 'morning' | 'midday' | 'evening';

/**
 * High-level lifecycle states for a Spoon Manager run.
 */
export type GameStatus = 'idle' | 'playing' | 'stable' | 'narrow' | 'crash';

/**
 * Semantic tags used for balancing action selection and end-of-day rules.
 */
export type ActionTag =
  | 'rest'
  | 'help'
  | 'cancel'
  | 'social'
  | 'admin'
  | 'outside'
  | 'hygiene'
  | 'food'
  | 'household'
  | 'medical'
  | 'sensory';

/**
 * Static definition of a selectable action.
 *
 * @remarks
 * Actions stay data-driven so later games or content updates can reuse the
 * same selection and evaluation logic without component changes.
 */
export interface GameAction {
  id: string;
  phase: GamePhase | 'any';
  titleKey: string;
  feedbackKey: string;
  immediateDelta: number;
  nextPhaseDelta?: number;
  tags: ActionTag[];
  weight?: number;
}

/**
 * Static definition of a phase-boundary random event.
 */
export interface GameEvent {
  id: string;
  phaseBoundary: 'afterMorning' | 'afterMidday';
  textKey: string;
  delta: number;
  tags?: ActionTag[];
  weight?: number;
}

/**
 * Introductory flavor text shown at the start of a run.
 */
export interface StartFlavor {
  id: string;
  textKey: string;
}

/**
 * Per-phase context text shown while a phase is active.
 */
export interface PhaseFlavor {
  id: string;
  phase: GamePhase;
  textKey: string;
}

/**
 * Result flavor text shown after a completed or crashed day.
 */
export interface ResultFlavor {
  id: string;
  status: Extract<GameStatus, 'stable' | 'narrow' | 'crash'>;
  textKey: string;
}

/**
 * Recorded action choice for the active day.
 */
export interface ChosenAction {
  actionId: string;
  phase: GamePhase;
  turnInPhase: 1 | 2;
  immediateDelta: number;
  appliedNextPhaseDelta?: number;
  tags: ActionTag[];
}

/**
 * Minimal local aggregate statistics for Spoon Manager.
 *
 * @remarks
 * No personal or session-level details are stored, only coarse counters that
 * remain privacy-preserving and resilient to corruption.
 */
export interface SpoonGameStats {
  totalRuns: number;
  stableRuns: number;
  narrowRuns: number;
  crashRuns: number;
  bestRemainingSpoons: number | null;
  lastStatus: Extract<GameStatus, 'stable' | 'narrow' | 'crash'> | null;
}

/**
 * Mutable run state for the active day.
 *
 * @remarks
 * The active run stays fully in memory. Only aggregate statistics are written
 * to localStorage.
 */
export interface SpoonGameState {
  seed: string;
  spoons: number;
  status: GameStatus;
  phase: GamePhase;
  turnInPhase: 1 | 2;
  turnIndex: number;
  startFlavorId: string;
  phaseFlavorId: string;
  pendingPhaseDelta: number;
  chosenActions: ChosenAction[];
  triggeredEventIds: string[];
  currentActionIds: string[];
  feedbackKeys: string[];
  latestFeedbackKey: string | null;
  awaitingAdvance: boolean;
  resultFlavorId: string | null;
}
