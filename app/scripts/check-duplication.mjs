/* global process, console */
import { spawn } from 'node:child_process';

const appRoot = process.cwd();

const args = [
  '--no-install',
  'jscpd',
  '--format',
  'ts,tsx,js,jsx,css,json,md',
  '--min-lines',
  '8',
  '--min-tokens',
  '80',
  '--threshold',
  '0',
  '--reporters',
  'console,json',
  '--output',
  'reports/jscpd-gate',
  'src',
  'tests',
  'e2e',
  'scripts',
];

const exitCode = await new Promise((resolveRun, rejectRun) => {
  const child = spawn('npx', args, {
    cwd: appRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('error', rejectRun);
  child.on('close', (code) => resolveRun(code ?? 1));
});

if (exitCode !== 0) {
  process.exit(exitCode);
}

console.log('[duplication:check] passed with 0 duplicated lines.');
