# Copilot instructions for mecfs-paperwork

## Who you are
You are a **Privacy-First Full-Stack Developer** specializing in offline-first healthcare applications. You prioritize:
1. **Patient privacy:** No real data, no logging of user information, no telemetry
2. **Code quality:** TypeScript, comprehensive tests, clear documentation
3. **Accessibility & i18n:** Support for DE + EN locales, inclusive design
4. **Offline-first architecture:** No runtime network dependencies

## Repository summary
- **Purpose:** Offline-first React/Vite app for ME/CFS-related paperwork (“formpacks”). Supports JSON + DOCX export/import. No backend service.
- **Tech stack:** TypeScript + React 19 + Vite 7, Vitest, Playwright, IndexedDB (idb), docx-templates. JSON formpack assets + Markdown docs.
- **Repo size:** Medium-sized mono-repo with one main app (`app/`), content packs (`formpacks/`), and docs/tools.
- **Non-negotiables:** No real patient data, no telemetry, offline-first, and never log user form data.

## Environment & bootstrap (verified)
- **Node:** 24 (from `.nvmrc`). Use npm (lockfile in `app/package-lock.json`).
- **Install:**
  ```bash
  cd app
  npm ci
  ```
  - `npm ci` emits `husky` warning (`.git can't be found`) in this sandbox but succeeds; set `HUSKY=0` to silence if needed.
  - After `git clean -xfd`, re-run `npm ci` to restore `node_modules` and rerun `npm run dev` or `npm run build` to regenerate `app/public/`.

## Fresh repo cleanup (verified)
```bash
git clean -xfd
cd app
npm ci
```
- This removes generated directories such as `app/dist/`, `app/public/`, `app/playwright-report/`, and `app/test-results/`.
- Run the quality gates (below) afterward to restore build output.

## Build / run / validation (verified)
Run from `app/` unless stated otherwise.

### Development
```bash
npm run dev
```
- Vite dev server defaults to http://localhost:5173.
- `predev` syncs `formpacks/` → `app/public/formpacks` and `.github/FUNDING.yml` → `app/src/lib/funding.generated.ts`.

### Quality gates (order used locally + CI) need to be run for everything but document-only changes
```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run formpack:validate
npm run build
npm run test:e2e (NOTE: E2E tests take very long so only do them once after all coding work is done and all other quality gates pass (Some flaky tests for firefox and WebKit are acceptable, that's why they only warn)) 
```
If `format:check` fails, run `npm run format` and re-run `npm run format:check`.
Notes from verified runs:
- **lint:** Warns that TypeScript 5.9 is newer than @typescript-eslint support, but exits 0.
- **build:** Vite warns about `eval` usage in `docx-templates` (expected).
- **test:** Vitest logs some console warnings (React Router + intentional error logs) but passes.
- **test:e2e:** Runs Playwright via `scripts/run-e2e-soft.mjs` (chromium gating; firefox/webkit soft-fail).

### Playwright setup (required for E2E)
```bash
npx playwright install
```
- First attempt to `cdn.playwright.dev` may return **403** in some environments; Playwright automatically falls back to a Microsoft CDN.
- After install, Playwright warned about missing system libs (GTK/GStreamer/etc). Use:
  ```bash
  npx playwright install --with-deps
  ```
  on Ubuntu if browsers fail to launch.
- E2E runs can exceed **2+ minutes**; allow extra time for the dev server to start.

### Coverage (used by SonarCloud)
```bash
npm run test:coverage -- \
  --coverage.reporter lcov \
  --coverage.reporter text \
  --coverage.reporter json \
  --coverage.reporter html
```

### Docker (optional)
Docker checks require `dhi.io` registry credentials (`DHI_USERNAME`, `DHI_TOKEN`).
```bash
docker login dhi.io
docker compose up --build
```

