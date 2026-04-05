import {
  getSpoonManagerActionById,
  getSpoonManagerActions,
  getSpoonManagerEvents,
  getSpoonManagerPhaseFlavorsForPhase,
  getSpoonManagerResultFlavors,
  getSpoonManagerStartFlavors,
  SPOON_MANAGER_PROTECTIVE_TAGS,
} from '../data/content';
import {
  createRandomSeed,
  createSeededRandom,
  pickOne,
  shuffle,
} from './random';
import type {
  ChosenAction,
  GameAction,
  GamePhase,
  SpoonGameState,
} from '../types';

const STARTING_SPOONS = [6, 7, 8, 9, 10] as const;
const STRAIN_TAGS = ['social', 'admin', 'outside'] as const;

/**
 * Starts a fresh Spoon Manager day.
 *
 * @remarks
 * The returned state is fully deterministic for the same seed, including the
 * starting spoons, the intro text, the first phase text, and the first set of
 * four actions.
 *
 * @param options - Optional explicit seed for deterministic runs.
 * @returns Initial in-memory game state for a new day.
 */
export const createSpoonGameState = (options?: {
  seed?: string;
}): SpoonGameState => {
  const seed = options?.seed?.trim() || createRandomSeed();

  return {
    seed,
    spoons: pickOne(STARTING_SPOONS, createSeededRandom(`${seed}:spoons`)),
    status: 'playing',
    phase: 'morning',
    turnInPhase: 1,
    turnIndex: 0,
    startFlavorId: pickOne(
      getSpoonManagerStartFlavors(),
      createSeededRandom(`${seed}:start-flavor`),
    ).id,
    phaseFlavorId: pickOne(
      getSpoonManagerPhaseFlavorsForPhase('morning'),
      createSeededRandom(`${seed}:phase-flavor:morning`),
    ).id,
    pendingPhaseDelta: 0,
    chosenActions: [],
    triggeredEventIds: [],
    currentActionIds: selectTurnActionIds({
      seed,
      phase: 'morning',
      turnIndex: 0,
      chosenActions: [],
    }),
    feedbackKeys: [],
    latestFeedbackKey: null,
    awaitingAdvance: false,
    resultFlavorId: null,
  };
};

/**
 * Applies the chosen action for the current turn.
 *
 * @param state - Current in-memory game state.
 * @param actionId - Selected action identifier from `state.currentActionIds`.
 * @returns Updated game state after the action cost or benefit has been applied.
 * @throws Error when the action id is unknown or not selectable in the current turn.
 */
export const chooseSpoonGameAction = (
  state: SpoonGameState,
  actionId: string,
): SpoonGameState => {
  if (state.status !== 'playing' || state.awaitingAdvance) {
    return state;
  }

  if (!state.currentActionIds.includes(actionId)) {
    throw new Error(`Unknown turn action: ${actionId}`);
  }

  const action = getSpoonManagerActionById(actionId);
  if (!action) {
    throw new Error(`Missing action definition: ${actionId}`);
  }

  const nextChosenAction: ChosenAction = {
    actionId: action.id,
    phase: state.phase,
    turnInPhase: state.turnInPhase,
    immediateDelta: action.immediateDelta,
    appliedNextPhaseDelta: action.nextPhaseDelta,
    tags: action.tags,
  };
  const spoons = state.spoons + action.immediateDelta;
  const nextState: SpoonGameState = {
    ...state,
    spoons,
    pendingPhaseDelta: state.pendingPhaseDelta + (action.nextPhaseDelta ?? 0),
    chosenActions: [...state.chosenActions, nextChosenAction],
    currentActionIds: [],
    feedbackKeys: [action.feedbackKey],
    latestFeedbackKey: action.feedbackKey,
    awaitingAdvance: spoons >= 0,
  };

  if (spoons < 0) {
    return finalizeFinishedState(nextState, 'crash');
  }

  return nextState;
};

