import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../../i18n/useLocale';
import {
  getMeBingoPromptLabel,
  ME_BINGO_FREE_FIELD_ID,
} from '../me-bingo/data/content';
import { ME_BINGO_BOARD_SIZE } from '../me-bingo/logic/meBingo';
import { useMeBingoGame } from '../me-bingo/hooks/useMeBingoGame';

const TOTAL_BOARD_CELLS = ME_BINGO_BOARD_SIZE * ME_BINGO_BOARD_SIZE;

/**
 * Renders the playable ME Bingo MVP.
 *
 * @returns The rendered ME Bingo game page.
 */
export default function MeBingoPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const {
    game,
    stats,
    announcement,
    startGame,
    resetGame,
    drawNewCard,
    toggleCell,
  } = useMeBingoGame();
  const isGameIdle = game === null;
  const liveMessage = announcement
    ? t(`games.meBingo.liveRegion.${announcement}`)
    : '';

  return (
    <section className="app__card games-bingo">
      <div className="games-bingo__header">
        <div>
          <p className="games-bingo__eyebrow">{t('games.hubTitle')}</p>
          <h2>{t('games.meBingo.pageTitle')}</h2>
          <p className="app__subtitle">{t('games.meBingo.pageDescription')}</p>
        </div>
        <Link className="app__link games-bingo__back-link" to="/games">
          {t('games.backToHub')}
        </Link>
      </div>

      <output className="sr-only" aria-live="polite">
        {liveMessage}
      </output>

      {isGameIdle ? (
        <div className="games-bingo__layout">
          <section className="games-bingo__panel games-bingo__panel--intro">
            <h3>{t('games.meBingo.introTitle')}</h3>
            <p>{t('games.meBingo.introBody')}</p>
            <p>{t('games.meBingo.instructions')}</p>
            <button
              type="button"
              className="app__button games-bingo__primary-action"
              onClick={startGame}
            >
              {t('games.meBingo.startAction')}
            </button>
          </section>
          <StatsPanel
            title={t('games.meBingo.stats.title')}
            stats={stats}
            statusLabel={t(`games.meBingo.status.${stats.lastStatus}`)}
            t={t}
          />
        </div>
      ) : (
        <ActiveGameSection
          game={game}
          locale={locale}
          stats={stats}
          onDrawNewCard={drawNewCard}
          onResetGame={resetGame}
          onToggleCell={toggleCell}
          t={t}
        />
      )}
    </section>
  );
}

