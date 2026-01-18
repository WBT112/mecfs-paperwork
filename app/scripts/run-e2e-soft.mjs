import { spawn } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

const isWin = process.platform === 'win32';

// Whitelist to avoid accidental injection when shell=true on Windows
const ALLOWED_PROJECTS = new Set(['chromium', 'firefox', 'webkit']);

function getRunner() {
  const ua = process.env.npm_config_user_agent || '';

  // Prefer current package manager; with shell:true on Windows we can use the non-.cmd name.
  if (ua.startsWith('pnpm')) return { cmd: 'pnpm', baseArgs: ['exec'] };
  if (ua.startsWith('yarn')) return { cmd: 'yarn', baseArgs: [] };
  return { cmd: 'npx', baseArgs: [] }; // npm default
}

function runPlaywright({ project, outputDir, extraArgs = [] }) {
  if (!ALLOWED_PROJECTS.has(project)) {
    throw new Error(
      `Invalid project "${project}" (allowed: chromium, firefox, webkit)`,
    );
  }

  const { cmd, baseArgs } = getRunner();
  const args = [
    ...baseArgs,
    'playwright',
    'test',
    '--project',
    project,
    '--output',
    outputDir,
    ...extraArgs,
  ];

  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, {
        stdio: 'inherit',
        env: process.env,
        // Required on Windows for .cmd/.bat toolchain after CVE-2024-27980 change
        shell: isWin,
        windowsHide: true,
      });

      child.on('close', (code) => resolve(code ?? 1));
      child.on('error', (err) => {
        console.error(`[e2e-soft] spawn error for ${project}: ${String(err)}`);
        resolve(1);
      });
    } catch (err) {
      // spawn() can throw synchronously (e.g. EINVAL)
      console.error(`[e2e-soft] spawn threw for ${project}: ${String(err)}`);
      resolve(1);
    }
  });
}

async function main() {
  // Chromium is gating
  const chromiumCode = await runPlaywright({
    project: 'chromium',
    outputDir: 'test-results/chromium',
  });
  if (chromiumCode !== 0) process.exit(chromiumCode);

  // Firefox/WebKit are soft-fail
  const firefoxCode = await runPlaywright({
    project: 'firefox',
    outputDir: 'test-results/firefox',
  });
  if (firefoxCode !== 0) {
    console.warn(`[e2e-soft] firefox failed (soft-fail): exit ${firefoxCode}`);
  }

  const webkitCode = await runPlaywright({
    project: 'webkit',
    outputDir: 'test-results/webkit',
  });
  if (webkitCode !== 0) {
    console.warn(`[e2e-soft] webkit failed (soft-fail): exit ${webkitCode}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(`[e2e-soft] Unhandled error: ${String(err)}`);
  process.exit(1);
});
