/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { createRequire } from 'node:module';
import { createPwaConfig } from './src/lib/pwaConfig';

const require = createRequire(import.meta.url);
const utilPath = require.resolve('util/util.js');

const createFormpackSpaFallbackPlugin = (): Plugin => ({
  name: 'formpack-spa-fallback',
  apply: 'serve',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.method !== 'GET' || !req.url) {
        return next();
      }

      const path = req.url.split('?')[0];
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

const createConfig = (mode: string): AppConfig => ({
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
          // PERFORMANCE: ajv is used for form validation. Keep it with rjsf since
          // @rjsf/validator-ajv8 depends on it and they're loaded together.
          if (id.includes('/ajv/') || id.includes('/ajv-formats/')) {
            return 'vendor-rjsf';
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
          // PERFORMANCE: react-markdown and sanitize-html are split into a separate chunk
          // because they're only needed for description rendering in formpack forms.
          // This reduces the initial bundle size for the main React vendor chunk.
          if (id.includes('react-markdown') || id.includes('sanitize-html')) {
            return 'vendor-markdown';
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
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx,mjs}'],
      exclude: ['src/**/*.d.ts', 'src/lib/funding.generated.ts'],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'e2e', 'public', 'src'],
  },
});

export default defineConfig(({ mode }) => createConfig(mode));