function ActiveGameSection({
  game,
  locale,
  stats,
  onDrawNewCard,
  onResetGame,
  onToggleCell,
  t,
}: {
  game: NonNullable<ReturnType<typeof useMeBingoGame>['game']>;
  locale: ReturnType<typeof useLocale>['locale'];
  stats: ReturnType<typeof useMeBingoGame>['stats'];
  onDrawNewCard: () => void;
  onResetGame: () => void;
  onToggleCell: (cellId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const isCompleted = game.status === 'bingo' || game.status === 'full-card';
  const resultLabelKey =
    game.status === 'full-card'
      ? 'games.meBingo.result.labelFullCard'
      : 'games.meBingo.result.labelBingo';
  const resultSummaryKey = getResultSummaryKey(game.status, game.lineCount);
  const bannerTitleKey =
    game.status === 'full-card'
      ? 'games.meBingo.banner.fullCardTitle'
      : 'games.meBingo.banner.bingoTitle';
  const bannerBodyKey =
    game.status === 'full-card'
      ? 'games.meBingo.banner.fullCardBody'
      : 'games.meBingo.banner.bingoBody';
  const resultDuration = getResultDuration(game);

  return (
    <>
      <div className="games-bingo__toolbar">
        <button type="button" className="app__button" onClick={onDrawNewCard}>
          {t('games.meBingo.newCardAction')}
        </button>
        <button type="button" className="app__button" onClick={onResetGame}>
          {t('games.meBingo.resetAction')}
        </button>
      </div>

      {isCompleted ? (
        <section
          className="games-bingo__banner"
          aria-labelledby="me-bingo-banner-title"
        >
          <p className="games-bingo__banner-kicker">
            {t('games.meBingo.result.kicker')}
          </p>
          <h3 id="me-bingo-banner-title">{t(bannerTitleKey)}</h3>
          <p>{t(bannerBodyKey)}</p>
        </section>
      ) : null}

      <div className="games-bingo__layout">
        <section className="games-bingo__board-panel">
          <div className="games-bingo__board-heading">
            <h3>{t('games.meBingo.boardTitle')}</h3>
            <p>{t('games.meBingo.boardHint')}</p>
          </div>
          <div className="games-bingo__board-scroll">
            <ul
              className="games-bingo__board"
              aria-label={t('games.meBingo.boardLabel')}
            >
              {game.board.map((cell, index) => {
                const row = Math.floor(index / ME_BINGO_BOARD_SIZE) + 1;
                const column = (index % ME_BINGO_BOARD_SIZE) + 1;
                const label = getCellLabel(
                  cell.isFree,
                  cell.entryId,
                  locale,
                  t,
                );
                const cellStateKey = getCellStateKey(
                  cell.isFree,
                  cell.isMarked,
                );
                const markerLabel = getCellMarkerLabel(cell.isFree, t);

                return (
                  <li key={cell.cellId} className="games-bingo__board-item">
                    <button
                      type="button"
                      className={buildCellClassName(cell.isMarked, cell.isFree)}
                      onClick={() => onToggleCell(cell.cellId)}
                      aria-pressed={cell.isFree ? undefined : cell.isMarked}
                      aria-label={t('games.meBingo.cellAriaLabel', {
                        label,
                        row,
                        column,
                        state: t(cellStateKey),
                      })}
                      disabled={cell.isFree}
                      data-testid={cell.cellId}
                      data-free-field={cell.isFree ? 'true' : 'false'}
                    >
                      <span className="games-bingo__cell-text">{label}</span>
                      {markerLabel ? (
                        <span
                          className="games-bingo__cell-marker"
                          aria-hidden="true"
                        >
                          {markerLabel}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <div className="games-bingo__sidebar">
          <section className="games-bingo__panel games-bingo__panel--progress">
            <h3>{t('games.meBingo.progress.title')}</h3>
            <dl className="games-bingo__metrics">
              <div>
                <dt>{t('games.meBingo.progress.marked')}</dt>
                <dd>
                  {game.markedCount}/{TOTAL_BOARD_CELLS}
                </dd>
              </div>
              <div>
                <dt>{t('games.meBingo.progress.lines')}</dt>
                <dd>{game.lineCount}</dd>
              </div>
              <div>
                <dt>{t('games.meBingo.progress.status')}</dt>
                <dd>{t(`games.meBingo.status.${game.status}`)}</dd>
              </div>
            </dl>
          </section>

          {isCompleted ? (
            <section className="games-bingo__result-card">
              <p className="games-bingo__result-label">{t(resultLabelKey)}</p>
              <h3>{t(resultSummaryKey)}</h3>
              <p>
                {t('games.meBingo.result.marked', {
                  count: game.markedCount,
                  total: TOTAL_BOARD_CELLS,
                })}
              </p>
              <p>
                {t('games.meBingo.result.lines', {
                  count: game.lineCount,
                })}
              </p>
              {resultDuration ? (
                <p>
                  {t('games.meBingo.result.duration', {
                    duration: resultDuration,
                  })}
                </p>
              ) : null}
              <p className="games-bingo__result-hint">
                {t('games.meBingo.result.shareHint')}
              </p>
            </section>
          ) : null}

          <StatsPanel
            className="games-bingo__panel--stats"
            title={t('games.meBingo.stats.title')}
            stats={stats}
            statusLabel={t(`games.meBingo.status.${stats.lastStatus}`)}
            t={t}
          />
        </div>
      </div>
    </>
  );
}

function StatsPanel({
  className,
  title,
  stats,
  statusLabel,
  t,
}: {
  className?: string;
  title: string;
  stats: {
    playedRounds: number;
    bingoCount: number;
    fullCardCount: number;
    bestLineCount: number;
  };
  statusLabel: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <section className={`games-bingo__panel ${className ?? ''}`.trim()}>
      <h3>{title}</h3>
      <dl className="games-bingo__metrics">
        <div>
          <dt>{t('games.meBingo.stats.playedRounds')}</dt>
          <dd>{stats.playedRounds}</dd>
        </div>
        <div>
          <dt>{t('games.meBingo.stats.bingos')}</dt>
          <dd>{stats.bingoCount}</dd>
        </div>
        <div>
          <dt>{t('games.meBingo.stats.fullCards')}</dt>
          <dd>{stats.fullCardCount}</dd>
        </div>
        <div>
          <dt>{t('games.meBingo.stats.bestLines')}</dt>
          <dd>{stats.bestLineCount}</dd>
        </div>
        <div>
          <dt>{t('games.meBingo.stats.lastStatus')}</dt>
          <dd>{statusLabel}</dd>
        </div>
      </dl>
    </section>
  );
}

const formatDuration = (durationMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getResultSummaryKey = (status: string, lineCount: number): string => {
  if (status === 'full-card') {
    return 'games.meBingo.result.summaryFullCard';
  }

  if (lineCount > 1) {
    return 'games.meBingo.result.summaryBingoMany';
  }

  return 'games.meBingo.result.summaryBingoOne';
};

const getResultDuration = (
  game: NonNullable<ReturnType<typeof useMeBingoGame>['game']>,
): string | null => {
  const resultTimestamp =
    game.status === 'full-card' ? game.fullCardAt : game.bingoAt;
  if (resultTimestamp === null) {
    return null;
  }

  return formatDuration(resultTimestamp - game.startedAt);
};

const getCellLabel = (
  isFree: boolean,
  entryId: string,
  locale: ReturnType<typeof useLocale>['locale'],
  t: (key: string) => string,
): string => {
  if (isFree && entryId === ME_BINGO_FREE_FIELD_ID) {
    return t('games.meBingo.freeFieldLabel');
  }

  return getMeBingoPromptLabel(entryId, locale);
};

const getCellStateKey = (isFree: boolean, isMarked: boolean): string => {
  if (isFree) {
    return 'games.meBingo.cellState.free';
  }

  return isMarked
    ? 'games.meBingo.cellState.marked'
    : 'games.meBingo.cellState.unmarked';
};

const getCellMarkerLabel = (
  isFree: boolean,
  t: (key: string) => string,
): string => {
  if (isFree) {
    return t('games.meBingo.freeFieldBadge');
  }

  return '';
};

const buildCellClassName = (isMarked: boolean, isFree: boolean): string => {
  const classNames = ['games-bingo__cell-button'];
  if (isMarked) {
    classNames.push('games-bingo__cell-button--marked');
  }
  if (isFree) {
    classNames.push('games-bingo__cell-button--free');
  }
  return classNames.join(' ');
};
