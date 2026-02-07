import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getRepoUrl } from '../lib/repo';
import { getSponsorUrl } from '../lib/funding';
import { APP_VERSION, BUILD_DATE_ISO, formatBuildDate } from '../lib/version';

export default memo(function Footer() {
  const { t, i18n } = useTranslation();
  const repoUrl = getRepoUrl();
  const sponsorUrl = getSponsorUrl();
  const buildDateLabel = formatBuildDate(i18n.language);

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
          <Link
            className="app__footer-link app__footer-link--center"
            to="/help"
          >
            {t('footerHelp')}
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
        <p className="app__footer-version" title={BUILD_DATE_ISO}>
          {t('footerVersionLabel', {
            version: APP_VERSION,
            date: buildDateLabel,
          })}
        </p>
      </div>
    </footer>
  );
});
