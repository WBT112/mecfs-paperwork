/* global console, process */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './check-node-version.mjs';
import bundleBudgets from './bundle-size-budgets.json' with { type: 'json' };

checkNodeVersion();

const C_RESET = '\x1b[0m';
const C_GREEN = '\x1b[32m';
const C_RED = '\x1b[31m';
const C_DIM = '\x1b[2m';
const C_YELLOW = '\x1b[33m';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, '..', 'dist', 'assets');
const {
  jsTotalBudget: JS_TOTAL_BUDGET,
  cssTotalBudget: CSS_TOTAL_BUDGET,
  jsChunkBudgets: JS_CHUNK_BUDGETS,
} = bundleBudgets;

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} kB`;
};

const resolveChunkName = (filename) => {
  const base = path.basename(filename, path.extname(filename));
  // Strip the 8-char Rollup hash suffix: "vendor-react-BUczKZci" → "vendor-react"
  return base.replace(/-[^.]{8}$/, '');
};

const run = async () => {
  const exists = await fs
    .access(distDir)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    console.error(
      `${C_RED}dist/assets/ not found. Run "npm run build" first.${C_RESET}`,
    );
    process.exit(1);
  }

  const files = await fs.readdir(distDir);
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  const cssFiles = files.filter((f) => f.endsWith('.css'));

  let jsTotalSize = 0;
  let cssTotalSize = 0;
  const violations = [];

  console.log(`\n${C_DIM}Bundle size report${C_RESET}\n`);
  console.log('JS chunks:');

  for (const file of jsFiles.sort()) {
    const stat = await fs.stat(path.join(distDir, file));
    const size = stat.size;
    jsTotalSize += size;
    const chunkName = resolveChunkName(file);
    const budget = JS_CHUNK_BUDGETS[chunkName];

    if (budget && size > budget) {
      violations.push(
        `${chunkName}: ${formatBytes(size)} exceeds ${formatBytes(budget)}`,
      );
      console.log(
        `  ${C_RED}✗ ${chunkName}${C_RESET}  ${formatBytes(size)}  ${C_RED}(budget: ${formatBytes(budget)})${C_RESET}`,
      );
    } else if (budget) {
      const pct = ((size / budget) * 100).toFixed(0);
      console.log(
        `  ${C_GREEN}✔${C_RESET} ${chunkName}  ${formatBytes(size)}  ${C_DIM}(${pct}% of ${formatBytes(budget)})${C_RESET}`,
      );
    } else {
      console.log(`  ${C_DIM}· ${chunkName}  ${formatBytes(size)}${C_RESET}`);
    }
  }

  console.log('\nCSS:');
  for (const file of cssFiles.sort()) {
    const stat = await fs.stat(path.join(distDir, file));
    cssTotalSize += stat.size;
    console.log(`  ${C_DIM}· ${file}  ${formatBytes(stat.size)}${C_RESET}`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  const jsPct = ((jsTotalSize / JS_TOTAL_BUDGET) * 100).toFixed(0);
  const cssPct = ((cssTotalSize / CSS_TOTAL_BUDGET) * 100).toFixed(0);

  if (jsTotalSize > JS_TOTAL_BUDGET) {
    violations.push(
      `JS total: ${formatBytes(jsTotalSize)} exceeds ${formatBytes(JS_TOTAL_BUDGET)}`,
    );
    console.log(
      `${C_RED}JS total:  ${formatBytes(jsTotalSize)}  (budget: ${formatBytes(JS_TOTAL_BUDGET)})${C_RESET}`,
    );
  } else {
    console.log(
      `${C_GREEN}JS total:  ${formatBytes(jsTotalSize)}${C_RESET}  ${C_DIM}(${jsPct}% of ${formatBytes(JS_TOTAL_BUDGET)})${C_RESET}`,
    );
  }

  if (cssTotalSize > CSS_TOTAL_BUDGET) {
    violations.push(
      `CSS total: ${formatBytes(cssTotalSize)} exceeds ${formatBytes(CSS_TOTAL_BUDGET)}`,
    );
    console.log(
      `${C_RED}CSS total: ${formatBytes(cssTotalSize)}  (budget: ${formatBytes(CSS_TOTAL_BUDGET)})${C_RESET}`,
    );
  } else {
    console.log(
      `${C_GREEN}CSS total: ${formatBytes(cssTotalSize)}${C_RESET}  ${C_DIM}(${cssPct}% of ${formatBytes(CSS_TOTAL_BUDGET)})${C_RESET}`,
    );
  }

  if (violations.length > 0) {
    console.log(
      `\n${C_RED}✗ ${violations.length} budget violation(s):${C_RESET}`,
    );
    for (const v of violations) {
      console.log(`  ${C_RED}• ${v}${C_RESET}`);
    }
    console.log(
      `\n${C_YELLOW}If the increase is intentional, update the budgets in scripts/check-bundle-size.mjs${C_RESET}`,
    );
    process.exit(1);
  }

  console.log(`\n${C_GREEN}✔ All bundle size budgets passed.${C_RESET}\n`);
};

run();
