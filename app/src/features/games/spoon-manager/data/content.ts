import type {
  GameAction,
  GameEvent,
  GamePhase,
  PhaseFlavor,
  ResultFlavor,
  StartFlavor,
} from '../types';

/**
 * Action tags that count as protective pacing choices.
 *
 * @remarks
 * The rule engine uses this single source so balancing logic and UI summaries
 * stay aligned when future content expands.
 */
export const SPOON_MANAGER_PROTECTIVE_TAGS = [
  'rest',
  'help',
  'cancel',
] as const;

/**
 * Start-of-day flavor pool.
 *
 * @returns All localized start text descriptors.
 */
export const getSpoonManagerStartFlavors = (): readonly StartFlavor[] =>
  START_FLAVORS;

/**
 * Phase context text pool.
 *
 * @returns All localized per-phase context descriptors.
 */
export const getSpoonManagerPhaseFlavors = (): readonly PhaseFlavor[] =>
  PHASE_FLAVORS;

/**
 * Selectable action pool for Spoon Manager.
 *
 * @returns All action definitions used by the generator.
 */
export const getSpoonManagerActions = (): readonly GameAction[] => ACTIONS;

/**
 * Random event pool for Spoon Manager.
 *
 * @returns All phase-boundary event definitions.
 */
export const getSpoonManagerEvents = (): readonly GameEvent[] => EVENTS;

/**
 * Result flavor text pool.
 *
 * @returns All localized result text descriptors.
 */
export const getSpoonManagerResultFlavors = (): readonly ResultFlavor[] =>
  RESULT_FLAVORS;

/**
 * Looks up an action definition by identifier.
 *
 * @param actionId - Stable action identifier.
 * @returns Matching action metadata or `undefined` for unknown ids.
 */
export const getSpoonManagerActionById = (
  actionId: string,
): GameAction | undefined => ACTION_BY_ID.get(actionId);

/**
 * Looks up a random event definition by identifier.
 *
 * @param eventId - Stable event identifier.
 * @returns Matching event metadata or `undefined` for unknown ids.
 */
export const getSpoonManagerEventById = (
  eventId: string,
): GameEvent | undefined => EVENT_BY_ID.get(eventId);

/**
 * Looks up a start-of-day flavor by identifier.
 *
 * @param flavorId - Stable flavor identifier.
 * @returns Matching start flavor metadata or `undefined`.
 */
export const getSpoonManagerStartFlavorById = (
  flavorId: string,
): StartFlavor | undefined => START_FLAVOR_BY_ID.get(flavorId);

/**
 * Looks up a phase context flavor by identifier.
 *
 * @param flavorId - Stable flavor identifier.
 * @returns Matching phase flavor metadata or `undefined`.
 */
export const getSpoonManagerPhaseFlavorById = (
  flavorId: string,
): PhaseFlavor | undefined => PHASE_FLAVOR_BY_ID.get(flavorId);

/**
 * Looks up a result flavor by identifier.
 *
 * @param flavorId - Stable flavor identifier.
 * @returns Matching result flavor metadata or `undefined`.
 */
export const getSpoonManagerResultFlavorById = (
  flavorId: string,
): ResultFlavor | undefined => RESULT_FLAVOR_BY_ID.get(flavorId);

/**
 * Filters phase context text definitions for a single phase.
 *
 * @param phase - Phase whose texts should be returned.
 * @returns Localized phase text descriptors.
 */
export const getSpoonManagerPhaseFlavorsForPhase = (
  phase: GamePhase,
): readonly PhaseFlavor[] => PHASE_FLAVORS_BY_PHASE.get(phase) ?? [];

const startFlavor = (id: string): StartFlavor => ({
  id,
  textKey: `games.spoonManager.startFlavors.${id}`,
});

const phaseFlavor = (phase: GamePhase, id: string): PhaseFlavor => ({
  id,
  phase,
  textKey: `games.spoonManager.phaseFlavors.${phase}.${id}`,
});

const action = (
  id: string,
  phase: GamePhase,
  immediateDelta: number,
  tags: GameAction['tags'],
  nextPhaseDelta?: number,
): GameAction => ({
  id,
  phase,
  titleKey: `games.spoonManager.actions.${id}.title`,
  feedbackKey: `games.spoonManager.actions.${id}.feedback`,
  immediateDelta,
  nextPhaseDelta,
  tags,
});

const event = (
  id: string,
  phaseBoundary: GameEvent['phaseBoundary'],
  delta: number,
): GameEvent => ({
  id,
  phaseBoundary,
  textKey: `games.spoonManager.events.${id}`,
  delta,
});

const resultFlavor = (
  status: ResultFlavor['status'],
  id: string,
): ResultFlavor => ({
  id: `${status}-${id}`,
  status,
  textKey: `games.spoonManager.results.flavors.${status}.${id}`,
});

