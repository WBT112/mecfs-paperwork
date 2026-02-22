import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const appRoot = process.cwd();
const cssPath = resolve(appRoot, 'src/index.css');
const scanRoots = [resolve(appRoot, 'src'), resolve(appRoot, 'e2e')];
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.html',
]);
const runtimeGeneratedAllowlist = new Set([
  'btn',
  'field-radio-group',
  'form-group',
]);

const collectFiles = (directory: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      files.push(...collectFiles(absolutePath));
      continue;
    }

    if (!sourceExtensions.has(extname(entry.name))) {
      continue;
    }
    if (absolutePath === cssPath) {
      continue;
    }
    files.push(absolutePath);
  }
  return files;
};

it('does not accumulate statically unreachable index.css classes', () => {
  const cssSource = readFileSync(cssPath, 'utf8');
  const classes = new Set<string>();
  for (const match of cssSource.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
    classes.add(match[1]);
  }

  const corpus = scanRoots
    .flatMap((root) => collectFiles(root))
    .map((filePath) => readFileSync(filePath, 'utf8'))
    .join('\n');

  const unusedClasses = [...classes]
    .filter((className) => {
      const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const usagePattern = new RegExp(`\\b${escapedClassName}\\b`);
      return !usagePattern.test(corpus);
    })
    .sort();

  expect(unusedClasses).toEqual([...runtimeGeneratedAllowlist].sort());
});
