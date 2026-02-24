// @vitest-environment node
/**
 * Validates bundle size budgets against the build output.
 *
 * This test requires `dist/` to exist (run `npm run build` first).
 * It is automatically skipped when no build output is available,
 * so it won't break normal `vitest run` during development.
 *
 * In CI this runs as a post-build step via `npm run check:bundle-size`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import bundleBudgets from '../../scripts/bundle-size-budgets.json';

const distAssets = resolve(process.cwd(), 'dist', 'assets');
const hasBuild = existsSync(distAssets);
const {
  appChunkHardLimit: APP_CHUNK_HARD_LIMIT,
  cssTotalBudget: CSS_TOTAL_BUDGET,
  jsChunkBudgets: JS_CHUNK_BUDGETS,
  jsTotalBudget: JS_TOTAL_BUDGET,
} = bundleBudgets;

const resolveChunkName = (filename: string): string =>
  filename.replace(/\.[^.]+$/, '').replace(/-[^.]{8}$/, '');

const collectAssets = (ext: string) => {
  if (!hasBuild) return [];
  return readdirSync(distAssets)
    .filter((f) => f.endsWith(ext))
    .map((f) => ({
      file: f,
      chunk: resolveChunkName(f),
      size: statSync(join(distAssets, f)).size,
    }));
};

describe.skipIf(!hasBuild)('bundle size budgets', () => {
  const jsAssets = collectAssets('.js');
  const cssAssets = collectAssets('.css');

  it('total JS stays under 3.2 MB', () => {
    const total = jsAssets.reduce((sum, a) => sum + a.size, 0);
    expect(total).toBeLessThanOrEqual(JS_TOTAL_BUDGET);
  });

  it('total CSS stays under 40 kB', () => {
    const total = cssAssets.reduce((sum, a) => sum + a.size, 0);
    expect(total).toBeLessThanOrEqual(CSS_TOTAL_BUDGET);
  });

  it('no single app chunk exceeds 150 kB', () => {
    const appChunks = jsAssets.filter((a) => !a.chunk.startsWith('vendor-'));
    for (const chunk of appChunks) {
      expect(
        chunk.size,
        `${chunk.chunk} is ${(chunk.size / 1024).toFixed(1)} kB`,
      ).toBeLessThanOrEqual(APP_CHUNK_HARD_LIMIT);
    }
  });

  it('vendor-react-pdf-pdfkit stays under 500 kB', () => {
    const chunk = jsAssets.find((a) => a.chunk === 'vendor-react-pdf-pdfkit');
    expect(chunk).toBeDefined();
    expect(chunk!.size).toBeLessThanOrEqual(
      JS_CHUNK_BUDGETS['vendor-react-pdf-pdfkit'],
    );
  });

  it('vendor-react stays under 430 kB', () => {
    const chunk = jsAssets.find((a) => a.chunk === 'vendor-react');
    expect(chunk).toBeDefined();
    expect(chunk!.size).toBeLessThanOrEqual(JS_CHUNK_BUDGETS['vendor-react']);
  });

  it('vendor-docx stays under 250 kB', () => {
    const chunk = jsAssets.find((a) => a.chunk === 'vendor-docx');
    expect(chunk).toBeDefined();
    expect(chunk!.size).toBeLessThanOrEqual(JS_CHUNK_BUDGETS['vendor-docx']);
  });

  it('vendor-rjsf stays under 340 kB', () => {
    const chunk = jsAssets.find((a) => a.chunk === 'vendor-rjsf');
    expect(chunk).toBeDefined();
    expect(chunk!.size).toBeLessThanOrEqual(JS_CHUNK_BUDGETS['vendor-rjsf']);
  });

  it('expected vendor chunks are present', () => {
    const chunkNames = new Set(jsAssets.map((a) => a.chunk));
    const expectedVendors = [
      'vendor-react',
      'vendor-docx',
      'vendor-rjsf',
      'vendor-react-pdf-renderer',
      'vendor-react-pdf-pdfkit',
    ];
    for (const name of expectedVendors) {
      expect(chunkNames, `missing chunk: ${name}`).toContain(name);
    }
  });
});
