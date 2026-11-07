import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGameCatalog } from '../data/gameCatalog';

/**
 * Shows the Games hub with the available mini-games.
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
        {gameCatalog.map((game) => (
          <Link key={game.id} className="games-hub__card" to={game.path}>
            <div className="games-hub__card-header">
              <h3>{t(game.titleKey)}</h3>
            </div>
            <p>{t(game.descriptionKey)}</p>
            <span className="games-hub__cta">{t('games.cta.playNow')}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
