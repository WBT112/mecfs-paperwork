/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const utilPath = require.resolve('util/util.js');

type AppConfig = import('vite').UserConfig & {
  test?: import('vitest/node').InlineConfig;
};

const config: AppConfig = {
  plugins: [react()],
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
    chunkSizeWarningLimit: 1200,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'e2e', 'public', 'src'],
  },
};

export default defineConfig(config);
