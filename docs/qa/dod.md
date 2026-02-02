# Definition of Done (DoD) & QA Gates

This document defines the minimum acceptance criteria for M0 changes.

## Change-Type Requirements
- **P0 bugfix**
  - Add **at least one regression test** (unit or integration).
  - Run the **manual checklist** relevant to the bug.
- **P0/P1 feature**
  - Add **at least one integration test** for the primary user flow.
  - Add **unit tests** for pure logic/validators/mappers.
  - Run the **manual checklist** for the flow.
- **Docs-only change**
  - No tests required.
  - CI checks must remain green.

## Required Verification Commands (PR Quality Gates)
Run from `app/` unless stated otherwise:
1. `npm run lint`
2. `npm run format:check`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`
6. `npm run test:e2e`
7. `npm run formpack:validate`

Optional helper (cross-platform):
- `npm run quality-gates` (set `BYPASS_NODE_VERSION_CHECK=true` if you must run it on Node < 24)

## Manual QA Checklist (minimum)
- Import/Export roundtrip (JSON backup).
- Language switch (DE/EN).
- Offline load (app works without network after first load).

Use the templates and examples in [Manual Checklists](./manual-checklists.md).

## Privacy & Logging Rules (Binding)
- **No real patient data** in fixtures, tests, screenshots, or logs.
- **No logging** of form contents in console/CI output; log only concise error summaries.
- Use **synthetic, minimal** fixtures. See [Test Data & Privacy Policy](./testdaten.md).
