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

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

applyTheme(getInitialThemeMode());
registerServiceWorker();
installGlobalErrorListeners();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
