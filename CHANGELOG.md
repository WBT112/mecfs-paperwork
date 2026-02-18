# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project aims to follow Semantic Versioning (SemVer) going forward.

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

### Deprecated
- 

### Removed
- 

### Security
- 


## [0.5.0] - 2026-02-09

### Added
- **doctor-letter Formpack:** ICD-10 Briefgenerator für ME/CFS mit Unterstützung für die neuen ICD-10-GM2026 Kodierungen (G93.30, G93.31, G93.39, R53.0).
- **PDF Export:** Client-seitige PDF-Generierung für doctor-letter mit @react-pdf/renderer (A4-Format, Offline-fähig).
- **Entscheidungslogik:** Intelligente Fallunterscheidung basierend auf ME/CFS-Kriterien (IOM, CCC), Ursachen (Infektionen, Impfungen, Medikamente) und Symptomen (PEM, chronische Fatigue).
- **Annexe:** Zwei unterstützende Bilddateien (ICD-10-Schema und Praxisleitfaden-Auszug) für besseres Verständnis.
- **Infoboxen:** Kontextuelle Hilfeboxen mit Links zu Praxisleitfaden und Diagnosefragebögen.
- **PWA-Caching-Strategie:** Dokumentierte und implementierte bounded offline-first Caching-Strategie mit Workbox (`app/src/pwa/sw.ts`, `docs/pwa-caching.md`).

### Changed
- Formpack-Registry erweitert um `doctor-letter` Formpack.
- PDF-Export-Infrastruktur: Einführung von `PdfExportButton`, `PdfExportRuntime`, Template-Registry und Liberation-Schriftarten.
- Export-Dokumentation aktualisiert mit PDF-Export-Anleitung (`docs/formats/pdf-export.md`).

### Security
- **Privacy-Hinweis dokumentiert:** Klarstellung in der Threat-Model-Dokumentation, dass lokaler Browser-Speicher (IndexedDB, localStorage) nicht automatisch verschlüsselt ist. Risiken und Mitigationsstrategien hinzugefügt (`docs/security/threat-model.md`).


## [0.1.0] - 2026-01-14

### Added
- Initial tagged release.
- Offline-first Notfallpass formpack with JSON export/import.
- Snapshot create/restore for drafts.
- DOCX export (A4) with template + mapping support.
- Formpack authoring scaffold: `npm run formpack:new -- --id <id> --title "<title>" [--register]`.
- Formpack validation: `npm run formpack:validate` including contract checks and DOCX template preflight.

### Changed
- Refactored export code for better maintainability and extensibility.

### Fixed
- Various bug fixes related to form data handling and validation.

### Security
- No telemetry by design (offline-first).


<!--
Link references (optional):
[Unreleased]: https://github.com/WBT112/mecfs-paperwork/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/WBT112/mecfs-paperwork/compare/v0.1.0...v0.5.0
[0.1.0]: https://github.com/WBT112/mecfs-paperwork/releases/tag/v0.1.0
-->
