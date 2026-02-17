/* global process, console */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appRoot = process.cwd();
const reportPath = resolve(appRoot, 'reports/knip-report.json');

const runKnip = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      'npx',
      ['--no-install', 'knip', '--config', 'knip.json', '--reporter', 'json'],
      {
        cwd: appRoot,
        shell: process.platform === 'win32',
      },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', rejectRun);
    child.on('close', (code) => {
      resolveRun({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });

const flattenIssueCount = (parsed) =>
  Object.values(parsed).reduce((count, value) => {
    if (!Array.isArray(value)) {
      return count;
    }
    return count + value.length;
  }, 0);

const runResult = await runKnip();
const report = {
  generatedAt: new Date().toISOString(),
  command: 'knip --config knip.json --reporter json',
  exitCode: runResult.code,
  stderr: runResult.stderr.trim() || undefined,
};

if (runResult.stdout.trim().length > 0) {
  try {
    const parsed = JSON.parse(runResult.stdout);
    report.result = parsed;
    report.issueCount = flattenIssueCount(parsed);
  } catch {
    report.rawOutput = runResult.stdout.trim();
  }
}

await mkdir(resolve(appRoot, 'reports'), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`[cleanup:knip] wrote report to ${reportPath}`);
if (typeof report.issueCount === 'number') {
  console.log(`[cleanup:knip] reported issues: ${report.issueCount}`);
}

if (runResult.code !== 0 && runResult.code !== 1) {
  process.exit(runResult.code);
}
