# mecfs-paperwork – Codex Guidance

## Projektprinzipien
- Keine echten Patientendaten in Repo, Issues, Beispiel-Dateien oder Logs.
- Keine Telemetrie/Analytics, keine externen SaaS-Abhängigkeiten für MVP.
- Offline-first: keine Netzwerkrequests außer dem Laden der statischen App-Assets.

## Tech-Standards
- Frontend: React + TypeScript + Vite.
- Form-Rendering: JSON Schema; Validierung via AJV (passend zum gewählten RJSF-Validator).
- Storage: IndexedDB mit Records + Revisions (Snapshots).
- Export: Primär DOCX (A4 + Wallet als separate Downloads). Template-basiert bevorzugt.

## Arbeitsweise
- Arbeite issue-basiert: 1 Issue = 1 Branch = 1 PR.
- Führe nach Änderungen mindestens aus:
  - (im app/ Ordner) npm ci || npm install
  - npm run build
- Schreibe verständliche Fehlermeldungen und halte Änderungen klein.
- Achte auf eine hohe Test-Coverage