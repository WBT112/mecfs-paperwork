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

## [0.6.0] - 2026-02-22

### Added

- **offlabel-antrag Formpack:** Off-label application letter generator with medication-specific indication selection, severity scoring, and legal references.
- **offlabel-antrag PDF export:** Client-side PDF generation with DOCX-parity content, gender-specific liability wording, and modular severity text.
- **offlabel-antrag DOCX export:** Structured multi-part letter with bullet indentation, attachments, and fallback liability text for legacy mappings.
- **Intro gate:** Configurable pre-form consent gate for formpacks (used by offlabel-antrag).
- **InfoBox system:** Conditional contextual help boxes anchored to form fields, with `showIf` conditions and markdown support.
- **Profile opt-out:** Confirm and optionally delete saved master data when opting out of profile storage.
- **Diagnostics bundle:** Support bundle export (download and clipboard) for troubleshooting.
- **Storage health dashboard:** Visual storage health display on the Help page.
- **SW/PWA status display:** Service worker registration and update status on the Help page.
- **Reset all local data:** Danger zone action to clear all IndexedDB stores and localStorage.

### Changed

- Accessibility gate tightened to moderate+ violations with expanded route coverage.
- PDF heading fonts unified across all formpacks.
- Formpack field template and InfoBox utilities renamed from doctor-letter-specific to generic formpack scope.
- PDF template simplified by removing fragile label-based KV-table lookups in favor of direct templateData access.

### Fixed

- DOCX bullet indentation and list wrapping for Word rendering.
- Preview text consistency for edge-case medication paths.
- Empty part-1 attachments section hidden when no attachments are present.

### Security

- Security review and hardening (server headers, CSP, threat model updates).

## [0.5.0] - 2026-02-09

### Added

- **doctor-letter Formpack:** ICD-10 letter generator for ME/CFS with support for the new ICD-10-GM2026 codes (G93.30, G93.31, G93.39, R53.0).
- **PDF Export:** Client-side PDF generation for doctor-letter using @react-pdf/renderer (A4 format, offline-capable).
- **Decision logic:** Intelligent case differentiation based on ME/CFS criteria (IOM, CCC), causes (infections, vaccinations, medications), and symptoms (PEM, chronic fatigue).
- **Annexes:** Two supporting image files (ICD-10 schema and practice guideline excerpt) for better understanding.
- **Infoboxes:** Contextual help boxes with links to practice guidelines and diagnostic questionnaires.
- **PWA caching strategy:** Documented and implemented bounded offline-first caching strategy with Workbox (`app/src/pwa/sw.ts`, `docs/pwa-caching.md`).

### Changed

- Formpack registry extended with `doctor-letter` formpack.
- PDF export infrastructure: Introduction of `PdfExportButton`, `PdfExportRuntime`, template registry, and Liberation fonts.
- Export documentation updated with PDF export guide (`docs/formats/pdf-export.md`).

### Security

- **Privacy notice documented:** Clarification in threat model documentation that local browser storage (IndexedDB, localStorage) is not automatically encrypted. Risks and mitigation strategies added (`docs/security/threat-model.md`).

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
