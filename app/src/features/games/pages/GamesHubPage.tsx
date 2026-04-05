import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGameCatalog } from '../data/gameCatalog';

/**
 * Shows the Games hub with active and planned mini-games.
 *
 * @returns The rendered Games hub section.
 */
export default function GamesHubPage() {
  const { t } = useTranslation();
  const gameCatalog = getGameCatalog();

  return (
    <section className="app__card games-hub">
      <div className="app__card-header">
        <div>
          <h2>{t('games.hubTitle')}</h2>
          <p className="app__subtitle">{t('games.hubDescription')}</p>
        </div>
      </div>
      <p className="games-hub__intro">{t('games.hubIntro')}</p>
      <div className="games-hub__grid">
        {gameCatalog.map((game) =>
          game.availability === 'available' ? (
            <Link key={game.id} className="games-hub__card" to={game.path}>
              <div className="games-hub__card-header">
                <span className="games-hub__status games-hub__status--active">
                  {t('games.status.available')}
                </span>
                <h3>{t(game.titleKey)}</h3>
              </div>
              <p>{t(game.descriptionKey)}</p>
              <span className="games-hub__cta">{t('games.cta.playNow')}</span>
            </Link>
          ) : (
            <article
              key={game.id}
              className="games-hub__card games-hub__card--coming-soon"
              aria-labelledby={`${game.id}-title`}
            >
              <div className="games-hub__card-header">
                <span className="games-hub__status games-hub__status--coming-soon">
                  {t('games.status.comingSoon')}
                </span>
                <h3 id={`${game.id}-title`}>{t(game.titleKey)}</h3>
              </div>
              <p>{t(game.descriptionKey)}</p>
              <span className="games-hub__cta games-hub__cta--muted">
                {t('games.cta.comingSoon')}
              </span>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
