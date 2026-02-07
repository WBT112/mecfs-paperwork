import { useCallback, useEffect, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from './i18n/useLocale';
import type { SupportedLocale } from './i18n/locale';
import { startFormpackBackgroundRefresh } from './formpacks/backgroundRefresh';
import Footer from './components/Footer';
import ThemeSwitcher from './components/ThemeSwitcher';
import TopbarActions from './components/TopbarActions';
import StagingMarker from './components/StagingMarker';
import AppRoutes from './AppRoutes';

/**
 * App shell for the offline-first paperwork UI.
 * Keeping this minimal avoids implicit data flows before storage is defined.
 */
export default function App() {
  const { t } = useTranslation();
  const { locale, setLocale, supportedLocales } = useLocale();

  const handleLocaleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setLocale(event.target.value as SupportedLocale).catch(() => undefined);
    },
    [setLocale],
  );

  useEffect(() => {
    const stopRefresh = startFormpackBackgroundRefresh();

    return () => {
      stopRefresh();
    };
  }, []);

  return (
    <div className="app">
      <StagingMarker />
      <header className="app__header">
        <div className="app__header-content">
          <div className="app__header-brand">
            <h1>
              <Link to="/formpacks" className="app__brand-link">
                {t('appTitle')}
              </Link>
            </h1>
            <p className="app__subtitle">{t('appSubtitle')}</p>
          </div>
          <div className="app__header-actions">
            <TopbarActions />
            <div className="app__header-settings">
              <div className="app__locale-switch">
                <label htmlFor="locale-select">{t('languageLabel')}</label>
                <div className="app__select-wrapper">
                  <select
                    id="locale-select"
                    className="app__select"
                    value={locale}
                    onChange={handleLocaleChange}
                  >
                    {supportedLocales.map((optionLocale) => (
                      <option key={optionLocale} value={optionLocale}>
                        {t(`languageOptions.${optionLocale}`)}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="app__select-chevron"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4.66602 6.66602L7.99935 9.99935L11.3327 6.66602"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      </header>
      <main className="app__content">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}
