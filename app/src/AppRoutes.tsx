import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FormpackDetailPage = lazy(() => import('./pages/FormpackDetailPage'));
const FormpackListPage = lazy(() => import('./pages/FormpackListPage'));
const GamesHubPage = lazy(() => import('./features/games/pages/GamesHubPage'));
const MeBingoPage = lazy(() => import('./features/games/pages/MeBingoPage'));
const SpoonManagerPage = lazy(
  () => import('./features/games/pages/SpoonManagerPage'),
);
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ImprintPage = lazy(() => import('./pages/ImprintPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

const RouteFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="app__route-loading" aria-live="polite" aria-busy="true">
      {t('routeLoading')}
    </div>
  );
};

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/formpacks" replace />} />
        <Route path="/formpacks" element={<FormpackListPage />} />
        <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        <Route path="/games" element={<GamesHubPage />} />
        <Route path="/games/me-bingo" element={<MeBingoPage />} />
        <Route path="/games/spoon-manager" element={<SpoonManagerPage />} />
        <Route path="/imprint" element={<ImprintPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Suspense>
  );
}
