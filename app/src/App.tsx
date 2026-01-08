import type { ChangeEvent } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from './i18n/useLocale';
import { SupportedLocale } from './i18n/locale';
import FormpackDetailPage from './pages/FormpackDetailPage';
import FormpackListPage from './pages/FormpackListPage';

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
          </div>
        </div>
      </header>
      <main className="app__content">
        <Routes>
          <Route path="/" element={<Navigate to="/formpacks" replace />} />
          <Route path="/formpacks" element={<FormpackListPage />} />
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
