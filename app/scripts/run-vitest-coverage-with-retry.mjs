/* global process, console */
import { spawn } from 'node:child_process';

const MAX_ATTEMPTS = 2;
const RETRYABLE_THRESHOLD_FAILURE =
  /(?:ERROR:\s*)?Coverage for (statements|functions|lines|branches) .*does not meet global threshold/i;

const C_RESET = '\x1b[0m';
const C_YELLOW = '\x1b[33m';

const isChangedMode = process.argv.includes('--changed');

const vitestArgs = [
  '--run',
  '--coverage',
  ...(isChangedMode
    ? ['--coverage.reporter=json-summary', '--coverage.reporter=text-summary']
    : []),
];

const runCommand = (command, args) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let output = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      resolve({ code: 1, output: `${output}\n${error.message}` });
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });

const shouldRetry = (code, output) =>
  code !== 0 && RETRYABLE_THRESHOLD_FAILURE.test(output);

const main = async () => {
  let lastResult = { code: 1, output: '' };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    lastResult = await runCommand('vitest', vitestArgs);
    if (lastResult.code === 0) {
      break;
    }

    if (
      !shouldRetry(lastResult.code, lastResult.output) ||
      attempt === MAX_ATTEMPTS
    ) {
      process.exit(lastResult.code);
    }

    console.warn(
      `${C_YELLOW}Retrying vitest coverage after a transient global-threshold failure (attempt ${attempt + 1}/${MAX_ATTEMPTS}).${C_RESET}`,
    );
  }

  if (lastResult.code !== 0) {
    process.exit(lastResult.code);
  }

  if (!isChangedMode) {
    return;
  }

  const changedCoverageResult = await runCommand('node', [
    'scripts/check-changed-file-coverage.mjs',
  ]);
  if (changedCoverageResult.code !== 0) {
    process.exit(changedCoverageResult.code);
  }
};

await main();