/**
 * Advances the game after the current feedback has been read.
 *
 * @remarks
 * This function handles turn progression, phase changes, random events, and
 * the moderate combo rules described in the feature specification.
 *
 * @param state - Current in-memory game state after a chosen action.
 * @returns Updated game state for the next turn, next phase, or final result.
 */
export const advanceSpoonGame = (state: SpoonGameState): SpoonGameState => {
  if (state.status !== 'playing' || !state.awaitingAdvance) {
    return state;
  }

  if (state.turnInPhase === 1) {
    const nextTurnIndex = state.turnIndex + 1;

    return {
      ...state,
      turnInPhase: 2,
      turnIndex: nextTurnIndex,
      currentActionIds: selectTurnActionIds({
        seed: state.seed,
        phase: state.phase,
        turnIndex: nextTurnIndex,
        chosenActions: state.chosenActions,
      }),
      feedbackKeys: [],
      latestFeedbackKey: null,
      awaitingAdvance: false,
    };
  }

  return advanceAcrossPhaseBoundary(state);
};

/**
 * Evaluates the final status from the remaining spoons.
 *
 * @param remainingSpoons - Final spoon count at the end of the day.
 * @returns Final result status.
 */
export const evaluateSpoonGameResult = (
  remainingSpoons: number,
): 'stable' | 'narrow' | 'crash' => {
  if (remainingSpoons < 0) {
    return 'crash';
  }

  if (remainingSpoons >= 3) {
    return 'stable';
  }

  return 'narrow';
};

/**
 * Identifies whether an action counts as a protective pacing choice.
 *
 * @param action - Action definition to inspect.
 * @returns `true` when the action uses a protective tag.
 */
export const isProtectiveAction = (action: GameAction): boolean =>
  action.tags.some((tag) => isProtectiveTag(tag));

/**
 * Identifies whether an action counts as a demanding choice in summaries.
 *
 * @param action - Action definition to inspect.
 * @returns `true` when the action has a strong or delayed cost.
 */
export const isDemandingAction = (action: GameAction): boolean =>
  action.immediateDelta <= -2 || (action.nextPhaseDelta ?? 0) < 0;

/**
 * Summarizes protective and demanding choices for the result card.
 *
 * @param chosenActions - Recorded action choices for the current day.
 * @returns Counts used by the result view.
 */
export const summarizeSpoonGameChoices = (
  chosenActions: readonly ChosenAction[],
): { protectiveCount: number; demandingCount: number } =>
  chosenActions.reduce(
    (summary, chosenAction) => {
      const action = getSpoonManagerActionById(chosenAction.actionId);
      if (!action) {
        return summary;
      }

      return {
        protectiveCount:
          summary.protectiveCount + (isProtectiveAction(action) ? 1 : 0),
        demandingCount:
          summary.demandingCount + (isDemandingAction(action) ? 1 : 0),
      };
    },
    { protectiveCount: 0, demandingCount: 0 },
  );

