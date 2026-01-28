# Test Concept

## Purpose
Provide a concise, binding testing strategy so PRs have consistent acceptance criteria, offline-first constraints stay intact, and critical flows do not regress.

## Scope & Priorities
**In scope**
- Offline-first behavior (no runtime network requests beyond static assets).
- IndexedDB persistence and migrations.
- i18n (DE/EN) and locale persistence in records/exports.
- Critical flows:
  - Import/Export roundtrip (JSON backup).
  - DOCX export (A4 + Wallet) stability (functional checks).

**Out of scope (unless explicitly required)**
- Large E2E suites and multi-browser/device matrices.
- Performance/load testing (track separately).
- Security penetration testing (track separately).

## Risk-Based Focus (What Must Never Break)
1. **Data integrity:** records, revisions, and exports stay consistent across import/export.
2. **Offline-first:** app loads and works without network (except static assets).
3. **Locale correctness:** DE/EN translation and locale persistence in exports.
4. **Export correctness:** DOCX and JSON outputs are generated and usable.

## Principles
- **Privacy-first:** synthetic data only; never log or persist real user data.
- **Determinism:** prefer stable, fast tests over brittle UI automation.
- **Offline fidelity:** tests must not rely on runtime network access.

## Test Pyramid (Target)
- **Unit tests (majority):** pure logic, validators, mappers, data transformations.
- **Integration tests (secondary):** storage + export + UI boundaries and cross-module flows.
- **E2E tests (small, focused):** a smoke suite for critical user journeys.

Target ratio (guidance, not a hard rule): ~70% unit, ~25% integration, ~5% E2E.

## E2E Strategy (Balanced, Not Bloated)
E2E is required for user-critical flows, but must remain small and stable.

**Smoke suite scope (keep to 3–5 flows)**
- Create or open a record and save.
- Export JSON and import it back (roundtrip).
- Generate DOCX (A4 + Wallet).
- Switch language (DE/EN) and verify persistence.
- Offline load after first load.

**When to add an E2E test**
- A change affects a critical flow listed above.
- A bug escaped unit/integration tests and impacts user-visible behavior.
- A new end-to-end user journey is introduced.

**When NOT to add E2E**
- Pure logic changes (use unit tests).
- UI refactors without behavior change (use integration tests if needed).
- Coverage that can be achieved with deterministic integration tests.

**E2E constraints**
- Single browser by default (Chromium). Cross-browser runs only for releases or when fixing browser-specific bugs.
- Keep total E2E runtime short; avoid long, flaky test chains.

Detailed minimum requirements per change type are defined in [Definition of Done](./dod.md).

## Tooling Decision (Aligned to Current Stack)
- **Unit/Integration:** **Vitest + React Testing Library** (fits Vite + React).
- **E2E smoke tests:** **Playwright** for a small, stable smoke suite.

Rationale: Playwright is already installed and provides immediate coverage for critical flows; Vitest + Testing Library is the minimal, conventional choice for Vite + React without introducing heavy tooling.