const START_FLAVORS = [
  startFlavor('lowReserve'),
  startFlavor('slowStart'),
  startFlavor('sleepDidNotRestore'),
  startFlavor('slightlySteadier'),
  startFlavor('cautiousBeginning'),
  startFlavor('dayForWeighing'),
  startFlavor('notAnEasyDay'),
  startFlavor('littleBuffer'),
  startFlavor('everyChoiceCounts'),
  startFlavor('fragileEnergy'),
  startFlavor('morningAlreadyHeavy'),
  startFlavor('notEverythingAtOnce'),
  startFlavor('tightBudget'),
  startFlavor('surprisinglyCalm'),
  startFlavor('smartPacingCouldHelp'),
  startFlavor('middlingDay'),
  startFlavor('notEmptyButFarFromFit'),
  startFlavor('tacticsOverTempo'),
  startFlavor('okayButNotRobust'),
  startFlavor('smallThingsTurnBig'),
] as const satisfies readonly StartFlavor[];

const PHASE_FLAVORS = [
  phaseFlavor('morning', 'justGotUp'),
  phaseFlavor('morning', 'alreadyTooLoud'),
  phaseFlavor('morning', 'energyOnlyPartlyThere'),
  phaseFlavor('morning', 'manyOpenThings'),
  phaseFlavor('morning', 'earlyDecisionsMatter'),
  phaseFlavor('morning', 'smallThingsRelevant'),
  phaseFlavor('morning', 'needsClearChoice'),
  phaseFlavor('morning', 'easyToOverdo'),
  phaseFlavor('morning', 'bestToStartCarefully'),
  phaseFlavor('morning', 'prioritiesImmediately'),
  phaseFlavor('midday', 'morningWasNotFree'),
  phaseFlavor('midday', 'showsWhatIsLeft'),
  phaseFlavor('midday', 'dayOftenTipsNow'),
  phaseFlavor('midday', 'alreadyInvested'),
  phaseFlavor('midday', 'someRoomStill'),
  phaseFlavor('midday', 'feelItLater'),
  phaseFlavor('midday', 'reserveNotFresh'),
  phaseFlavor('midday', 'smallChoicesDouble'),
  phaseFlavor('midday', 'smartNotBig'),
  phaseFlavor('midday', 'restOfDayDependsHere'),
  phaseFlavor('evening', 'smallDecisionsNow'),
  phaseFlavor('evening', 'littleBufferLeft'),
  phaseFlavor('evening', 'stabilityOverProductivity'),
  phaseFlavor('evening', 'onlyIfTrulyNeeded'),
  phaseFlavor('evening', 'almostDoneNotYet'),
  phaseFlavor('evening', 'eveningAffectsTomorrow'),
  phaseFlavor('evening', 'everySkippedExtraLoop'),
  phaseFlavor('evening', 'roomGotTighter'),
  phaseFlavor('evening', 'reliefOverAmbition'),
  phaseFlavor('evening', 'unspectacularIsFine'),
] as const satisfies readonly PhaseFlavor[];

const ACTIONS = [
  action('duschen', 'morning', -3, ['hygiene', 'sensory']),
  action('nur_waschen_umziehen', 'morning', -1, ['hygiene']),
  action('fruehstueck_machen', 'morning', -2, ['food', 'household']),
  action('etwas_kleines_essen', 'morning', -1, ['food']),
  action('nachrichten_checken', 'morning', -1, ['admin', 'sensory']),
  action('kurz_whatsapp_antworten', 'morning', -1, ['social', 'admin']),
  action('anrufen_absagen', 'morning', 0, ['cancel', 'admin']),
  action('20_min_ruhen', 'morning', 1, ['rest']),
  action('im_dunkeln_liegen', 'morning', 1, ['rest', 'sensory']),
  action('hilfe_annehmen_fruestueck', 'morning', 1, ['help', 'food']),
  action('arzttermin_vorbereiten', 'morning', -2, ['admin', 'medical']),
  action('medikamente_und_wasser', 'morning', 0, ['food']),
  action('kleiner_einkauf', 'midday', -3, ['outside', 'sensory']),
  action('essen_bestellen', 'midday', -1, ['help', 'food']),
  action('kochen_einfach', 'midday', -2, ['food', 'household']),
  action('reste_essen', 'midday', 0, ['food']),
  action('kurzes_telefonat', 'midday', -2, ['social']),
  action('mail_beantworten', 'midday', -1, ['admin']),
  action('termin_organisieren', 'midday', -2, ['admin', 'medical']),
  action('reizpause', 'midday', 1, ['rest', 'sensory']),
  action('hinlegen_ohne_handy', 'midday', 1, ['rest']),
  action('bitte_um_hilfe', 'midday', 1, ['help']),
  action('paket_herunterholen', 'midday', -1, ['outside', 'household']),
  action(
    'arzttermin_wahrnehmen_light',
    'midday',
    -3,
    ['medical', 'outside', 'sensory'],
    -1,
  ),
  action('besuch_kurz_empfangen', 'evening', -2, ['social', 'sensory']),
  action('kueche_noch_machen', 'evening', -2, ['household']),
  action('waesche_noch_starten', 'evening', -1, ['household']),
  action('alles_liegen_lassen', 'evening', 0, ['cancel']),
  action('frueh_hinlegen', 'evening', 1, ['rest']),
  action('licht_reduzieren_ruhen', 'evening', 1, ['rest', 'sensory']),
  action('noch_mails_checken', 'evening', -1, ['admin', 'sensory']),
  action('kurz_aufraeumen', 'evening', -1, ['household']),
  action('essen_einfach_holen', 'evening', 0, ['food', 'help']),
  action('abendroutine_kurz', 'evening', -1, ['hygiene']),
  action('abendroutine_lang', 'evening', -2, ['hygiene', 'sensory']),
  action('sofort_absagen_fuer_morgen', 'evening', 0, ['cancel', 'admin']),
] as const satisfies readonly GameAction[];

