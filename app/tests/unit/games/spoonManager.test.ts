import { describe, expect, it } from 'vitest';
import {
  getSpoonManagerActionById,
  getSpoonManagerEventById,
} from '../../../src/features/games/spoon-manager/data/content';
import {
  advanceSpoonGame,
  chooseSpoonGameAction,
  createSpoonGameState,
  evaluateSpoonGameResult,
  isDemandingAction,
  isProtectiveAction,
  summarizeSpoonGameChoices,
} from '../../../src/features/games/spoon-manager/logic/spoonManager';
import {
  createRandomSeed,
  createSeededRandom,
  pickOne,
  shuffle,
} from '../../../src/features/games/spoon-manager/logic/random';
import type {
  ChosenAction,
  SpoonGameState,
} from '../../../src/features/games/spoon-manager/types';

const EXPECTED_TRIGGERED_EVENT_ERROR = 'Expected a triggered event.';
const PHONE_FEEDBACK_KEY =
  'games.spoonManager.actions.kurzes_telefonat.feedback';

const createChosenAction = (
  actionId: string,
  phase: ChosenAction['phase'],
  turnInPhase: ChosenAction['turnInPhase'],
): ChosenAction => {
  const action = getSpoonManagerActionById(actionId);
  if (!action) {
    throw new Error(`Missing fixture action: ${actionId}`);
  }

  return {
    actionId,
    phase,
    turnInPhase,
    immediateDelta: action.immediateDelta,
    appliedNextPhaseDelta: action.nextPhaseDelta,
    tags: action.tags,
  };
};

