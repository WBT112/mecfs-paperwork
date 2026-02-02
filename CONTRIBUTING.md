# Contributing to mecfs-paperwork

Thanks for contributing. This project is **offline-first** and deals with workflows that may involve sensitive health information. Please follow the rules below to keep contributions safe, reviewable, and consistent.

## Ground rules (non‑negotiable)

- **No real patient data** in this repository — including issues, PRs, screenshots, logs, fixtures, exports, or attachments.
- Use **clearly fake / anonymized** data only (names like `Alice Example`, dummy dates, random IDs).
- **No telemetry / tracking / analytics**.
- **Offline-first**: the app must not require network access at runtime (except loading the static app assets).
- Do not log personal or sensitive data to the console.

If you accidentally included sensitive data, remove it immediately and contact the maintainer via GitHub (Issue or direct message).

## Where to start

- Project overview: `README.md`
- Quality Gates / DoD: `docs/qa/dod.md`
- QA overview: `docs/qa/README.md`
- Formpack authoring: `docs/formpacks.md`
- Security reporting: `SECURITY.md`
- Automation / agent quality policy: `AGENTS.md`

## Development setup

### Prerequisites
- Node and npm as defined by the repository (see `.nvmrc` if present).
- Docker (optional, for container build testing).

### Install & run
```bash
cd app
npm install
npm run dev
```

## Quality gates (required before opening a PR)

Run from `app/`. CI only runs `npm run format:check`; if it fails locally, run `npm run format` and re-run the check:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run formpack:validate
npm run build
```

If E2E tests (`test:e2e`) fail due to missing dependencies, you may need to install browser binaries: `npx playwright install`.

Optional (recommended): run the one-command helper script (Windows PowerShell):

```powershell
. .\tools\run-quality-gates.ps1
```

Optional (recommended, cross-platform):

```bash
npm run quality-gates
```

If you are temporarily on Node < 24, you can bypass the version check for the helper with `BYPASS_NODE_VERSION_CHECK=true`.

Optional (coverage report):

```bash
npm run test:coverage
```
## Issues
- Please create an issue to discuss your idea first before you use precious time for coding and testing.

## Pull requests

### Scope & structure
- Prefer **small, focused PRs** (one change set / one intent).
- Include a clear description: *what*, *why*, *how to test*.
- Update documentation when behavior or workflows change.

### Tests
- Add or update **unit tests** for changed **business logic** (export/mapping/storage/helpers).
- UI tests should be minimal and focused on critical user flows.
- Tests must be deterministic — no sleeps/timing hacks/flaky assertions.

### Code style
- Follow the existing project style (ESLint/Prettier/TypeScript).
- Keep code and test comments **in English**.

## Comment Policy

### Code & test comments
- **Language:** Write code and test comments in **English**.
- **Purpose:** Comments must explain **why** something exists (constraints, trade-offs, edge cases), not restate what the code already shows.
- **Privacy:** Never include **real patient/health data** in comments, examples, fixtures, screenshots, logs, or exports. Use clearly fake data only.
- **Durability:** Prefer stable, high-signal notes:
  - `// RATIONALE:` for design decisions
  - `// NOTE:` for non-obvious behavior
  - `// SECURITY:` for security/privacy constraints
- **Avoid noise:** Do not add comments that paraphrase obvious logic (“increment i”, “set state”).
- **Tests:** Comment only when setup/mocking is non-trivial or a regression needs context. No timing hacks.

## Security & privacy notes (local storage and exports)

This app supports local storage and exports (e.g., DOCX/JSON). Exports may contain sensitive information.

Please ensure:
- Never attach real exports or real logs to PRs/issues.
- Avoid copying export content into issues/PR descriptions.
- Use fake data whenever you test export paths.

## Reporting security issues

Please do **not** publish exploit-ready details in public issues.
Use the process described in `SECURITY.md` (GitHub issue with prefix **[SECURITY]** or contact the maintainer via GitHub).

## License

By contributing, you agree that your contributions will be licensed under the project’s license (Apache-2.0). See `LICENSE`.
