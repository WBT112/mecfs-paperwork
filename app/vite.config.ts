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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'e2e', 'public'],
  },
};

export default defineConfig(config);
