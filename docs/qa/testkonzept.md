# Test Concept (M0)

## Purpose
Define a short, binding testing strategy for M0 so PRs have consistent acceptance criteria, offline-first constraints stay intact, and critical flows do not regress.

## Scope & Priorities (M0)
**In scope**
- Offline-first behavior (no runtime network requests beyond static assets).
- IndexedDB persistence and migrations.
- i18n (DE/EN) and locale persistence in records/exports.
- Critical flows:
  - Import/Export roundtrip (JSON backup).
  - DOCX export (A4 + Wallet) stability (functional checks; deeper coverage later).

**Out of scope (M0)**
- Large E2E suites and multi-browser/device matrices.
- Performance/load testing (track as follow-up).
- Security penetration testing (track as follow-up).

## Risk-Based Focus (What Must Never Break)
1. **Data integrity:** records, revisions, and exports stay consistent across import/export.
2. **Offline-first:** app loads and works without network (except static assets).
3. **Locale correctness:** DE/EN translation and locale persistence in exports.
4. **Export correctness:** DOCX and JSON outputs are generated and usable.

## Test Types (Minimum Intent)
- **Unit tests:** pure logic, validators, mappers, data transformations.
- **Integration tests:** cross-module flows (storage + export + UI boundaries).
- **E2E smoke tests:** 1–2 critical flows to catch regressions early.

Detailed minimum requirements per change type are defined in [Definition of Done](./dod.md).

## Tooling Decision (Aligned to Current Stack)
- **Unit/Integration:** **Vitest + React Testing Library** (fits Vite + React). This is the target standard when unit/integration tests are introduced.
- **E2E smoke tests:** **Playwright** (already present in the repo) for 1–2 M0 critical flows.

Rationale: Playwright is already installed and gives immediate coverage for critical user flows; Vitest + Testing Library is the minimal, conventional choice for Vite + React unit/integration tests without introducing heavy tooling.

## Test Pyramid (M0)
- Prefer **unit/integration** tests for deterministic logic and data handling.
- Keep **E2E** minimal and stable (smoke tests only).
