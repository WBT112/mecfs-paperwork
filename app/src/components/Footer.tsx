import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRepoUrl } from '../lib/repo';
import { getSponsorUrl } from '../lib/funding';

export default function Footer() {
  const { t } = useTranslation();
  const repoUrl = getRepoUrl();
  const sponsorUrl = getSponsorUrl();

  return (
    <footer className="app__footer">
      <div className="app__footer-content">
        <nav className="app__footer-links" aria-label={t('footerNavLabel')}>
          <Link
            className="app__footer-link app__footer-link--left"
            to="/imprint"
          >
            {t('footerImprint')}
          </Link>
          <Link
            className="app__footer-link app__footer-link--center-left"
            to="/privacy"
          >
            {t('footerPrivacy')}
          </Link>
          {sponsorUrl ? (
            <a
              className="app__footer-link app__footer-link--center-right"
              href={sponsorUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t('footerSponsor')}
            </a>
          ) : null}
          {repoUrl ? (
            <a
              className="app__footer-link app__footer-link--right"
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
