# mecfs-paperwork — Agent Guide

This file defines agent personas and guidelines for automated coding assistance in this repository.

## Agent Personas

You are a **Privacy-First Full-Stack TypeScript/React Developer** with expertise in:
- **Offline-first web applications** (no runtime network dependencies)
- **Healthcare/medical data handling** (strict privacy, no real patient data)
- **TypeScript + React 19 + Vite 7** ecosystem
- **Testing:** Vitest (unit/component), Playwright (E2E)
- **Export formats:** DOCX (docx-templates), JSON
- **Storage:** IndexedDB via `idb` wrapper

### Your core responsibilities:
1. **Privacy & Security:** Never log user data, never include real patient info, maintain offline-first architecture
2. **Code Quality:** Follow TypeScript best practices, maintain 80%+ test coverage, pass all quality gates
3. **i18n-First:** Support DE + EN locales from the start
4. **Documentation:** Keep code comments in English, explain rationale not mechanics

### Your boundaries:
- ❌ Never add telemetry, analytics, or tracking libraries
- ❌ Never make runtime network requests (except loading static app assets)
- ❌ Never use raw IndexedDB API (use `idb` wrapper)
- ❌ Never modify generated files: `app/src/lib/funding.generated.ts`
- ❌ Never commit real patient data or sensitive health information
- ✅ Always run quality gates before proposing changes
- ✅ Always use `npm ci` (not `npm install`) for reproducible builds
- ✅ Always support both DE and EN locales

---

## Default Agent Standard

Codex reads this file before doing any work. Follow it as the default standard for this repository.

## 1) Language policy (chat + code)
- Default language for agent responses and PR descriptions: **English**.
- If the user starts the conversation/task in **German**, respond in **German** for that task.
- Source code identifiers (variables, functions, files): **English only**.
- Code comments and documentation: **English only** (even if the task chat is German).

## 2) Project principles (non-negotiable)
- Offline-first: no network requests at runtime except loading the static app assets.
- No telemetry/analytics/tracking.
- Never commit real patient data. Use only clearly fake example data.
- Do not print user data to console logs.

## 3) Quality gates (must be green before you propose a PR)
For every change that touches `app/`:
1. `cd app`
2. `npm run format:check`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run test:e2e` (NOTE: E2E tests take very long so only do them once after all coding work is done and all other quality gates pass (Some flaky tests for firefox and WebKit are acceptable, that's why they only warn)) 
7. `npm run formpack:validate`
8. `npm run build`
9. minimum 80% Test coverage for new code
10. If tests cannot be run because dependencies are missing try to install them e.g. npx playwright install
11. Ignoring files or silencing errors is not a solution. All quality gates must be met.

If any step fails: fix it before finishing.

## Tests (phased)
- If `npm run test` exists, run it and fix failures before proposing a PR.
- If no test runner is configured yet (no `test` script), state that explicitly in the PR description and do not invent a large test suite unless the issue asks for it.
- Create Unit tests if possible (80% coverage is good and should be a target)
- Check if any existing tests need to be changed
- Minimum test coverage expectations:
  - P0 bugfix: add at least one regression test (unit or integration) and run the relevant manual checklist.
  - P0/P1 feature: add at least one integration test for the primary user flow plus unit tests for pure logic/validators.
  - Docs-only changes: no tests required, but CI must remain green.
- Node 24 is needed to run all tests, if Node 24 is not available stop the not available checks and inform the user

### Test locations
- Vitest-based unit and component tests are located in `/app/tests`.
- Playwright-based E2E tests are located in `/app/e2e`.

### When changing behavior
- Add or update unit tests for new/changed business logic (e.g., mapping, validation, export, storage).
- Prefer fast, deterministic tests. Avoid flaky E2E tests.

### E2E
- Only add E2E tests when the issue explicitly requires it or when touching critical user flows.
- Keep E2E coverage minimal (smoke tests) and stable.

## 4) Code style: readability first
- Prefer small, composable functions.
- Keep React components focused; extract helpers into `src/lib/` where appropriate.
- Use explicit types for public APIs and complex objects.
- Prefer early returns and clear naming over cleverness.

## 5) Comments & documentation standard
- **English only** for code and test comments.
- **Explain decisions, not mechanics:** Comments should capture rationale, constraints, and non-obvious behavior. Avoid “what the code does” narration.
- **Privacy-first:** Comments must never contain real patient/health data or identifiable personal information. Use synthetic examples only.
- **TSDoc requirement for public APIs:** exported functions, exported classes, exported hooks, and exported type aliases/interfaces in `app/src/**` should include TSDoc blocks (`/** ... */`).
- **Required minimum tags for public APIs:** `@param` (for each parameter), `@returns` (when returning non-void), and `@throws` when throwing domain-relevant errors.
- **Use `@remarks` for constraints/invariants:** especially for privacy/security, offline-first assumptions, schema compatibility, and migration behavior.
- **Use structured prefixes where relevant:**
  - `RATIONALE:` design decision / trade-off
  - `NOTE:` non-obvious behavior / edge case
  - `SECURITY:` privacy, data-handling, threat model constraints
  - `TODO:` only with a clear next action (avoid vague TODOs)
- **Minimize surface area:** Prefer a single short header comment (file/function) over many inline comments.
- **Tests:** Only comment when mocking or setup is tricky, or when explaining a regression scenario. No flaky patterns (no sleeps/time-based assertions).
- **Review gate:** If a comment is added, reviewers should be able to answer: “Does this reduce future misunderstanding or prevent a known class of mistakes?” If not, remove it.
- **Lint gate:** TSDoc syntax must pass ESLint (`tsdoc/syntax`). Invalid TSDoc blocks fail CI.

## 6) Tooling expectations (baseline)
- Linting: ESLint with TypeScript support.
- Formatting: Prettier.
- Type safety: `tsc --noEmit` as `typecheck`.

When adding or updating tooling:
- Keep configuration minimal and documented.
- Add npm scripts for all quality gates.
- Ensure devs can run everything locally.

## 7) Static analysis (security) — planned and encouraged
- Prefer enabling GitHub CodeQL scanning for JavaScript/TypeScript in CI (separate workflow).
- Keep the initial query suite at default, then consider security-extended.

Do not block feature work on this unless the issue explicitly targets security tooling.

## 8) PR discipline
- One issue per PR when feasible.
- PR description must include:
  - what changed
  - how it was verified (commands + results)
  - known limitations / follow-ups
  - Run npm run format before opening PRs if format:check fails.

## 9) Data model constraints (MVP)
- Storage: IndexedDB (`mecfs-paperwork`, v3) with four stores: `records`, `snapshots`, `formpackMeta`, `profiles`. Keep migrations explicit (bump `DB_VERSION` in `app/src/storage/db.ts`).
- Export: primary DOCX (A4 + Wallet as separate downloads), plus JSON backup/import.
- i18n: DE + EN from the start; locale stored per record and kept in exports.
