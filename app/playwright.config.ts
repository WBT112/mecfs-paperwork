/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const requiresDevServiceWorker = process.env.VITE_ENABLE_DEV_SW === 'true';
// NOTE: WebKit on Windows can inherit a broken system proxy (WPAD), so we
// force an explicit proxy config with localhost bypass to keep local E2E stable.
const localProxyBypass = '127.0.0.1,localhost,::1';
const webkitProxyOverride = {
  proxy: {
    server: 'http://127.0.0.1:9',
    bypass: localProxyBypass,
  },
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: isCI ? 60_000 : 30_000,
  expect: { timeout: isCI ? 15_000 : 10_000 },
  workers: isCI ? 2 : undefined,

  // Terminal output + HTML report folder
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: { mode: 'on', fullPage: true }, // always capture a screenshot after each test
  },

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    // SW tests require a fresh server process so VITE_ENABLE_DEV_SW is applied.
    reuseExistingServer: !isCI && !requiresDevServiceWorker,
    timeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      grepInvert: /@mobile/,
    },
    {
      // Gecko-based Firefox
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grepInvert: /@mobile/,
    },
    {
      // WebKit (closest to Safari engine)
      name: 'webkit',
      use: { ...devices['Desktop Safari'], ...webkitProxyOverride },
      grepInvert: /@mobile/,
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'], ...webkitProxyOverride },
      grep: /@mobile/,
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: [
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      grep: /@mobile/,
    },
  ],
});