describe('Spoon Manager logic', () => {
  it('creates a deterministic starting state with four unique actions and at least one protective option', () => {
    const firstState = createSpoonGameState({ seed: 'alpha-seed' });
    const secondState = createSpoonGameState({ seed: 'alpha-seed' });

    expect(firstState).toEqual(secondState);
    expect(firstState.spoons).toBeGreaterThanOrEqual(6);
    expect(firstState.spoons).toBeLessThanOrEqual(10);
    expect(new Set(firstState.currentActionIds)).toHaveLength(4);
    expect(firstState.currentActionIds).toHaveLength(4);
    expect(
      firstState.currentActionIds.some((actionId) =>
        isProtectiveAction(getSpoonManagerActionById(actionId)!),
      ),
    ).toBe(true);
  });

  it('applies action deltas and can crash immediately', () => {
    const baseState = createSpoonGameState({ seed: 'immediate-crash' });
    const crashState: SpoonGameState = {
      ...baseState,
      spoons: 2,
      currentActionIds: [
        'duschen',
        '20_min_ruhen',
        'anrufen_absagen',
        'medikamente_und_wasser',
      ],
    };

    const nextState = chooseSpoonGameAction(crashState, 'duschen');

    expect(nextState.spoons).toBe(-1);
    expect(nextState.status).toBe('crash');
    expect(nextState.awaitingAdvance).toBe(false);
    expect(nextState.feedbackKeys).toEqual([
      'games.spoonManager.actions.duschen.feedback',
    ]);
  });

  it('handles guard rails for invalid choose and advance calls', () => {
    const idleState = createSpoonGameState({ seed: 'guards' });
    const nonPlayingState: SpoonGameState = {
      ...idleState,
      status: 'stable',
      currentActionIds: ['20_min_ruhen'],
    };

    expect(chooseSpoonGameAction(nonPlayingState, '20_min_ruhen')).toBe(
      nonPlayingState,
    );
    expect(advanceSpoonGame(nonPlayingState)).toBe(nonPlayingState);
    expect(() =>
      chooseSpoonGameAction(
        {
          ...idleState,
          currentActionIds: ['unknown-action'],
        },
        'unknown-action',
      ),
    ).toThrow('Missing action definition');
    expect(() => chooseSpoonGameAction(idleState, 'missing')).toThrow(
      'Unknown turn action',
    );
  });

  it('advances from the first turn to the second turn without reusing the same action', () => {
    const started = createSpoonGameState({ seed: 'turn-advance' });
    const chosenActionId = started.currentActionIds[0];
    if (!chosenActionId) {
      throw new Error('Expected a first turn action.');
    }
    const afterChoice = chooseSpoonGameAction(started, chosenActionId);
    const advanced = advanceSpoonGame(afterChoice);

    expect(advanced.turnInPhase).toBe(2);
    expect(advanced.turnIndex).toBe(1);
    expect(advanced.awaitingAdvance).toBe(false);
    expect(advanced.currentActionIds).toHaveLength(4);
    expect(advanced.currentActionIds).not.toContain(chosenActionId);
  });

  it('applies a delayed next-phase delta at the phase boundary', () => {
    const helperFeedbackKey =
      'games.spoonManager.actions.bitte_um_hilfe.feedback';
    const state: SpoonGameState = {
      ...createSpoonGameState({ seed: 'pending-phase' }),
      phase: 'midday',
      turnInPhase: 2,
      turnIndex: 3,
      spoons: 2,
      pendingPhaseDelta: -1,
      chosenActions: [
        createChosenAction('20_min_ruhen', 'morning', 1),
        createChosenAction('medikamente_und_wasser', 'morning', 2),
        createChosenAction('arzttermin_wahrnehmen_light', 'midday', 1),
        createChosenAction('bitte_um_hilfe', 'midday', 2),
      ],
      feedbackKeys: [helperFeedbackKey],
      latestFeedbackKey: helperFeedbackKey,
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    };

    const nextState = advanceSpoonGame(state);
    const eventId = nextState.triggeredEventIds[0];
    if (!eventId) {
      throw new Error(EXPECTED_TRIGGERED_EVENT_ERROR);
    }
    const event = getSpoonManagerEventById(eventId);

    expect(nextState.phase).toBe('evening');
    expect(nextState.pendingPhaseDelta).toBe(0);
    expect(nextState.feedbackKeys).toContain(
      'games.spoonManager.system.pendingPhaseDeltaNegative',
    );
    expect(nextState.spoons).toBe(2 + (event?.delta ?? 0) - 1);
  });

  it('applies the phase overload rule after two demanding non-protective choices', () => {
    const breakfastFeedbackKey =
      'games.spoonManager.actions.fruehstueck_machen.feedback';
    const state: SpoonGameState = {
      ...createSpoonGameState({ seed: 'phase-overload' }),
      phase: 'morning',
      turnInPhase: 2,
      turnIndex: 1,
      spoons: 5,
      chosenActions: [
        createChosenAction('duschen', 'morning', 1),
        createChosenAction('fruehstueck_machen', 'morning', 2),
      ],
      feedbackKeys: [breakfastFeedbackKey],
      latestFeedbackKey: breakfastFeedbackKey,
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    };

    const nextState = advanceSpoonGame(state);
    const eventId = nextState.triggeredEventIds[0];
    if (!eventId) {
      throw new Error(EXPECTED_TRIGGERED_EVENT_ERROR);
    }
    const event = getSpoonManagerEventById(eventId);

    expect(nextState.feedbackKeys).toContain(
      'games.spoonManager.system.phaseOverload',
    );
    expect(nextState.spoons).toBe(5 - 1 + (event?.delta ?? 0));
  });

  it('applies the no-pacing-before-evening rule after four non-protective choices', () => {
    const state: SpoonGameState = {
      ...createSpoonGameState({ seed: 'no-pacing' }),
      phase: 'midday',
      turnInPhase: 2,
      turnIndex: 3,
      spoons: 5,
      chosenActions: [
        createChosenAction('duschen', 'morning', 1),
        createChosenAction('fruehstueck_machen', 'morning', 2),
        createChosenAction('mail_beantworten', 'midday', 1),
        createChosenAction('kurzes_telefonat', 'midday', 2),
      ],
      feedbackKeys: [PHONE_FEEDBACK_KEY],
      latestFeedbackKey: PHONE_FEEDBACK_KEY,
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    };

    const nextState = advanceSpoonGame(state);
    const eventId = nextState.triggeredEventIds[0];
    if (!eventId) {
      throw new Error(EXPECTED_TRIGGERED_EVENT_ERROR);
    }
    const event = getSpoonManagerEventById(eventId);

    expect(nextState.phase).toBe('evening');
    expect(nextState.feedbackKeys).toContain(
      'games.spoonManager.system.noPacingBeforeEvening',
    );
    expect(nextState.spoons).toBe(5 + (event?.delta ?? 0) - 1);
  });

  it('can crash from an event, from a delayed phase cost, and from the evening no-pacing penalty', () => {
    const eventCrash = advanceSpoonGame({
      ...createSpoonGameState({ seed: 's0' }),
      phase: 'morning',
      turnInPhase: 2,
      turnIndex: 1,
      spoons: 0,
      chosenActions: [
        createChosenAction('20_min_ruhen', 'morning', 1),
        createChosenAction('medikamente_und_wasser', 'morning', 2),
      ],
      feedbackKeys: ['games.spoonManager.actions.20_min_ruhen.feedback'],
      latestFeedbackKey: 'games.spoonManager.actions.20_min_ruhen.feedback',
      awaitingAdvance: true,
      currentActionIds: [],
      pendingPhaseDelta: 0,
      triggeredEventIds: [],
    });

    expect(eventCrash.status).toBe('crash');
    expect(eventCrash.triggeredEventIds).toEqual(['ungeplanter_anruf']);
    expect(eventCrash.feedbackKeys).toEqual([
      'games.spoonManager.events.ungeplanter_anruf',
    ]);

    const pendingCrash = advanceSpoonGame({
      ...createSpoonGameState({ seed: 's15' }),
      phase: 'midday',
      turnInPhase: 2,
      turnIndex: 3,
      spoons: 1,
      pendingPhaseDelta: -2,
      chosenActions: [
        createChosenAction('20_min_ruhen', 'morning', 1),
        createChosenAction('medikamente_und_wasser', 'morning', 2),
        createChosenAction('arzttermin_wahrnehmen_light', 'midday', 1),
        createChosenAction('bitte_um_hilfe', 'midday', 2),
      ],
      feedbackKeys: [PHONE_FEEDBACK_KEY],
      latestFeedbackKey: PHONE_FEEDBACK_KEY,
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    });

    expect(pendingCrash.status).toBe('crash');
    expect(pendingCrash.triggeredEventIds).toEqual([
      'arznei_abholen_muss_warten',
    ]);
    expect(pendingCrash.feedbackKeys).toContain(
      'games.spoonManager.system.pendingPhaseDeltaNegative',
    );

    const noPacingCrash = advanceSpoonGame({
      ...createSpoonGameState({ seed: 's1' }),
      phase: 'midday',
      turnInPhase: 2,
      turnIndex: 3,
      spoons: 0,
      pendingPhaseDelta: 0,
      chosenActions: [
        createChosenAction('duschen', 'morning', 1),
        createChosenAction('fruehstueck_machen', 'morning', 2),
        createChosenAction('mail_beantworten', 'midday', 1),
        createChosenAction('kurzes_telefonat', 'midday', 2),
      ],
      feedbackKeys: [PHONE_FEEDBACK_KEY],
      latestFeedbackKey: PHONE_FEEDBACK_KEY,
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    });

    expect(noPacingCrash.status).toBe('crash');
    expect(noPacingCrash.triggeredEventIds).toEqual([
      'arznei_abholen_muss_warten',
    ]);
    expect(noPacingCrash.feedbackKeys).toContain(
      'games.spoonManager.system.noPacingBeforeEvening',
    );
  });

  it('applies the social chain penalty at the end of the day', () => {
    const state: SpoonGameState = {
      ...createSpoonGameState({ seed: 'social-chain' }),
      phase: 'evening',
      turnInPhase: 2,
      turnIndex: 5,
      spoons: 2,
      chosenActions: [
        createChosenAction('kurz_whatsapp_antworten', 'morning', 1),
        createChosenAction('anrufen_absagen', 'morning', 2),
        createChosenAction('kleiner_einkauf', 'midday', 1),
        createChosenAction('mail_beantworten', 'midday', 2),
        createChosenAction('besuch_kurz_empfangen', 'evening', 1),
        createChosenAction('noch_mails_checken', 'evening', 2),
      ],
      feedbackKeys: ['games.spoonManager.actions.noch_mails_checken.feedback'],
      latestFeedbackKey:
        'games.spoonManager.actions.noch_mails_checken.feedback',
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    };

    const nextState = advanceSpoonGame(state);

    expect(nextState.status).toBe('narrow');
    expect(nextState.feedbackKeys).toContain(
      'games.spoonManager.system.socialChain',
    );
    expect(nextState.spoons).toBe(1);
  });

  it('can crash at a phase boundary and guards impossible turn pools', () => {
    const boundaryCrashState: SpoonGameState = {
      ...createSpoonGameState({ seed: 'boundary-crash' }),
      phase: 'midday',
      turnInPhase: 2,
      turnIndex: 3,
      spoons: 0,
      chosenActions: [
        createChosenAction('20_min_ruhen', 'morning', 1),
        createChosenAction('medikamente_und_wasser', 'morning', 2),
        createChosenAction('arzttermin_wahrnehmen_light', 'midday', 1),
        createChosenAction('kurzes_telefonat', 'midday', 2),
      ],
      feedbackKeys: [PHONE_FEEDBACK_KEY],
      latestFeedbackKey: PHONE_FEEDBACK_KEY,
      awaitingAdvance: true,
      currentActionIds: [],
      pendingPhaseDelta: 0,
      triggeredEventIds: [],
    };

    const crashed = advanceSpoonGame(boundaryCrashState);

    expect(crashed.status).toBe('crash');

    expect(() =>
      advanceSpoonGame({
        ...createSpoonGameState({ seed: 'not-enough-actions' }),
        phase: 'morning',
        turnInPhase: 1,
        turnIndex: 0,
        awaitingAdvance: true,
        chosenActions: [
          createChosenAction('20_min_ruhen', 'morning', 1),
          createChosenAction('im_dunkeln_liegen', 'morning', 2),
          createChosenAction('hilfe_annehmen_fruestueck', 'morning', 1),
          createChosenAction('anrufen_absagen', 'morning', 2),
          createChosenAction('duschen', 'morning', 1),
          createChosenAction('nur_waschen_umziehen', 'morning', 2),
          createChosenAction('fruehstueck_machen', 'morning', 1),
          createChosenAction('etwas_kleines_essen', 'morning', 2),
          createChosenAction('nachrichten_checken', 'morning', 1),
        ],
      }),
    ).toThrow('Cannot build turn actions');
  });

  it('summarizes protective and demanding choices and evaluates result states', () => {
    const summary = summarizeSpoonGameChoices([
      createChosenAction('20_min_ruhen', 'morning', 1),
      createChosenAction('arzttermin_wahrnehmen_light', 'midday', 1),
      createChosenAction('mail_beantworten', 'midday', 2),
      {
        actionId: 'missing-action',
        phase: 'evening',
        turnInPhase: 1,
        immediateDelta: 0,
        appliedNextPhaseDelta: undefined,
        tags: [],
      },
    ]);

    expect(summary).toEqual({
      protectiveCount: 1,
      demandingCount: 1,
    });
    expect(evaluateSpoonGameResult(4)).toBe('stable');
    expect(evaluateSpoonGameResult(2)).toBe('narrow');
    expect(evaluateSpoonGameResult(-1)).toBe('crash');
    expect(
      isProtectiveAction(getSpoonManagerActionById('bitte_um_hilfe')!),
    ).toBe(true);
    expect(
      isDemandingAction(getSpoonManagerActionById('mail_beantworten')!),
    ).toBe(false);
  });

  it('covers the seeded RNG helpers', () => {
    const randomA = createSeededRandom('same-seed');
    const randomB = createSeededRandom('same-seed');

    expect(randomA()).toBe(randomB());
    expect(shuffle([1, 2, 3, 4], createSeededRandom('shuffle-seed'))).toEqual(
      shuffle([1, 2, 3, 4], createSeededRandom('shuffle-seed')),
    );
    expect(pickOne(['a'], createSeededRandom('pick-seed'))).toBe('a');
    expect(() => pickOne([], createSeededRandom('empty-pick'))).toThrow(
      'Cannot pick from an empty list.',
    );
  });

  it('creates random seeds with and without randomUUID support', () => {
    const originalCrypto = globalThis.crypto;
    const originalDateNow = Date.now;
    const originalMathRandom = Math.random;

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...originalCrypto,
        randomUUID: () => 'uuid-seed',
      },
    });
    expect(createRandomSeed()).toBe('uuid-seed');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {},
    });
    Date.now = () => 1234;
    Math.random = () => 0.123456789;

    expect(createRandomSeed()).toBe('seed-1234-4fzzzxjy');

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
  });

  it('trims blank seeds, supports positive pending deltas, and ignores repeated advances after results', () => {
    const generatedSeedState = createSpoonGameState({ seed: '   ' });
    expect(generatedSeedState.seed).toMatch(/\S/);

    const positivePendingState = advanceSpoonGame({
      ...createSpoonGameState({ seed: 's11' }),
      phase: 'midday',
      turnInPhase: 2,
      turnIndex: 3,
      spoons: 1,
      pendingPhaseDelta: 1,
      chosenActions: [
        createChosenAction('20_min_ruhen', 'morning', 1),
        createChosenAction('medikamente_und_wasser', 'morning', 2),
        createChosenAction('arzttermin_wahrnehmen_light', 'midday', 1),
        createChosenAction('bitte_um_hilfe', 'midday', 2),
      ],
      feedbackKeys: [PHONE_FEEDBACK_KEY],
      latestFeedbackKey: PHONE_FEEDBACK_KEY,
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    });

    expect(positivePendingState.feedbackKeys).toContain(
      'games.spoonManager.system.pendingPhaseDeltaPositive',
    );
    expect(positivePendingState.pendingPhaseDelta).toBe(0);

    const finishedState = advanceSpoonGame({
      ...createSpoonGameState({ seed: 'finished-day' }),
      phase: 'evening',
      turnInPhase: 2,
      turnIndex: 5,
      spoons: 4,
      pendingPhaseDelta: 0,
      chosenActions: [
        createChosenAction('20_min_ruhen', 'morning', 1),
        createChosenAction('anrufen_absagen', 'morning', 2),
        createChosenAction('bitte_um_hilfe', 'midday', 1),
        createChosenAction('reste_essen', 'midday', 2),
        createChosenAction('frueh_hinlegen', 'evening', 1),
        createChosenAction('alles_liegen_lassen', 'evening', 2),
      ],
      feedbackKeys: ['games.spoonManager.actions.alles_liegen_lassen.feedback'],
      latestFeedbackKey:
        'games.spoonManager.actions.alles_liegen_lassen.feedback',
      awaitingAdvance: true,
      currentActionIds: [],
      triggeredEventIds: [],
    });

    expect(finishedState.status).toBe('stable');
    expect(advanceSpoonGame(finishedState)).toBe(finishedState);
  });

  it('handles custom seed-like inputs when hashing randomness', () => {
    const customSeed = {
      length: 1,
      codePointAt: () => undefined,
    } as unknown as string;

    const random = createSeededRandom(customSeed);

    expect(random()).toBeGreaterThanOrEqual(0);
    expect(random()).toBeLessThan(1);
  });
});
