# Contributing to mecfs-paperwork

Thanks for contributing! This is an offline‑first project around sensitive health workflows. We want contributions to feel approachable and still keep privacy and quality high. If you’re new here, start small — docs and tiny fixes are welcome.

## Quick start
```bash
cd app
npm ci
npm run dev
```

## How to contribute (short version)
- Keep PRs **small and focused**.
- Open an issue before you start working, so we can discuss and don't work parallel on the same thing. 
- Add/update tests for changed **business logic**.
- Keep code comments **in English** and explain **why**, not what.

## Quality gates (CI enforces this)
We run formatting, lint, typecheck, tests, and build in CI. **Don’t be discouraged** — you can open a PR early and we’ll help fix any failing checks.

Run locally (from `app/`):
```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run formpack:validate
npm run build
```

If E2E tests fail due to missing browsers:
```bash
npx playwright install
```

Optional helpers:
- `npm run quality-gates`
- PowerShell: `. .\tools\run-quality-gates.ps1`

## Where to read more
- Getting started & QA: `docs/getting-started.md`
- QA details: `docs/qa/README.md`
- Formpacks authoring: `docs/formpacks.md`
- Security policy: `SECURITY.md`
- Agent/automation standards: `AGENTS.md`

## Non‑negotiables (privacy & offline‑first)
- **No real patient data** in this repo (issues, PRs, screenshots, logs, fixtures, exports).
- Use **clearly fake/anonymized** data only.
- **No telemetry/tracking/analytics.**
- **Offline-first:** no runtime network calls except static app assets.
- Do not log personal/sensitive data to the console.

If you accidentally included sensitive data, remove it immediately and contact the maintainer via GitHub.

See also: `SECURITY.md`, `AGENTS.md`, and `docs/qa/dod.md`.

## License
By contributing, you agree your changes are licensed under Apache-2.0. See `LICENSE`.
