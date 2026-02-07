# Getting Started

## Privacy First
- Do not include real patient data in this repo (issues, logs, screenshots, fixtures, exports).

## Local Development
```bash
cd app
npm ci
npm run dev
```

Note: Formpacks are stored directly in `app/public/formpacks` (single source of truth).

## Quality Gates (Local)
Run from `app/` (Node 24 + Playwright required):
```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run formpack:validate
npm run build
```

If E2E tests fail due to missing dependencies, install browser binaries:
```bash
npx playwright install
```

Optional coverage report:
```bash
npm run test:coverage
```

Optional one-command helper:
```bash
npm run quality-gates
```

If you are temporarily on Node < 24, you can bypass the helper’s version check with `BYPASS_NODE_VERSION_CHECK=true`.

## PowerShell Helper (Windows)
The helper script automates the full suite of quality gates (including optional Docker checks):
```powershell
. .\tools\run-quality-gates.ps1
```

Parameters:
| Parameter | Description | Default |
| --- | --- | --- |
| `-AppSubdir` | Subdirectory containing the target `package.json` | `app` |
| `-UnitCommand` | npm script for unit tests (e.g., `test:unit`) | `npm test` |
| `-E2eCommand` | npm script for E2E tests | `test:e2e` |
| `-E2eRuns` | How many times to run E2E tests | `3` |
| `-DockerImagePort` | Port for Docker image smoke test | `18080` |
| `-ComposePort` | Port for Docker Compose smoke test | `8080` |
| `-SkipComposeChecks` | Skip `docker compose` checks | (not set) |
| `-SkipDockerChecks` | Skip `docker build` and `docker run` checks | (not set) |
| `-KeepDockerRunning` | Keep containers running after checks | (not set) |

## Legal Content (Imprint & Privacy)
Legal pages are sourced from repo-managed Markdown files:
- `app/src/content/legal/imprint.md`
- `app/src/content/legal/privacy.md`

These files contain placeholders only and must be completed before deployment.

The footer GitHub button uses `VITE_REPO_URL` and falls back to `https://github.com/your-org/mecfs-paperwork`. Set `VITE_REPO_URL` to an empty string to hide the GitHub link.
