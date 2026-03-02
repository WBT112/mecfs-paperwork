/* global process, console */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PurgeCSS } from 'purgecss';

const appRoot = process.cwd();
const reportPath = resolve(appRoot, 'reports/unused-css-report.json');
const cssPath = resolve(appRoot, 'src/index.css');

const safelist = {
  standard: [
    'btn',
    'control-label',
    'field-radio-group',
    'form-group',
    'radio',
  ],
  greedy: [/^Toastify/],
};

const cssClassPattern = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
const collectClassNames = (source) => {
  const classes = new Set();
  for (const match of source.matchAll(cssClassPattern)) {
    classes.add(match[1]);
  }
  return [...classes].sort();
};

const result = await new PurgeCSS().purge({
  content: [
    'src/**/*.{ts,tsx,js,jsx,json,html}',
    'tests/**/*.{ts,tsx,js,jsx,json,html}',
    'e2e/**/*.{ts,tsx,js,jsx,html}',
  ],
  css: [cssPath],
  safelist,
  rejected: true,
});

const [{ css, rejected = [] } = { css: '', rejected: [] }] = result;
const sourceClasses = collectClassNames(await readFile(cssPath, 'utf8'));
const keptClasses = collectClassNames(css);
const rejectedSelectors = [...new Set(rejected)].sort();

const report = {
  generatedAt: new Date().toISOString(),
  cssFile: 'src/index.css',
  sourceClassCount: sourceClasses.length,
  keptClassCount: keptClasses.length,
  rejectedSelectorCount: rejectedSelectors.length,
  rejectedSelectors,
  safelist,
};

await mkdir(resolve(appRoot, 'reports'), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`[cleanup:css] wrote report to ${reportPath}`);
console.log(
  `[cleanup:css] source classes: ${report.sourceClassCount}, kept classes: ${report.keptClassCount}, rejected selectors: ${report.rejectedSelectorCount}`,
);
