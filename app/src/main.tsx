import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './index.css';
import { applyTheme } from './theme/applyTheme';
import { getInitialThemeMode } from './theme/theme';
import { registerServiceWorker } from './pwa/register';
import { installGlobalErrorListeners } from './lib/diagnostics';
import {
  USER_TIMING_NAMES,
  startUserTiming,
} from './lib/performance/userTiming';

const LOCALE_STORAGE_KEY = 'mecfs-paperwork.locale';

const applyInitialDocumentLocale = (): void => {
  let locale = 'de';

  try {
    const storedLocale = globalThis.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale === 'de' || storedLocale === 'en') {
      locale = storedLocale;
    }
  } catch {
    // Ignore storage access failures to keep startup resilient.
  }

  document.documentElement.lang = locale;
  document.documentElement.dir = 'ltr';
};

applyInitialDocumentLocale();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

applyTheme(getInitialThemeMode());
registerServiceWorker();
installGlobalErrorListeners();
const appBootTiming = startUserTiming(USER_TIMING_NAMES.appBootTotal);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

if (typeof globalThis.requestAnimationFrame === 'function') {
  globalThis.requestAnimationFrame(() => {
    appBootTiming.end();
  });
} else {
  globalThis.setTimeout(() => {
    appBootTiming.end();
  }, 0);
}
