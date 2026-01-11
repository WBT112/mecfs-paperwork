# Contributing to mecfs-paperwork

Thank you for contributing. This project is **offline-first** and must avoid accidental disclosure of sensitive information. Please follow the rules below to keep contributions safe, reviewable, and consistent.

---

## Ground Rules (Non-Negotiable)

- **No real patient data** in the repository, issues, PRs, screenshots, logs, fixtures, or examples.
- **No telemetry / analytics / tracking**.
- **Offline-first**: the app must not make network requests at runtime except loading the static app assets.
- **Do not log personal/sensitive data** to the console.

---

## Language & Code Quality Standards

- **Code identifiers** (files, variables, functions) must be **English**.
- **Code comments and docs** must be **English**.
- Keep code **readable** and **well-structured**:
  - prefer small, composable functions
  - avoid cleverness; choose clarity
  - add comments for non-obvious rules and edge cases (explain *why*, not *what*)

---

## Prerequisites

### Node / npm
Use the project’s standard toolchain:
- Node: **v24.12.0**
- npm: **11.6.2**

Verify:
```sh
node -v
npm -v
```

> If you use a different npm version, you may see lockfile churn (e.g. `"peer": true` appearing). To minimize this, follow the workflow below (use `npm ci` for installs).

---

## Install & Run (Local Development)

From the repo root:

```sh
cd app
npm ci
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

### Production build preview
```sh
cd app
npm run build
npm run preview
```

---

## Dependency Management & package-lock.json Policy

### Default rule
- For local testing and PR reviews, **use `npm ci`** (it installs from `package-lock.json` deterministically and avoids rewriting it).
- Only use **`npm install`** when you **intentionally change dependencies**.

### Why you might see `"peer": true` in `package-lock.json`
Some npm versions may rewrite lockfile metadata during `npm install`. This is not necessarily harmful, but it creates noisy diffs. The best mitigation is:
- **Prefer `npm ci`**
- Keep **Node/npm versions consistent** across contributors and CI.

If you intentionally changed dependencies:
1. run `npm install`
2. ensure `package-lock.json` changes are expected
3. commit both `package.json` and `package-lock.json`

---

## Quality Gates (Must Be Green)

Before opening a PR (and before requesting review), run:

```sh
cd app
npm run lint
npm run format:check
npm run typecheck
npm run build
```

If `format:check` fails:
```sh
cd app
npm run format
npm run format:check
```

---

## Branching & PR Guidelines

- Prefer **one issue per PR**.
- Keep PRs small and focused.
- Suggested branch naming:
  - `feat/issue-<n>-short-title`
  - `fix/issue-<n>-short-title`
  - `chore/issue-<n>-short-title`

### PR description must include
- What changed (short summary)
- How it was verified (commands + outcome)
- Known limitations / follow-ups
- Confirmation of:
  - no telemetry
  - no real patient data

---

## Acceptance / Review Checklist (Standard Steps)

Use this checklist when reviewing a PR locally.

### 1) Fetch and checkout
```sh
git fetch
git switch <pr-branch>
```

### 2) Install & run quality gates
```sh
cd app
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run build
```

### 3) Manual smoke test (minimum)
```sh
cd app
npm run dev
```
- App starts without errors
- Core UI renders
- Language switch (if present) behaves correctly
- No unexpected console errors

### 4) Security / privacy sanity checks
- No real patient data in:
  - repo files
  - examples
  - tests
  - screenshots
- No new network calls added unintentionally
- No new tracking/telemetry libraries introduced
- No sensitive console logs

### 5) Final decision
- If all gates pass and scope matches the issue, approve and merge.

---

## Working with Codex (Optional)

If you delegate implementation to Codex:
- Ensure the issue has clear scope + acceptance criteria.
- Ensure the PR meets the **Quality Gates** above.
- Keep the repo’s agent guidance in `AGENTS.md` up to date.

---

## Questions
If something is unclear, open a GitHub issue describing:
- expected behavior
- current behavior
- reproduction steps
- environment (OS, Node version, npm version)