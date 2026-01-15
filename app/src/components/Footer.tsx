import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRepoUrl } from '../lib/repo';

export default function Footer() {
  const { t } = useTranslation();
  const repoUrl = getRepoUrl();

  return (
    <footer className="app__footer">
      <div className="app__footer-content">
        <nav className="app__footer-links" aria-label={t('footerNavLabel')}>
          <Link className="app__footer-link" to="/imprint">
            {t('footerImprint')}
          </Link>
          <Link className="app__footer-link" to="/privacy">
            {t('footerPrivacy')}
          </Link>
          {repoUrl ? (
            <a
              className="app__footer-link app__footer-link--github"
              href={repoUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t('footerGithub')}
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
