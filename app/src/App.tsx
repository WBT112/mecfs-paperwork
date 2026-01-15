import type { ChangeEvent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from './i18n/useLocale';
import { SupportedLocale } from './i18n/locale';
import Footer from './components/Footer';
import FormpackDetailPage from './pages/FormpackDetailPage';
import FormpackListPage from './pages/FormpackListPage';
import LegalPage from './pages/LegalPage';
import imprintContent from './content/legal/imprint.md?raw';
import privacyContent from './content/legal/privacy.md?raw';

/**
 * App shell for the offline-first paperwork UI.
 * Keeping this minimal avoids implicit data flows before storage is defined.
 */
export default function App() {
  const { t } = useTranslation();
  const { locale, setLocale, supportedLocales } = useLocale();

  const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value as SupportedLocale);
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__header-content">
          <div>
            <h1>{t('appTitle')}</h1>
            <p className="app__subtitle">{t('appSubtitle')}</p>
          </div>
          <div className="app__locale-switch">
            <label htmlFor="locale-select">{t('languageLabel')}</label>
            <div className="app__select-wrapper">
              <select
                id="locale-select"
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
                  stroke="#6B7280"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </header>
      <main className="app__content">
        <Routes>
          <Route path="/" element={<Navigate to="/formpacks" replace />} />
          <Route path="/formpacks" element={<FormpackListPage />} />
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
          <Route
            path="/imprint"
            element={<LegalPage content={imprintContent} />}
          />
          <Route
            path="/privacy"
            element={<LegalPage content={privacyContent} />}
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