const EVENTS = [
  event('paketbote', 'afterMorning', -1),
  event('wetterkippt', 'afterMorning', -1),
  event('hilfe_verfuegbar', 'afterMorning', 1),
  event('essen_ist_schon_da', 'afterMorning', 1),
  event('ungeplanter_anruf', 'afterMorning', -1),
  event('termin_entfaellt', 'afterMorning', 1),
  event('kopfschmerz_zieht_auf', 'afterMorning', -1),
  event('etwas_dauert_laenger', 'afterMorning', -1),
  event('kurze_ruhemoeglichkeit', 'afterMorning', 1),
  event('nachricht_muss_nicht_sofort_beantwortet_werden', 'afterMorning', 0),
  event('reize_haengen_nach', 'afterMidday', -1),
  event('hilfe_fuer_haushalt', 'afterMidday', 1),
  event('arznei_abholen_muss_warten', 'afterMidday', 0),
  event('licht_und_geraeusch_werden_zu_viel', 'afterMidday', -1),
  event('abend_ist_ruhiger_als_gedacht', 'afterMidday', 1),
  event('spontane_nachfrage_von_aussen', 'afterMidday', -1),
  event('etwas_ist_schon_erledigt', 'afterMidday', 1),
  event('appetit_ist_niedrig', 'afterMidday', -1),
  event('ruhe_greift', 'afterMidday', 1),
  event('abendliches_umplanen', 'afterMidday', 0),
] as const satisfies readonly GameEvent[];

const RESULT_FLAVORS = [
  resultFlavor('stable', 'lessWasMore'),
  resultFlavor('stable', 'surprisinglyStable'),
  resultFlavor('stable', 'goodDivisionGoodDay'),
  resultFlavor('stable', 'keptReserves'),
  resultFlavor('stable', 'notSpectacularButRight'),
  resultFlavor('stable', 'pacingMadeDifference'),
  resultFlavor('stable', 'dayStayedWithinBounds'),
  resultFlavor('stable', 'solidDay'),
  resultFlavor('narrow', 'tightButOkay'),
  resultFlavor('narrow', 'notMuchMore'),
  resultFlavor('narrow', 'tightPacingCounts'),
  resultFlavor('narrow', 'lineWasClose'),
  resultFlavor('narrow', 'justWithinBounds'),
  resultFlavor('narrow', 'cautionWasNotOverdoingIt'),
  resultFlavor('narrow', 'doneWithoutBuffer'),
  resultFlavor('narrow', 'gotThroughBarely'),
  resultFlavor('crash', 'oneSpoonTooMany'),
  resultFlavor('crash', 'dayTippedOver'),
  resultFlavor('crash', 'smallThingsAddedUp'),
  resultFlavor('crash', 'reserveWentFaster'),
  resultFlavor('crash', 'betweenNeededAndTooMuch'),
  resultFlavor('crash', 'lessRoomThanHoped'),
  resultFlavor('crash', 'lessWouldHaveProtected'),
  resultFlavor('crash', 'sumNotSingleThing'),
] as const satisfies readonly ResultFlavor[];

const ACTION_BY_ID = new Map(ACTIONS.map((entry) => [entry.id, entry]));
const EVENT_BY_ID = new Map(EVENTS.map((entry) => [entry.id, entry]));
const START_FLAVOR_BY_ID = new Map(
  START_FLAVORS.map((entry) => [entry.id, entry]),
);
const PHASE_FLAVOR_BY_ID = new Map(
  PHASE_FLAVORS.map((entry) => [entry.id, entry]),
);
const RESULT_FLAVOR_BY_ID = new Map(
  RESULT_FLAVORS.map((entry) => [entry.id, entry]),
);
const PHASE_FLAVORS_BY_PHASE = new Map<GamePhase, readonly PhaseFlavor[]>([
  ['morning', PHASE_FLAVORS.filter((entry) => entry.phase === 'morning')],
  ['midday', PHASE_FLAVORS.filter((entry) => entry.phase === 'midday')],
  ['evening', PHASE_FLAVORS.filter((entry) => entry.phase === 'evening')],
]);
