# mecfs-paperwork

Offline-first Tooling zur Erstellung und Verwaltung von ME/CFS-bezogenen Formularen („Formpacks“) inklusive Export (z. B. DOCX, JSON).

**Wichtig:** Dieses Repository darf **keine echten Patientendaten** enthalten (auch nicht in Issues, Logs, Screenshots, Fixtures oder Export-Dateien).

---

## Repository-Struktur

- `app/` – React/Vite Frontend (Build-Output: `app/dist`)
- `formpacks/` – Formpacks (Schemas, UI-Schemas, i18n, Templates)
- `docs/` – Projektdokumentation (QA, i18n, Formpacks, Exportformate)
- `tools/` – Lokale Hilfsskripte (Quality Gates, Support-Zip, Skeletons)
- `.github/workflows/` – CI Workflows

---

## Lokale Entwicklung

```bash
cd app
npm install
npm run dev
```

Hinweis: `predev`/`prebuild` synchronisieren `formpacks/` automatisch nach `app/public/formpacks`.

---

## Quality Gates (lokal)

Alle Checks werden im `app/`-Ordner ausgeführt:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:e2e
npm run formpack:validate
npm run build
```

### One-Command Check (PowerShell)

Im `tools/`-Ordner liegt ein Helper-Skript, das die Quality Gates automatisiert (inkl. optionalem Docker-Build + Smoke-Test):

```powershell
. .\tools\run-quality-gates.ps1
```

Optionen (je nach Skript-Version):
- Docker-Checks überspringen: `-SkipDockerChecks`
- Container nach Smoke-Test laufen lassen: `-KeepDockerRunning`

---

## Formpacks

Formpacks liegen im Repo-Root unter `formpacks/<id>/...`.

### Neues Formpack scaffolden

```bash
cd app
npm run formpack:new -- --id <packId> --title "<Titel>" [--register]
```

- Default: `exports: ["docx","json"]`
- `--register` ist optional und trägt die ID in `app/src/formpacks/registry.ts` ein (damit das Pack sofort in der UI erscheint).

### Formpacks validieren (Contract + DOCX Preflight)

```bash
cd app
npm run formpack:validate
```

---

## Docker (statisches Deployment via NGINX)

Der Container-Build erstellt die statischen Assets und serviert sie via NGINX.

```bash
docker login dhi.io   # nur falls erforderlich (private Registry)
docker build -t mecfs-paperwork:local .
docker run --rm -p 8080:80 mecfs-paperwork:local
```

Öffnen:
- http://localhost:8080

Optionaler Smoke-Test (HTTP 200 erwartet):

```powershell
curl.exe -i http://localhost:8080/
curl.exe -i http://localhost:8080/some/deep/link
```

---

## Dokumentation

- Formpacks: `docs/formpacks.md`
- i18n-Konventionen: `docs/i18n.md`
- JSON-Exportformat: `docs/formats/json-export.md`
- QA-Übersicht: `docs/qa/README.md`
  - Definition of Done / Quality Gates: `docs/qa/dod.md`
  - Testkonzept: `docs/qa/testkonzept.md`
  - Testdaten/Privacy: `docs/qa/testdaten.md`
  - Manuelle Checklisten: `docs/qa/manual-checklists.md`
- Contribution Guidelines: `CONTRIBUTING.md`
- Agent/Automation Standards & Quality Gates: `AGENTS.md`

---

## Security / Responsible Disclosure

Wenn du ein Sicherheitsproblem findest:
- Bitte erstelle ein GitHub Issue mit Prefix **[SECURITY]** oder kontaktiere den Maintainer direkt über GitHub.
- Keine exploit-ready Details öffentlich posten; keine echten Patientendaten teilen.

(Siehe auch: `SECURITY.md`.)

---

## Lizenz

Siehe `LICENSE`.