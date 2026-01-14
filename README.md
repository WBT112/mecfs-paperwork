# mecfs-paperwork

Offline-first tool for creating and managing ME/CFS-related forms ("formpacks") including export (e.g., DOCX, JSON).

**Important:** This repository must **not contain any real patient data** (not in issues, logs, screenshots, fixtures, or export files).

Use **Discussions** for general topics/feature requests. Use **Issues** for bugs.

---

## Repository structure

- `app/` - React/Vite frontend (build output: `app/dist`)
- `formpacks/` - Formpacks (schemas, UI schemas, i18n, templates)
- `docs/` - Project documentation (QA, i18n, formpacks, export formats)
- `tools/` - Local helper scripts (quality gates, support zip, skeletons)
- `.github/workflows/` - CI workflows

---

## Local development

```bash
cd app
npm install
npm run dev
```

Note: `predev`/`prebuild` automatically sync `formpacks/` to `app/public/formpacks`.

---

## Quality gates (local)

All checks run from the `app/` directory:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
npm run test:e2e
npm run formpack:validate
```

Optional (coverage report):

```bash
npm run test:coverage
```

### One-command check (PowerShell)

There is a helper script in `tools/` that automates the quality gates (including optional Docker build + smoke test):

```powershell
. .\tools\run-quality-gates.ps1
```

Options (depending on script version):
- Skip Docker checks: `-SkipDockerChecks`
- Keep container running after smoke test: `-KeepDockerRunning`

---

## Formpacks

Formpacks live at the repo root under `formpacks/<id>/...`.

### Create a new formpack

```bash
cd app
npm run formpack:new -- --id <packId> --title "<Title>" [--register]
```

- Default: `exports: ["docx","json"]`
- `--register` is optional and adds the ID to `app/src/formpacks/registry.ts` so the pack appears in the UI immediately.

### Validate formpacks (contract + DOCX preflight)

```bash
cd app
npm run formpack:validate
```

---

## Docker (static deployment via NGINX)

The container build generates static assets and serves them through NGINX.

### Docker Compose (local)

```bash
docker login dhi.io   # (free Docker token required)
docker compose up --build
```

Open:
- http://localhost:8080

Stop/cleanup:

```bash
docker compose down
```

Note: The healthcheck uses `nginx -t` because the runtime image does not include HTTP clients.

### Docker build/run (direct)

```bash
docker login dhi.io   # (free Docker token required)
docker build -t mecfs-paperwork:local .
docker run --rm -p 8080:80 mecfs-paperwork:local
```

Open:
- http://localhost:8080

Optional smoke test (HTTP 200 expected):

```powershell
curl.exe -i http://localhost:8080/
curl.exe -i http://localhost:8080/some/deep/link
```

---

## Documentation

- Formpacks: `docs/formpacks.md`
- i18n conventions: `docs/i18n.md`
- JSON export format: `docs/formats/json-export.md`
- QA overview: `docs/qa/README.md`
  - Definition of Done / quality gates: `docs/qa/dod.md`
  - Test concept: `docs/qa/testkonzept.md`
  - Test data/privacy: `docs/qa/testdaten.md`
  - Manual checklists: `docs/qa/manual-checklists.md`
- Contribution guidelines: `CONTRIBUTING.md`
- Agent/automation standards and quality gates: `AGENTS.md`

---

## Security / Responsible disclosure

If you find a security issue:
- Please open a GitHub issue with prefix **[SECURITY]** or contact the maintainer directly on GitHub.
- Do not post exploit-ready details publicly; do not share real patient data.
We keep two lightweight security/privacy artifacts in the repo:
- `docs/security/threat-model.md` (scope, assets, trust boundaries, attack surface)
- `docs/security/security-review.md` (monthly, evidence-based review log)
(See also: `SECURITY.md`.)

---

## AI-assisted development (transparency)

This project is developed in part with AI assistance (e.g., agents/Codex/Jules). This is intentional: the problem matters, development should move quickly, and AI helps deliver small changes faster.

Important: AI does not replace quality or security measures. Changes are not accepted "blindly"; they go through review and the existing quality gates (see "Quality gates" and CONTRIBUTING/AGENTS).

---

## License

See `LICENSE`.