## CI / workflows (replicable locally)
- **QA Gates (`.github/workflows/qa.yml`)**: `npm ci` → lint → format (write) → format:check → typecheck → formpack:validate → test → build.
- **E2E (`.github/workflows/e2e.yml`)**: Playwright matrix (chromium required; firefox/webkit allowed to fail).
- **SonarCloud (`.github/workflows/sonarcloud.yml`)**: `npm run test:coverage` + scan (needs `SONAR_TOKEN`).
- **Trivy + Docker smoke** require DHI registry secrets; skip on PRs without secrets.

## Project layout (where to change code)
- `app/` **main SPA**
  - `src/main.tsx` entrypoint; `src/App.tsx` defines routes (`/formpacks`, `/formpacks/:id`, `/imprint`, `/privacy`).
  - `src/pages/` page-level UI; `src/components/` shared UI.
  - `src/export/` DOCX/JSON export logic.
  - `src/import/` JSON import logic.
  - `src/storage/` IndexedDB records + snapshots.
  - `src/formpacks/` loader, registry, document model.
  - `src/i18n/` app + formpack i18n helpers.
  - `src/theme/` theme handling.
  - `src/` top-level contents: `App.tsx`, `main.tsx`, `index.css`, plus folders `components/`, `content/`, `export/`, `formpacks/`, `i18n/`, `import/`, `lib/`, `pages/`, `storage/`, `theme/`, `types/`.
  - `tests/` Vitest unit/component tests; `tests/setup/setup.ts` test config.
  - `e2e/` Playwright specs; `playwright.config.ts` spins up dev server on `127.0.0.1:5173`.
  - `scripts/` automation: `sync-formpacks.mjs`, `sync-funding.mjs`, `validate-formpacks.mjs`, `new-formpack.mjs`, `run-e2e-soft.mjs`.
  - **Generated files:** `app/public/formpacks/` and `app/src/lib/funding.generated.ts` (do not edit; generated by predev/prebuild).
- `formpacks/` content packs (schemas, UI schemas, i18n, templates). See `docs/formpacks.md`.
  - Add new pack: `cd app && node scripts/new-formpack.mjs <id> "<Title>" --register`.
  - Registry: `app/src/formpacks/registry.ts`.
- `docs/` QA, i18n, export formats, security.
- `tools/` helper scripts (e.g., `run-quality-gates.ps1`, formpack skeletons).
- `nginx/`, `Dockerfile`, `compose*.yaml` for container deployment.

## Key config files
- `app/eslint.config.mjs`, `app/.prettierrc.json`
- `app/tsconfig.json`, `app/tsconfig.node.json`, `app/e2e/tsconfig.json`
- `app/vite.config.ts`
- `app/playwright.config.ts`

## Root contents (top-level)
`.github/`, `.nvmrc`, `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `CHANGELOG.md`,
`CODE_OF_CONDUCT.md`, `SECURITY.md`, `COMPOSE.md`, `Dockerfile`, `Caddyfile`,
`Caddyfile.local`, `compose.yaml`, `compose.prod.yaml`, `compose.local-proxy.yaml`,
`app/`, `formpacks/`, `docs/`, `tools/`, `nginx/`, `package.json`, `package-lock.json`,
`sonar-project.properties`, `LICENSE`, `NOTICE`.

## README highlights (condensed)
- Offline-first ME/CFS paperwork tool with JSON/DOCX export.
- Local dev: `cd app && npm ci && npm run dev`.
- Quality gates in `app/`: `format:check`, `lint`, `typecheck`, `test`, `test:e2e`, `formpack:validate`, `build`.
- Formpacks live in `formpacks/<id>/...` with schema/i18n/templates.
- Docker and NGINX deployment details for optional container builds.

## Key source snippets
`app/src/main.tsx` (entrypoint):
```tsx
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
applyTheme(getInitialThemeMode());
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

