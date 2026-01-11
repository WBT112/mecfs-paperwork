/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^events$/, replacement: require.resolve('events') },
      { find: /^stream$/, replacement: require.resolve('stream-browserify') },
      { find: /^util$/, replacement: require.resolve('util') },
    ],
  },
  optimizeDeps: {
    include: ['events', 'stream-browserify', 'util'],
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
});