const advanceAcrossPhaseBoundary = (state: SpoonGameState): SpoonGameState => {
  const feedbackKeys: string[] = [];
  let spoons = state.spoons;
  const phaseActions = state.chosenActions.filter(
    (entry) => entry.phase === state.phase,
  );
  const isOverloadedPhase =
    phaseActions.length === 2 &&
    phaseActions.every((entry) => entry.immediateDelta <= -2) &&
    phaseActions.every((entry) => !hasProtectiveTag(entry.tags));

  if (isOverloadedPhase) {
    spoons -= 1;
    feedbackKeys.push('games.spoonManager.system.phaseOverload');
    if (spoons < 0) {
      return finalizeFinishedState(
        {
          ...state,
          spoons,
          feedbackKeys,
          latestFeedbackKey: getLastFeedbackKey(feedbackKeys),
          awaitingAdvance: false,
        },
        'crash',
      );
    }
  }

  const nextPhase = getNextPhase(state.phase);
  if (nextPhase === null) {
    return finalizeDay({
      ...state,
      spoons,
      feedbackKeys,
      latestFeedbackKey: getLastFeedbackKey(feedbackKeys),
      awaitingAdvance: false,
    });
  }

  const event = pickBoundaryEvent(state);
  spoons += event.delta;
  feedbackKeys.push(event.textKey);

  if (spoons < 0) {
    return buildBoundaryCrashState(state, spoons, feedbackKeys, {
      triggeredEventIds: [...state.triggeredEventIds, event.id],
    });
  }

  const pendingPhaseResult = applyPendingPhaseDelta(
    spoons,
    state.pendingPhaseDelta,
    feedbackKeys,
  );
  spoons = pendingPhaseResult.spoons;

  if (spoons < 0) {
    return buildBoundaryCrashState(state, spoons, feedbackKeys, {
      pendingPhaseDelta: pendingPhaseResult.pendingPhaseDelta,
      triggeredEventIds: [...state.triggeredEventIds, event.id],
    });
  }

  if (
    nextPhase === 'evening' &&
    !state.chosenActions
      .slice(0, 4)
      .some((entry) => hasProtectiveTag(entry.tags))
  ) {
    spoons -= 1;
    feedbackKeys.push('games.spoonManager.system.noPacingBeforeEvening');
    if (spoons < 0) {
      return buildBoundaryCrashState(state, spoons, feedbackKeys, {
        triggeredEventIds: [...state.triggeredEventIds, event.id],
      });
    }
  }

  return buildNextPhaseState(
    state,
    nextPhase,
    spoons,
    feedbackKeys,
    pendingPhaseResult.pendingPhaseDelta,
    event.id,
  );
};

const finalizeDay = (state: SpoonGameState): SpoonGameState => {
  const feedbackKeys = [...state.feedbackKeys];
  let spoons = state.spoons;
  const hasSocialChainPenalty =
    state.chosenActions.filter((entry) =>
      entry.tags.some((tag) => isStrainTag(tag)),
    ).length >= 3 &&
    state.chosenActions.filter((entry) => hasProtectiveTag(entry.tags))
      .length <= 1;

  if (hasSocialChainPenalty) {
    spoons -= 1;
    feedbackKeys.push('games.spoonManager.system.socialChain');
  }

  return finalizeFinishedState(
    {
      ...state,
      spoons,
      feedbackKeys,
      latestFeedbackKey: getLastFeedbackKey(feedbackKeys),
      awaitingAdvance: false,
    },
    evaluateSpoonGameResult(spoons),
  );
};

const finalizeFinishedState = (
  state: SpoonGameState,
  status: 'stable' | 'narrow' | 'crash',
): SpoonGameState => ({
  ...state,
  status,
  awaitingAdvance: false,
  currentActionIds: [],
  resultFlavorId: pickOne(
    getSpoonManagerResultFlavors().filter((entry) => entry.status === status),
    createSeededRandom(
      `${state.seed}:result:${status}:${state.spoons}:${state.chosenActions
        .map((entry) => entry.actionId)
        .join('|')}`,
    ),
  ).id,
});

const selectTurnActionIds = ({
  seed,
  phase,
  turnIndex,
  chosenActions,
}: {
  seed: string;
  phase: GamePhase;
  turnIndex: number;
  chosenActions: readonly ChosenAction[];
}): string[] => {
  const usedActionIds = new Set(chosenActions.map((entry) => entry.actionId));
  const eligibleActions = getSpoonManagerActions().filter(
    (entry) =>
      (entry.phase === phase || entry.phase === 'any') &&
      !usedActionIds.has(entry.id),
  );
  const protectiveActions = eligibleActions.filter((entry) =>
    isProtectiveAction(entry),
  );

  if (protectiveActions.length === 0 || eligibleActions.length < 4) {
    throw new Error(`Cannot build turn actions for phase ${phase}.`);
  }

  const scope = `${seed}:turn-actions:${phase}:${turnIndex}:${[
    ...usedActionIds,
  ].join('|')}`;
  const primaryRandom = createSeededRandom(`${scope}:pool`);
  const mixedRandom = createSeededRandom(`${scope}:mix`);
  const guaranteedProtective = pickOne(protectiveActions, primaryRandom);
  const remainingActions = eligibleActions.filter(
    (entry) => entry.id !== guaranteedProtective.id,
  );

  return shuffle(
    [
      guaranteedProtective.id,
      ...shuffle(remainingActions, primaryRandom)
        .slice(0, 3)
        .map((entry) => entry.id),
    ],
    mixedRandom,
  );
};