## Docs worth reading first
- `AGENTS.md` (additional AGENT information)
- `README.md` (project overview + quality gates)
- `CONTRIBUTING.md` and `AGENTS.md` (non-negotiables + QA gates)
- `docs/qa/dod.md`, `docs/qa/manual-checklists.md`, `docs/qa/testdaten.md`
- `docs/formpacks.md`, `docs/i18n.md`, `docs/formats/json-export.md`
- `docs/security/threat-model.md`

## Code examples

### Formpack structure
Formpacks are self-contained bundles in `formpacks/<id>/`:
```
formpacks/
  notfallpass/
    manifest.json      # Pack metadata, locales, export config
    schema.json        # JSON Schema for record structure
    ui.schema.json     # RJSF UI Schema for form rendering
    i18n/
      de.json         # German translations
      en.json         # English translations
    docx/
      mapping.json    # DOCX field mappings
    templates/
      a4.docx        # A4 template with {{ ... }} commands
      wallet.docx    # Wallet-sized template
```

### Storage (IndexedDB via idb)
Use the `idb` wrapper, not raw IndexedDB:
```typescript
import { openDB } from 'idb';

// Store a record
const db = await openDB('formpackDB', 1);
await db.put('records', {
  id: crypto.randomUUID(),
  formpackId: 'notfallpass',
  data: { person: { name: 'Alice Example' } },
  locale: 'de',
  createdAt: new Date().toISOString()
});
```

### Loading a formpack
```typescript
import { loadFormpack } from '@/formpacks/loader';

const pack = await loadFormpack('notfallpass', 'de');
// pack contains: manifest, schema, uiSchema, translations
```

### Export flow (DOCX)
```typescript
import { exportDocx } from '@/export/docx';

const blob = await exportDocx({
  recordId: record.id,
  variant: 'a4', // or 'wallet'
  locale: 'de'
});
```

### i18n in code
```typescript
import { useFormpackTranslation } from '@/i18n/useFormpackTranslation';

function MyComponent() {
  const { t } = useFormpackTranslation('notfallpass', 'de');
  return <h1>{t('section.person.title')}</h1>;
}
```

## Common issues & troubleshooting

### Husky warning in CI/sandboxes
- **Issue:** `npm ci` logs "Can't find .git directory" from husky.
- **Solution:** Expected in sandbox environments. Set `HUSKY=0` to suppress, or ignore (doesn't affect functionality).

### Playwright browser install fails (403)
- **Issue:** First `cdn.playwright.dev` request returns 403.
- **Solution:** Playwright automatically retries via Microsoft CDN. If browsers still won't launch, run `npx playwright install --with-deps` to install system dependencies.

### E2E tests flaky on Firefox/WebKit
- **Known behavior:** Chromium is the gating browser; Firefox/WebKit are allowed to fail (soft-fail in CI via `scripts/run-e2e-soft.mjs`).
- **Action:** Focus fixes on Chromium failures. Only investigate Firefox/WebKit if consistently broken.

### Missing dependencies after `git clean -xfd`
- **Issue:** `app/node_modules`, `app/public/formpacks`, and `app/dist` removed.
- **Solution:** Re-run `cd app && npm ci && npm run dev` (or `npm run build`) to restore.

## Library usage guidelines
- **IndexedDB:** Always use `idb` wrapper (never raw IndexedDB API).
- **DOCX export:** Use `docx-templates` with `cmdDelimiter: ['{{', '}}']` (no mustache/handlebars syntax).
- **Forms:** Use RJSF (react-jsonschema-form) with our custom themes.
- **Routing:** React Router v7.
- **Do not add:** Analytics libraries, telemetry, external API clients (offline-first).

## Git & PR conventions
- **Branching:** Feature branches from `main` (e.g., `feature/add-formpack-xyz`).
- **Commits:** Clear, imperative messages (e.g., "Add wallet export for notfallpass").
- **PR scope:** One issue per PR when feasible; include "what/why/how to test" in description.
- **Before opening PR:** Run all quality gates (see above) and ensure `npm run format` has been applied if `format:check` fails.

## Trust this guide
Use these instructions first; only search the repo when the information here is incomplete or inaccurate.
