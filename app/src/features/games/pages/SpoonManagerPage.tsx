import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getSpoonManagerActionById,
  getSpoonManagerPhaseFlavorById,
  getSpoonManagerResultFlavorById,
  getSpoonManagerStartFlavorById,
} from '../spoon-manager/data/content';
import {
  summarizeSpoonGameChoices,
  isDemandingAction,
  isProtectiveAction,
} from '../spoon-manager/logic/spoonManager';
import { useSpoonManagerGame } from '../spoon-manager/hooks/useSpoonManagerGame';
import type { SpoonGameStats } from '../spoon-manager/types';

const FALLBACK_INTRO_KEY = 'games.spoonManager.intro.fallback';

/**
 * Renders the playable Spoon Manager mini-game.
 *
 * @returns The rendered Spoon Manager page.
 */
export default function SpoonManagerPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const seedOverride = searchParams.get('seed');
  const { game, stats, startGame, restartGame, chooseAction, advance } =
    useSpoonManagerGame(seedOverride);
  const isIdle = game === null;
  const liveMessage = isIdle
    ? ''
    : [
        ...game.feedbackKeys.map((key) => t(key)),
        game.status === 'playing'
          ? ''
          : t(`games.spoonManager.status.${game.status}`),
      ]
        .filter(Boolean)
        .join(' ');

  return (
    <section className="app__card games-spoon">
      <div className="games-spoon__header">
        <div>
          <p className="games-spoon__eyebrow">{t('games.hubTitle')}</p>
          <h2>{t('games.spoonManager.pageTitle')}</h2>
          <p className="app__subtitle">
            {t('games.spoonManager.pageDescription')}
          </p>
        </div>
        <Link className="app__link games-spoon__back-link" to="/games">
          {t('games.backToHub')}
        </Link>
      </div>

      <output className="sr-only" aria-live="polite">
        {liveMessage}
      </output>

      {isIdle ? (
        <div className="games-spoon__layout">
          <section className="games-spoon__panel games-spoon__panel--intro">
            <h3>{t('games.spoonManager.intro.title')}</h3>
            <p>{t('games.spoonManager.intro.body')}</p>
            <p>{t('games.spoonManager.intro.help')}</p>
            <button
              type="button"
              className="app__button games-spoon__primary-action"
              onClick={startGame}
            >
              {t('games.spoonManager.intro.startAction')}
            </button>
          </section>
          <StatsPanel stats={stats} t={t} />
        </div>
      ) : (
        <ActiveSpoonGame
          game={game}
          stats={stats}
          onAdvance={advance}
          onChooseAction={chooseAction}
          onRestart={restartGame}
          t={t}
        />
      )}
    </section>
  );
}

