# npm health reporting

## Overview
This project tracks npm install warnings and npm audit output in CI to keep dependency health visible without external services. CI captures npm warnings, runs `npm audit --json`, and generates a job summary plus downloadable artifacts. The report is informational by default, with an optional warnings budget gate.

## What is tracked
- **npm install warnings**: `npm WARN` lines from `npm ci --loglevel=warn`.
  - Classified as deprecated, peer/ERESOLVE, engine/EBADENGINE, or other.
- **npm audit results**: vulnerability counts by severity from `npm audit --json`.

## Where to find the output
- **GitHub Actions job summary**: "npm health" section with warning counts and audit totals in the dedicated npm health workflow.
- **Artifacts** (`npm-health`):
  - `npm-install.log`
  - `npm-warnings.json`
  - `npm-warnings.md`
  - `npm-audit.json`
  - `npm-audit-summary.md`
  - `npm-health-summary.md`

## Gating policy
CI enforces a warnings budget to prevent warning creep.

- **Warnings budget**: CI fails if total npm warnings exceed the budget.
  - Default: 5 warnings in the script.
  - CI override: set to 6 in `.github/workflows/qa.yml` to match the current baseline and prevent warning creep.
- **Audit high/critical**: Currently report-only.
  - Set `NPM_AUDIT_FAIL_HIGH=true` to fail on high/critical vulnerabilities.

## Relationship to GitHub Security/Dependabot
`npm audit` uses the GitHub Advisory Database via the npm audit protocol, but it is not a 1:1 match with Dependabot alerts. Dependabot applies additional rules (for example, it may ignore unreviewed advisories), so npm audit is used here to provide an extra per-run report and historical artifacts.

## Updating the warnings budget
Adjust the `NPM_WARNINGS_BUDGET` value in `.github/workflows/qa.yml` to a new threshold.
