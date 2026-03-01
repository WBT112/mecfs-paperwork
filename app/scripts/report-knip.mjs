/* global process, console */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appRoot = process.cwd();
const reportPath = resolve(appRoot, 'reports/knip-report.json');
const actionableFields = [
  'dependencies',
  'devDependencies',
  'exports',
  'duplicates',
];
const informationalFields = ['types'];

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

const countIssueFields = (issue, fields) =>
  fields.reduce((count, fieldName) => {
    const value = issue[fieldName];
    return count + (Array.isArray(value) ? value.length : 0);
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
    const issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    const actionableIssues = issues
      .map((issue) => ({
        file: issue.file,
        counts: Object.fromEntries(
          actionableFields.map((fieldName) => [
            fieldName,
            Array.isArray(issue[fieldName]) ? issue[fieldName].length : 0,
          ]),
        ),
      }))
      .filter((entry) =>
        Object.values(entry.counts).some((count) => count > 0),
      );
    const actionableCount = actionableIssues.reduce(
      (count, issue) =>
        count +
        Object.values(issue.counts).reduce((sum, value) => sum + value, 0),
      0,
    );
    const informationalCount = issues.reduce(
      (count, issue) => count + countIssueFields(issue, informationalFields),
      0,
    );

    report.summary = {
      issueFiles: issues.length,
      actionableIssueFiles: actionableIssues.length,
      actionableCount,
      informationalCount,
      actionableFields,
      informationalFields,
    };
    report.actionableIssues = actionableIssues;
  } catch {
    report.rawOutput = runResult.stdout.trim();
  }
}

await mkdir(resolve(appRoot, 'reports'), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`[cleanup:knip] wrote report to ${reportPath}`);
if (report.summary) {
  console.log(
    `[cleanup:knip] actionable items: ${report.summary.actionableCount} across ${report.summary.actionableIssueFiles} files`,
  );
  console.log(
    `[cleanup:knip] informational items (mostly type-only): ${report.summary.informationalCount}`,
  );
} else if (typeof report.issueCount === 'number') {
  console.log(`[cleanup:knip] reported issues: ${report.issueCount}`);
}

if (runResult.code !== 0 && runResult.code !== 1) {
  process.exit(runResult.code);
}
