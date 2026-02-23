import { spawn } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const isWin = process.platform === 'win32';

const ALLOWED_PROJECTS = new Set([
  'chromium',
  'chromium-mobile',
  'firefox',
  'webkit',
  'webkit-mobile',
]);

const ALLOWED_PROFILES = new Set(['fast', 'cross', 'all']);

function getRunner() {
  const ua = process.env.npm_config_user_agent || '';

  if (ua.startsWith('pnpm')) return { cmd: 'pnpm', baseArgs: ['exec'] };
  if (ua.startsWith('yarn')) return { cmd: 'yarn', baseArgs: [] };
  return { cmd: 'npx', baseArgs: [] };
}

function parseProfileArg(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--profile') {
      return argv[index + 1] ?? null;
    }
    if (current.startsWith('--profile=')) {
      return current.slice('--profile='.length) || null;
    }
  }
  return null;
}

function resolveProfile() {
  const fromCli = parseProfileArg(process.argv.slice(2));
  const fromEnv = process.env.E2E_PROFILE ?? null;
  const resolved = (fromCli ?? fromEnv ?? 'fast').toLowerCase();

  if (!ALLOWED_PROFILES.has(resolved)) {
    throw new Error(
      `Invalid E2E profile "${resolved}" (allowed: ${Array.from(ALLOWED_PROFILES).join(', ')})`,
    );
  }

  return resolved;
}

function runPlaywright({
  projects,
  outputDir,
  extraArgs = [],
  label = projects.join(','),
}) {
  for (const project of projects) {
    if (!ALLOWED_PROJECTS.has(project)) {
      throw new Error(`Invalid project "${project}"`);
    }
  }

  const { cmd, baseArgs } = getRunner();
  const projectArgs = projects.flatMap((project) => ['--project', project]);
  const args = [
    ...baseArgs,
    'playwright',
    'test',
    ...projectArgs,
    '--output',
    outputDir,
    ...extraArgs,
  ];

  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, {
        stdio: 'inherit',
        env: process.env,
        shell: isWin,
        windowsHide: true,
      });

      child.on('close', (code) => resolve(code ?? 1));
      child.on('error', (err) => {
        console.error(`[e2e-soft] spawn error for ${label}: ${String(err)}`);
        resolve(1);
      });
    } catch (err) {
      console.error(`[e2e-soft] spawn threw for ${label}: ${String(err)}`);
      resolve(1);
    }
  });
}

async function runFastProfile() {
  console.log('[e2e-soft] profile=fast (chromium + chromium-mobile)');
  return runPlaywright({
    projects: ['chromium', 'chromium-mobile'],
    outputDir: 'test-results/fast',
  });
}

async function runCrossProfile() {
  console.log('[e2e-soft] profile=cross (firefox + webkit + webkit-mobile)');
  const softFailArgs = [
    '--max-failures',
    '1',
    '--grep-invert',
    '@chromium-only',
  ];

  const firefoxCode = await runPlaywright({
    projects: ['firefox'],
    outputDir: 'test-results/firefox',
    extraArgs: softFailArgs,
    label: 'firefox',
  });
  if (firefoxCode !== 0) {
    console.warn(`[e2e-soft] firefox failed (soft-fail): exit ${firefoxCode}`);
  }

  const webkitCode = await runPlaywright({
    projects: ['webkit'],
    outputDir: 'test-results/webkit',
    extraArgs: softFailArgs,
    label: 'webkit',
  });
  if (webkitCode !== 0) {
    console.warn(`[e2e-soft] webkit failed (soft-fail): exit ${webkitCode}`);
  }

  const webkitMobileCode = await runPlaywright({
    projects: ['webkit-mobile'],
    outputDir: 'test-results/webkit-mobile',
    extraArgs: softFailArgs,
    label: 'webkit-mobile',
  });
  if (webkitMobileCode !== 0) {
    console.warn(
      `[e2e-soft] webkit-mobile failed (soft-fail): exit ${webkitMobileCode}`,
    );
  }

  return 0;
}

async function runAllProfile() {
  console.log('[e2e-soft] profile=all (fast + cross)');
  const fastCode = await runFastProfile();
  if (fastCode !== 0) {
    return fastCode;
  }
  return runCrossProfile();
}

async function main() {
  process.env.VITE_ENABLE_DEV_SW = 'true';

  const profile = resolveProfile();
  let exitCode = 0;

  if (profile === 'fast') {
    exitCode = await runFastProfile();
  } else if (profile === 'cross') {
    exitCode = await runCrossProfile();
  } else {
    exitCode = await runAllProfile();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(`[e2e-soft] Unhandled error: ${String(err)}`);
  process.exit(1);
});