const pickBoundaryEvent = (state: SpoonGameState) =>
  pickOne(
    getSpoonManagerEvents().filter(
      (entry) =>
        entry.phaseBoundary ===
        (state.phase === 'morning' ? 'afterMorning' : 'afterMidday'),
    ),
    createSeededRandom(
      `${state.seed}:event:${state.phase}:${state.turnIndex}:${state.chosenActions
        .map((entry) => entry.actionId)
        .join('|')}`,
    ),
  );

const hasProtectiveTag = (tags: readonly string[]): boolean =>
  tags.some((tag) => isProtectiveTag(tag));

const getLastFeedbackKey = (feedbackKeys: readonly string[]): string | null =>
  feedbackKeys.at(-1) ?? null;

const isProtectiveTag = (tag: string): boolean =>
  SPOON_MANAGER_PROTECTIVE_TAGS.includes(
    tag as (typeof SPOON_MANAGER_PROTECTIVE_TAGS)[number],
  );

const isStrainTag = (tag: string): boolean =>
  STRAIN_TAGS.includes(tag as (typeof STRAIN_TAGS)[number]);

const getNextPhase = (phase: GamePhase): GamePhase | null => {
  switch (phase) {
    case 'morning': {
      return 'midday';
    }
    case 'midday': {
      return 'evening';
    }
    case 'evening': {
      return null;
    }
  }
};

const applyPendingPhaseDelta = (
  spoons: number,
  pendingPhaseDelta: number,
  feedbackKeys: string[],
): { spoons: number; pendingPhaseDelta: number } => {
  if (pendingPhaseDelta === 0) {
    return { spoons, pendingPhaseDelta };
  }

  const nextSpoons = spoons + pendingPhaseDelta;
  feedbackKeys.push(
    pendingPhaseDelta < 0
      ? 'games.spoonManager.system.pendingPhaseDeltaNegative'
      : 'games.spoonManager.system.pendingPhaseDeltaPositive',
  );

  return {
    spoons: nextSpoons,
    pendingPhaseDelta: 0,
  };
};

const buildBoundaryCrashState = (
  state: SpoonGameState,
  spoons: number,
  feedbackKeys: string[],
  overrides?: Partial<SpoonGameState>,
): SpoonGameState =>
  finalizeFinishedState(
    {
      ...state,
      spoons,
      feedbackKeys,
      latestFeedbackKey: getLastFeedbackKey(feedbackKeys),
      awaitingAdvance: false,
      ...overrides,
    },
    'crash',
  );

const buildNextPhaseState = (
  state: SpoonGameState,
  nextPhase: GamePhase,
  spoons: number,
  feedbackKeys: string[],
  pendingPhaseDelta: number,
  eventId: string,
): SpoonGameState => {
  const nextTurnIndex = state.turnIndex + 1;

  return {
    ...state,
    spoons,
    phase: nextPhase,
    turnInPhase: 1,
    turnIndex: nextTurnIndex,
    phaseFlavorId: pickOne(
      getSpoonManagerPhaseFlavorsForPhase(nextPhase),
      createSeededRandom(`${state.seed}:phase-flavor:${nextPhase}`),
    ).id,
    pendingPhaseDelta,
    triggeredEventIds: [...state.triggeredEventIds, eventId],
    currentActionIds: selectTurnActionIds({
      seed: state.seed,
      phase: nextPhase,
      turnIndex: nextTurnIndex,
      chosenActions: state.chosenActions,
    }),
    feedbackKeys,
    latestFeedbackKey: getLastFeedbackKey(feedbackKeys),
    awaitingAdvance: false,
  };
};
