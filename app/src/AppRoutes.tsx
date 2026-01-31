import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FormpackDetailPage = lazy(() => import('./pages/FormpackDetailPage'));
const FormpackListPage = lazy(() => import('./pages/FormpackListPage'));
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

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/formpacks" replace />} />
        <Route path="/formpacks" element={<FormpackListPage />} />
        <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        <Route path="/imprint" element={<ImprintPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </Suspense>
  );
}
