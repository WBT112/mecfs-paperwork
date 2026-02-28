/* global process, console */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_COVERAGE_PCT = 100;
const REQUIRED_METRICS = ['statements', 'functions', 'lines', 'branches'];
const COVERAGE_SUMMARY_PATH = path.resolve('coverage/coverage-summary.json');

const normalizePath = (filePath) => filePath.replaceAll('\\', '/');

const runGit = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const toNormalizedSourcePath = (rawFilePath) => {
  const filePath = normalizePath(rawFilePath.trim());
  if (filePath.length === 0) {
    return null;
  }

  const appRelativePath = filePath.startsWith('app/')
    ? filePath.slice(4)
    : filePath;
  if (!appRelativePath.startsWith('src/')) {
    return null;
  }
  if (!/\.(ts|tsx|mjs)$/u.test(appRelativePath)) {
    return null;
  }

  return appRelativePath;
};

const extractSourceFiles = (output) =>
  output
    .split('\n')
    .map((rawFile) => toNormalizedSourcePath(rawFile))
    .filter((filePath) => typeof filePath === 'string');

const canResolveRef = (ref) => {
  try {
    runGit(['rev-parse', '--verify', ref]);
    return true;
  } catch {
    return false;
  }
};

const resolveBaseRef = () => {
  const envRef = process.env.COVERAGE_BASE_REF?.trim();
  const githubBaseRef = process.env.GITHUB_BASE_REF?.trim();

  const candidates = [
    envRef,
    githubBaseRef ? `origin/${githubBaseRef}` : null,
    githubBaseRef,
    'HEAD~1',
  ].filter((value) => typeof value === 'string' && value.length > 0);

  const resolved = candidates.find((candidate) => canResolveRef(candidate));
  if (!resolved) {
    throw new Error(
      'Unable to resolve a git base ref. Set COVERAGE_BASE_REF explicitly.',
    );
  }

  return resolved;
};

const getChangedSourceFiles = (baseRef) => {
  const changedFromBase = runGit([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    `${baseRef}...HEAD`,
  ]);
  const changedFromHead = runGit([
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    'HEAD',
  ]);
  const untrackedFiles = runGit(['ls-files', '--others', '--exclude-standard']);

  return [
    ...new Set([
      ...extractSourceFiles(changedFromBase),
      ...extractSourceFiles(changedFromHead),
      ...extractSourceFiles(untrackedFiles),
    ]),
  ];
};

const loadCoverageSummary = () => {
  if (!existsSync(COVERAGE_SUMMARY_PATH)) {
    throw new Error(
      `Coverage summary not found at ${COVERAGE_SUMMARY_PATH}. Run vitest with --coverage and json-summary reporter first.`,
    );
  }

  const raw = readFileSync(COVERAGE_SUMMARY_PATH, 'utf8');
  return JSON.parse(raw);
};

const toCoverageMap = (summary) => {
  const appRoot = process.cwd();
  const entries = Object.entries(summary).filter(([key]) => key !== 'total');

  return new Map(
    entries.map(([absolutePath, metrics]) => {
      const relativePath = normalizePath(path.relative(appRoot, absolutePath));
      return [relativePath, metrics];
    }),
  );
};

const reportPass = (filesChecked, baseRef) => {
  console.log(
    `✅ Changed-file coverage passed for ${filesChecked} file(s) against base ${baseRef}.`,
  );
  console.log(
    `   Required minima: ${REQUIRED_METRICS.join(', ')} >= ${REQUIRED_COVERAGE_PCT}%`,
  );
};

const reportFailures = (failures) => {
  console.error('❌ Changed-file coverage check failed:');
  failures.forEach((failure) => {
    console.error(
      `   - ${failure.file}: statements ${failure.statements.toFixed(2)}%, functions ${failure.functions.toFixed(2)}%, lines ${failure.lines.toFixed(2)}%, branches ${failure.branches.toFixed(2)}%`,
    );
  });
  console.error(
    `   Required minima: ${REQUIRED_METRICS.join(', ')} >= ${REQUIRED_COVERAGE_PCT}%`,
  );
};

const main = () => {
  const baseRef = resolveBaseRef();
  const changedSourceFiles = getChangedSourceFiles(baseRef);

  if (changedSourceFiles.length === 0) {
    console.log(`ℹ️ No changed src files found against base ${baseRef}.`);
    return;
  }

  const summary = loadCoverageSummary();
  const coverageByFile = toCoverageMap(summary);

  const failures = changedSourceFiles
    .map((filePath) => {
      const metrics = coverageByFile.get(filePath);
      if (!metrics) {
        return {
          file: filePath,
          statements: 0,
          functions: 0,
          lines: 0,
          branches: 0,
          missing: true,
        };
      }

      return {
        file: filePath,
        statements: Number(metrics.statements?.pct ?? 0),
        functions: Number(metrics.functions?.pct ?? 0),
        lines: Number(metrics.lines?.pct ?? 0),
        branches: Number(metrics.branches?.pct ?? 0),
        missing: false,
      };
    })
    .filter(
      (entry) =>
        entry.missing ||
        REQUIRED_METRICS.some(
          (metricName) => entry[metricName] < REQUIRED_COVERAGE_PCT,
        ),
    );

  if (failures.length > 0) {
    reportFailures(failures);
    process.exitCode = 1;
    return;
  }

  reportPass(changedSourceFiles.length, baseRef);
};

main();
