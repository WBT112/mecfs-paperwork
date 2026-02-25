/* global process, console */
import { spawn } from 'node:child_process';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_GREEN = '\x1b[32m';
const C_CYAN = '\x1b[36m';

const STATIC_GATES = [
  { name: 'Format Check', command: 'npm', args: ['run', 'format:check'] },
  { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  {
    name: 'Formpack Validation',
    command: 'npm',
    args: ['run', 'formpack:validate'],
  },
];

const SEQUENTIAL_GATES = [
  { name: 'Unit Tests', command: 'npm', args: ['test'] },
  { name: 'Build', command: 'npm', args: ['run', 'build:bundle'] },
  { name: 'E2E Tests', command: 'npm', args: ['run', 'test:e2e'] },
];

const runGate = (gate) =>
  new Promise((resolve) => {
    console.log(`${C_CYAN}==> Running ${gate.name}...${C_RESET}`);
    const child = spawn(gate.command, gate.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
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
  console.log(
    `${C_CYAN}🧩 Wrench: Running static quality gates in parallel...${C_RESET}\n`,
  );
  const results = await Promise.all(STATIC_GATES.map((gate) => runGate(gate)));
  let failed = false;
  for (const result of results) {
    if (!result.success) {
      console.error(
        `\n${C_RED}❌ ${result.name} failed with exit code ${result.code}.${C_RESET}`,
      );
      failed = true;
    } else {
      console.log(`${C_GREEN}✅ ${result.name} passed.${C_RESET}`);
    }
  }
  return !failed;
};

const runSequentialGates = async () => {
  console.log(
    `\n${C_CYAN}🧩 Wrench: Running sequential quality gates...${C_RESET}\n`,
  );
  for (const gate of SEQUENTIAL_GATES) {
    const result = await runGate(gate);
    if (!result.success) {
      console.error(
        `\n${C_RED}❌ ${result.name} failed with exit code ${result.code}.${C_RESET}`,
      );
      return false;
    }
    console.log(`${C_GREEN}✅ ${result.name} passed.${C_RESET}\n`);
  }
  return true;
};

const staticPassed = await runStaticGates();
if (!staticPassed) {
  console.log(`${C_RED}🛑 Quality Gates FAILED.${C_RESET}`);
  process.exit(1);
}

const sequentialPassed = await runSequentialGates();
if (!sequentialPassed) {
  console.log(`${C_RED}🛑 Quality Gates FAILED.${C_RESET}`);
  process.exit(1);
}

console.log(`${C_GREEN}🎉 All Quality Gates PASSED!${C_RESET}`);
process.exit(0);