function ActiveSpoonGame({
  game,
  stats,
  onAdvance,
  onChooseAction,
  onRestart,
  t,
}: {
  game: NonNullable<ReturnType<typeof useSpoonManagerGame>['game']>;
  stats: SpoonGameStats;
  onAdvance: () => void;
  onChooseAction: (actionId: string) => void;
  onRestart: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const startFlavor =
    getSpoonManagerStartFlavorById(game.startFlavorId)?.textKey ??
    FALLBACK_INTRO_KEY;
  const phaseFlavor =
    getSpoonManagerPhaseFlavorById(game.phaseFlavorId)?.textKey ??
    FALLBACK_INTRO_KEY;
  const actionSummary = summarizeSpoonGameChoices(game.chosenActions);
  const resultFlavor =
    game.resultFlavorId === null
      ? null
      : (getSpoonManagerResultFlavorById(game.resultFlavorId)?.textKey ?? null);
  const isFinished = game.status !== 'playing';
  const eventFeedbackKeys = game.feedbackKeys.filter((feedbackKey) =>
    isEventFeedbackKey(feedbackKey),
  );
  const otherFeedbackKeys = game.feedbackKeys.filter(
    (feedbackKey) => !isEventFeedbackKey(feedbackKey),
  );

  return (
    <>
      <div className="games-spoon__toolbar">
        <button type="button" className="app__button" onClick={onRestart}>
          {t('games.spoonManager.actions.restart')}
        </button>
      </div>

      <div className="games-spoon__layout">
        <div className="games-spoon__main">
          <section className="games-spoon__panel games-spoon__panel--status">
            <p className="games-spoon__kicker">
              {t('games.spoonManager.dayKicker')}
            </p>
            <h3>{t(startFlavor)}</h3>
            <dl className="games-spoon__metrics">
              <div>
                <dt>{t('games.spoonManager.statusPanel.spoons')}</dt>
                <dd>{game.spoons}</dd>
              </div>
              <div>
                <dt>{t('games.spoonManager.statusPanel.phase')}</dt>
                <dd>{t(`games.spoonManager.phases.${game.phase}`)}</dd>
              </div>
              <div>
                <dt>{t('games.spoonManager.statusPanel.turnInPhase')}</dt>
                <dd>{game.turnInPhase}/2</dd>
              </div>
              <div>
                <dt>{t('games.spoonManager.statusPanel.dayProgress')}</dt>
                <dd>{Math.min(game.turnIndex + 1, 6)}/6</dd>
              </div>
            </dl>
          </section>

          {isFinished ? null : (
            <section className="games-spoon__panel games-spoon__panel--context">
              <p className="games-spoon__kicker">
                {t('games.spoonManager.currentPhaseKicker')}
              </p>
              <h3>{t(phaseFlavor)}</h3>
              <p>{t('games.spoonManager.currentTurnPrompt')}</p>
            </section>
          )}

          {isFinished ? null : (
            <section className="games-spoon__panel games-spoon__panel--actions">
              <h3>{t('games.spoonManager.actions.title')}</h3>
              <div className="games-spoon__action-list">
                {game.currentActionIds.map((actionId) => {
                  const action = getSpoonManagerActionById(actionId);
                  if (!action) {
                    return null;
                  }

                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="games-spoon__action-button"
                      onClick={() => onChooseAction(action.id)}
                      disabled={game.awaitingAdvance}
                      aria-describedby={`${action.id}-meta`}
                      data-testid={`spoon-action-${action.id}`}
                    >
                      <span className="games-spoon__action-title">
                        {t(action.titleKey)}
                      </span>
                      <span
                        id={`${action.id}-meta`}
                        className="games-spoon__action-meta"
                      >
                        {formatActionMeta(action, t)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {eventFeedbackKeys.length > 0 ? (
            <section className="games-spoon__panel games-spoon__panel--event">
              <p className="games-spoon__kicker">
                {t('games.spoonManager.feedback.eventKicker')}
              </p>
              <h3>{t('games.spoonManager.feedback.eventTitle')}</h3>
              <div className="games-spoon__feedback-list">
                {eventFeedbackKeys.map((feedbackKey) => (
                  <p key={feedbackKey}>{t(feedbackKey)}</p>
                ))}
              </div>
            </section>
          ) : null}

          {otherFeedbackKeys.length > 0 ? (
            <section className="games-spoon__panel games-spoon__panel--feedback">
              <h3>{t('games.spoonManager.feedback.title')}</h3>
              <div className="games-spoon__feedback-list">
                {otherFeedbackKeys.map((feedbackKey) => (
                  <p key={feedbackKey}>{t(feedbackKey)}</p>
                ))}
              </div>
              {game.awaitingAdvance ? (
                <button
                  type="button"
                  className="app__button"
                  onClick={onAdvance}
                >
                  {t('games.spoonManager.feedback.continueAction')}
                </button>
              ) : null}
            </section>
          ) : null}

          {isFinished ? (
            <section className="games-spoon__result-card">
              <p className="games-spoon__result-label">
                {t(`games.spoonManager.status.${game.status}`)}
              </p>
              <h3>
                {resultFlavor
                  ? t(resultFlavor)
                  : t('games.spoonManager.intro.fallback')}
              </h3>
              <dl className="games-spoon__metrics">
                <div>
                  <dt>{t('games.spoonManager.result.remainingSpoons')}</dt>
                  <dd>{game.spoons}</dd>
                </div>
                <div>
                  <dt>{t('games.spoonManager.result.protectiveChoices')}</dt>
                  <dd>{actionSummary.protectiveCount}</dd>
                </div>
                <div>
                  <dt>{t('games.spoonManager.result.demandingChoices')}</dt>
                  <dd>{actionSummary.demandingCount}</dd>
                </div>
              </dl>
              <div className="games-spoon__result-actions">
                <button
                  type="button"
                  className="app__button"
                  onClick={onRestart}
                >
                  {t('games.spoonManager.result.restartAction')}
                </button>
                <Link className="app__link" to="/games">
                  {t('games.spoonManager.result.backAction')}
                </Link>
              </div>
            </section>
          ) : null}
        </div>

        <div className="games-spoon__sidebar">
          <StatsPanel stats={stats} t={t} />
          <section className="games-spoon__panel games-spoon__panel--legend">
            <h3>{t('games.spoonManager.legend.title')}</h3>
            <ul className="games-spoon__legend-list">
              <li>{t('games.spoonManager.legend.protective')}</li>
              <li>{t('games.spoonManager.legend.demanding')}</li>
              <li>{t('games.spoonManager.legend.delayed')}</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function StatsPanel({
  stats,
  t,
}: {
  stats: SpoonGameStats;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <section className="games-spoon__panel games-spoon__panel--stats">
      <h3>{t('games.spoonManager.stats.title')}</h3>
      <dl className="games-spoon__metrics">
        <div>
          <dt>{t('games.spoonManager.stats.totalRuns')}</dt>
          <dd>{stats.totalRuns}</dd>
        </div>
        <div>
          <dt>{t('games.spoonManager.stats.stableRuns')}</dt>
          <dd>{stats.stableRuns}</dd>
        </div>
        <div>
          <dt>{t('games.spoonManager.stats.narrowRuns')}</dt>
          <dd>{stats.narrowRuns}</dd>
        </div>
        <div>
          <dt>{t('games.spoonManager.stats.crashRuns')}</dt>
          <dd>{stats.crashRuns}</dd>
        </div>
        <div>
          <dt>{t('games.spoonManager.stats.bestRemainingSpoons')}</dt>
          <dd>
            {stats.bestRemainingSpoons ?? t('games.spoonManager.stats.none')}
          </dd>
        </div>
        <div>
          <dt>{t('games.spoonManager.stats.lastStatus')}</dt>
          <dd>
            {stats.lastStatus
              ? t(`games.spoonManager.status.${stats.lastStatus}`)
              : t('games.spoonManager.stats.none')}
          </dd>
        </div>
      </dl>
    </section>
  );
}

const formatActionMeta = (
  action: NonNullable<ReturnType<typeof getSpoonManagerActionById>>,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  const parts = [
    formatDelta(action.immediateDelta, t),
    resolveActionToneLabel(action, t),
  ];

  if (action.nextPhaseDelta) {
    parts.push(
      t('games.spoonManager.actionMeta.nextPhaseDelta', {
        delta: formatSignedNumber(action.nextPhaseDelta),
      }),
    );
  }

  return parts.join(' • ');
};

const formatDelta = (
  delta: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string =>
  t('games.spoonManager.actionMeta.delta', {
    delta: formatSignedNumber(delta),
  });

const formatSignedNumber = (value: number): string =>
  value > 0 ? `+${value}` : String(value);

const resolveActionToneLabel = (
  action: NonNullable<ReturnType<typeof getSpoonManagerActionById>>,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  if (isProtectiveAction(action)) {
    return t('games.spoonManager.actionMeta.protective');
  }

  if (isDemandingAction(action)) {
    return t('games.spoonManager.actionMeta.demanding');
  }

  return t('games.spoonManager.actionMeta.moderate');
};

const isEventFeedbackKey = (feedbackKey: string): boolean =>
  feedbackKey.startsWith('games.spoonManager.events.');
