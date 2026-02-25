/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
import { execSync } from 'node:child_process';
import { createPwaConfig } from './src/lib/pwaConfig';

const require = createRequire(import.meta.url);
const utilPath = require.resolve('util/util.js');

const createFormpackSpaFallbackPlugin = (): Plugin => ({
  name: 'formpack-spa-fallback',
  apply: 'serve',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.method !== 'GET' || !req.url) {
        return next();
      }

      const path = req.url.split('?')[0];
      if (path === '/health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('OK');
        return;
      }

      if (path === '/formpacks' || path === '/formpacks/') {
        req.url = '/index.html';
        return next();
      }

      if (/^\/formpacks\/[^/]+\/?$/.test(path)) {
        req.url = '/index.html';
      }

      return next();
    });
  },
});

type AppConfig = import('vite').UserConfig & {
  test?: import('vitest/node').InlineConfig;
};

const APP_VERSION_FALLBACK = 'unknown';

const resolveAppVersion = (): string => {
  const versionFromEnv = process.env.VITE_APP_VERSION?.trim();
  if (versionFromEnv) {
    return versionFromEnv;
  }

  try {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return APP_VERSION_FALLBACK;
  }
};

const resolveBuildDate = (): string => {
  const buildDateFromEnv = process.env.VITE_BUILD_DATE?.trim();
  if (buildDateFromEnv) {
    const parsed = new Date(buildDateFromEnv);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
};

const APP_VERSION = resolveAppVersion();
const BUILD_DATE = resolveBuildDate();

const parsePositiveInt = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const isCI = Boolean(process.env.CI);
const defaultLocalVitestWorkers = Math.max(
  2,
  Math.min(10, Math.floor(availableParallelism() * 0.7)),
);
const configuredVitestWorkers = parsePositiveInt(
  process.env.VITEST_MAX_WORKERS ?? process.env.VITEST_WORKERS,
);
const vitestMaxWorkers =
  configuredVitestWorkers ?? (isCI ? 2 : defaultLocalVitestWorkers);

const createConfig = (mode: string): AppConfig => ({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILD_DATE__: JSON.stringify(BUILD_DATE),
  },
  plugins: [
    createFormpackSpaFallbackPlugin(),
    react(),
    VitePWA(
      createPwaConfig({
        isDev: mode === 'development',
        enableDevSw: process.env.VITE_ENABLE_DEV_SW === 'true',
      }),
    ),
  ],
  resolve: {
    // RATIONALE: The 'docx-templates' library relies on Node.js built-in
    // modules like 'stream' and 'util'. To make it work in a browser
    // environment, we need to provide browser-compatible polyfills. These
    // aliases map the Node.js module names to their browser equivalents.
    // Removing them will break the document export functionality.
    alias: [
      { find: /^events$/, replacement: require.resolve('events') },
      { find: /^stream$/, replacement: require.resolve('stream-browserify') },
      { find: /^util$/, replacement: utilPath },
      { find: /^node:util$/, replacement: utilPath },
    ],
  },
  optimizeDeps: {
    include: ['events', 'stream-browserify', 'util'],
    exclude: [
      '@react-pdf/renderer',
      '@react-pdf/layout',
      '@react-pdf/font',
      '@react-pdf/pdfkit',
      '@react-pdf/primitives',
      '@react-pdf/image',
      '@react-pdf/textkit',
      '@react-pdf/stylesheet',
      '@react-pdf/types',
      'yoga-layout',
      'yoga-layout-wasm',
    ],
    esbuildOptions: {
      // Prevent Vite from externalizing util during pre-bundling (docx-templates).
      plugins: [
        {
          name: 'alias-node-util',
          setup(build) {
            build.onResolve({ filter: /^util$/ }, () => ({ path: utilPath }));
            build.onResolve({ filter: /^node:util$/ }, () => ({
              path: utilPath,
            }));
          },
        },
      ],
    },
  },
  server: {
    cors: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('@react-pdf/renderer')) {
            return 'vendor-react-pdf-renderer';
          }
          if (
            id.includes('@react-pdf/layout') ||
            id.includes('@react-pdf/textkit')
          ) {
            return 'vendor-react-pdf-layout';
          }
          if (id.includes('@react-pdf/font')) {
            return 'vendor-react-pdf-font';
          }
          if (
            id.includes('@react-pdf/image') ||
            id.includes('@react-pdf/png-js')
          ) {
            return 'vendor-react-pdf-image';
          }
          if (id.includes('@react-pdf/primitives')) {
            return 'vendor-react-pdf-primitives';
          }
          if (id.includes('@react-pdf/pdfkit')) {
            return 'vendor-react-pdf-pdfkit';
          }
          if (id.includes('yoga-layout')) {
            return 'vendor-react-pdf-yoga';
          }
          if (
            id.includes('fontkit') ||
            id.includes('/unicode-') ||
            id.includes('linebreak')
          ) {
            return 'vendor-react-pdf-fontkit';
          }
          if (id.includes('@rjsf')) {
            return 'vendor-rjsf';
          }
          if (
            id.includes('docx-templates') ||
            id.includes('jszip') ||
            id.includes('stream-browserify') ||
            id.includes('/buffer/') ||
            id.includes('/events/') ||
            id.includes('/util/')
          ) {
            return 'vendor-docx';
          }
          if (
            id.includes('react-router') ||
            id.includes('react-dom') ||
            id.includes('/react/')
          ) {
            return 'vendor-react';
          }
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-react';
          }
          if (id.includes('react-markdown') || id.includes('sanitize-html')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup/setup.ts',
    maxWorkers: vitestMaxWorkers,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx,mjs}'],
      exclude: [
        'src/**/*.d.ts',
        'src/lib/funding.generated.ts',
        // Type-only files with no runtime code
        'src/lib/diagnostics/types.ts',
        // Re-export barrels with no logic
        'src/lib/diagnostics/index.ts',
        // Type-only file with no runtime code
        'src/pages/formpack-detail/types.ts',
      ],
      thresholds: {
        // Global coverage thresholds (CI enforced)
        // Locked near current baseline to prevent regressions.
        lines: 93.1,
        branches: 85.8,
        functions: 94.1,
        statements: 92.7,
      },
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'e2e', 'public', 'src'],
  },
});

export default defineConfig(({ mode }) => createConfig(mode));
