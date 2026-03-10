/* global process, console */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

// Ensure script is run from the app directory
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const appDir = path.resolve(scriptDir, '..');
if (process.cwd() !== appDir) {
  console.error(
    `\x1b[31m❌ Error: Quality gates must be run from the /app directory.\x1b[0m`,
  );
  console.error(`Current directory: ${process.cwd()}`);
  console.error(`Please run: cd app && npm run quality-gates`);
  process.exit(1);
}

const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_GREEN = '\x1b[32m';
const C_CYAN = '\x1b[36m';
const C_YELLOW = '\x1b[33m';

const args = process.argv.slice(2);
const skipE2E = args.includes('--skip-e2e');
const serial = args.includes('--serial') || args.includes('--sequential');

const STATIC_GATES = [
  { name: 'Format Check', command: 'npm', args: ['run', 'format:check'] },
  { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  {
    name: 'Duplication Check (0 lines)',
    command: 'npm',
    args: ['run', 'duplication:check'],
  },
  {
    name: 'Formpack Validation',
    command: 'npm',
    args: ['run', 'formpack:validate'],
  },
];

const SEQUENTIAL_GATES = [
  { name: 'Unit Tests', command: 'npm', args: ['test'] },
  {
    name: 'Changed-file Coverage (100%)',
    command: 'npm',
    args: ['run', 'test:coverage:changed'],
  },
  { name: 'Build', command: 'npm', args: ['run', 'build:bundle'] },
  ...(!skipE2E
    ? [{ name: 'E2E Tests', command: 'npm', args: ['run', 'test:e2e'] }]
    : []),
];

const runGate = (gate) =>
  new Promise((resolve) => {
    console.log(`${C_CYAN}==> Running ${gate.name}...${C_RESET}`);
    const child = spawn(gate.command, gate.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', (err) => {
      console.error(
        `\n${C_RED}❌ ${gate.name} failed to start: ${err.message}${C_RESET}`,
      );
      resolve({ name: gate.name, success: false, code: 1 });
    });
    child.on('close', (code) => {
      resolve({
        name: gate.name,
        success: code === 0,
        code: code ?? 1,
      });
    });
  });

const runStaticGates = async () => {
  if (serial) {
    console.log(
      `${C_CYAN}🧩 Wrench: Running static quality gates sequentially...${C_RESET}\n`,
    );
    const results = [];
    for (const gate of STATIC_GATES) {
      const result = await runGate(gate);
      results.push(result);
      if (result.success) {
        console.log(`${C_GREEN}✅ ${result.name} passed.${C_RESET}\n`);
      } else {
        console.error(`${C_RED}❌ ${result.name} failed.${C_RESET}\n`);
      }
    }
    return results;
  }

  console.log(
    `${C_CYAN}🧩 Wrench: Running static quality gates in parallel...${C_RESET}\n`,
  );
  return Promise.all(STATIC_GATES.map((gate) => runGate(gate)));
};

const runSequentialGates = async () => {
  console.log(
    `\n${C_CYAN}🧩 Wrench: Running sequential quality gates...${C_RESET}\n`,
  );
  const results = [];
  for (const gate of SEQUENTIAL_GATES) {
    const result = await runGate(gate);
    results.push(result);
    if (!result.success) {
      console.error(
        `\n${C_RED}❌ ${result.name} failed with exit code ${result.code}.${C_RESET}`,
      );
      return results;
    }
    console.log(`${C_GREEN}✅ ${result.name} passed.${C_RESET}\n`);
  }
  return results;
};

const printSummary = (staticResults, sequentialResults) => {
  console.log(`\n${C_CYAN}=== Quality Gates Summary ===${C_RESET}`);

  staticResults.forEach((r) => {
    if (r.success) {
      console.log(`${C_GREEN}✅ ${r.name}: Passed${C_RESET}`);
    } else {
      console.log(`${C_RED}❌ ${r.name}: Failed (code ${r.code})${C_RESET}`);
    }
  });

  sequentialResults.forEach((r) => {
    if (r.success) {
      console.log(`${C_GREEN}✅ ${r.name}: Passed${C_RESET}`);
    } else {
      console.log(`${C_RED}❌ ${r.name}: Failed (code ${r.code})${C_RESET}`);
    }
  });

  const allStaticPassed = staticResults.every((r) => r.success);
  const allSequentialPassed =
    sequentialResults.length === SEQUENTIAL_GATES.length &&
    sequentialResults.every((r) => r.success);

  if (allStaticPassed && allSequentialPassed) {
    if (skipE2E) {
      console.log(`\n${C_YELLOW}⚠️  E2E Tests were skipped.${C_RESET}`);
    }
    console.log(`\n${C_GREEN}🎉 All Quality Gates PASSED!${C_RESET}`);
    process.exit(0);
  } else {
    console.log(`\n${C_RED}🛑 Quality Gates FAILED.${C_RESET}`);
    process.exit(1);
  }
};

const staticResults = await runStaticGates();
if (!serial) {
  staticResults.forEach((result) => {
    if (!result.success) {
      console.error(
        `\n${C_RED}❌ ${result.name} failed with exit code ${result.code}.${C_RESET}`,
      );
    } else {
      console.log(`${C_GREEN}✅ ${result.name} passed.${C_RESET}`);
    }
  });
}

const allStaticPassed = staticResults.every((r) => r.success);
if (!allStaticPassed) {
  printSummary(staticResults, []);
}

const sequentialResults = await runSequentialGates();
printSummary(staticResults, sequentialResults);
