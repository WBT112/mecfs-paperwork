# mecfs-paperwork — Agent Guide (Codex)

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
2. `npm run lint`
3. `npm run format:check`
4. `npm run typecheck`
5. `npm run build`
6. `npm run test:unit`
7. `npm run test:e2e`
8. `npm run formpack:validate`

If any step fails: fix it before finishing.

## Tests (phased)
- If `npm run test` exists, run it and fix failures before proposing a PR.
- If no test runner is configured yet (no `test` script), state that explicitly in the PR description and do not invent a large test suite unless the issue asks for it.
- Create Unit tests if possible
- Check if any existing tests need to be changed
- Minimum test coverage expectations:
  - P0 bugfix: add at least one regression test (unit or integration) and run the relevant manual checklist.
  - P0/P1 feature: add at least one integration test for the primary user flow plus unit tests for pure logic/validators.
  - Docs-only changes: no tests required, but CI must remain green.

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
- Add comments for:
  - non-obvious business rules
  - tricky edge cases
  - data model assumptions (e.g., IndexedDB schema, migrations)
- Prefer short, high-signal comments (why/how), not restating the code.
- For exported functions and modules: add a brief doc comment (TSDoc/JSDoc style).

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
- Storage: IndexedDB with `records` + `revisions` (snapshots). Keep migrations explicit.
- Export: primary DOCX (A4 + Wallet as separate downloads), plus JSON backup/import.
- i18n: DE + EN from the start; locale stored per record and kept in exports.
