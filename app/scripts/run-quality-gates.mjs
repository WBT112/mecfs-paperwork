/* global process, console */
import { spawnSync } from 'node:child_process';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

const C_RESET = '\x1b[0m';
const C_RED = '\x1b[31m';
const C_GREEN = '\x1b[32m';
const C_CYAN = '\x1b[36m';

const GATES = [
  { name: 'Format Check', command: 'npm', args: ['run', 'format:check'] },
  { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'Typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'Unit Tests', command: 'npm', args: ['test'] },
  { name: 'E2E Tests', command: 'npm', args: ['run', 'test:e2e'] },
  {
    name: 'Formpack Validation',
    command: 'npm',
    args: ['run', 'formpack:validate'],
  },
  { name: 'Build', command: 'npm', args: ['run', 'build'] },
];

console.log(`${C_CYAN}🧩 Wrench: Running all Quality Gates...${C_RESET}\n`);

let failed = false;

for (const gate of GATES) {
  console.log(`${C_CYAN}==> Running ${gate.name}...${C_RESET}`);

  const result = spawnSync(gate.command, gate.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(
      `\n${C_RED}❌ ${gate.name} failed with exit code ${result.status}.${C_RESET}`,
    );
    failed = true;
    break;
  }

  console.log(`${C_GREEN}✅ ${gate.name} passed.${C_RESET}\n`);
}

if (failed) {
  console.log(`${C_RED}🛑 Quality Gates FAILED.${C_RESET}`);
  process.exit(1);
} else {
  console.log(`${C_GREEN}🎉 All Quality Gates PASSED!${C_RESET}`);
  process.exit(0);
}
