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

## [0.6.0] - 2026-02-27

### Added

- **offlabel-antrag formpack:** New insurer-focused off-label request flow with medication-specific indication paths, severity capture, legal framing, and medication-specific evidence references.
- **offlabel-antrag export suite:** New DOCX and PDF outputs with multi-part insurer/medical/physician sections, plus annex checklist and structured attachments assistant.
- **Guided offlabel UX:** Intro gate, notes modal, final-text preview tabs, focus handling, and context-sensitive InfoBoxes (`showIf` + markdown).
- **Encrypted local persistence:** Drafts, snapshots, and saved profile data are now encrypted before IndexedDB storage.
- **Encrypted JSON export/import:** Optional password-protected JSON exports with local decrypt-on-import flow.
- **Cross-formpack master data profile:** Save/apply patient/doctor/insurer fields across formpacks, with optional opt-out cleanup flow.
- **Diagnostics expansion:** Local diagnostics bundle (download + clipboard), storage health details, encryption status, and service worker checks in Help.
- **Performance instrumentation:** User Timing metrics for app boot, formpack load, and export actions.
- **Local reset control:** “Reset all local data” action for full local cleanup and recovery from locked storage states.

### Changed

- **offlabel-antrag maturity:** Workflow, legal phrasing (including §2 Abs. 1a branches), liability wording, and indication selection behavior were iterated and stabilized; formpack version set to `1.0.0`.
- **Export consistency:** Offlabel DOCX/PDF layout, heading/date spacing, and checklist phrasing aligned for parity and readability.
- **FormpackDetail architecture:** Detail page refactored into focused sections/panels (records, snapshots, import, preview), improving maintainability and testability.
- **Formpack framework naming:** Field template and InfoBox utilities generalized from doctor-letter-specific naming to formpack-wide scope.
- **Formpack updates beyond offlabel:** doctor-letter bumped to `1.1.0`; notfallpass schema/text and import behavior refreshed.
- **Accessibility gate:** Axe checks tightened to moderate-or-higher findings with broader route coverage.
- **Quality gate/tooling coverage:** QA workflow, soft E2E profile, bundle-size checks, and cleanup reports expanded.

### Fixed

- JSON import compatibility for schema drift and conditional-rule changes (including encrypted JSON and older/partial exports).
- DOCX bullet indentation, list wrapping, and section spacing for reliable Word rendering.
- Preview and export text consistency in edge-case medication/indication combinations.
- Empty attachments block in offlabel part 1 is hidden when no attachments are present.
- PDF checklist checkboxes now reliably mirror selected annexes.
- DOCX worker path/export flow hardening for offline and CI scenarios.
- Bundle-size guardrails now enforce a strict 500 KB app-chunk hard limit in tests.

### Security

- Content Security Policy and security headers hardened for static hosting.
- IndexedDB at-rest encryption introduced with key-cookie handling and locked-state recovery path.
- Password-based JSON encryption/decryption flow added for export/import.
- Path write hardening added to block dangerous prototype-path segments.
- Security documentation updated (privacy/help guidance, threat model, review log) and dependency/security updates integrated (including AJV/CVE-related updates and workflow security maintenance).

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
[Unreleased]: https://github.com/WBT112/mecfs-paperwork/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/WBT112/mecfs-paperwork/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/WBT112/mecfs-paperwork/compare/v0.1.0...v0.5.0
[0.1.0]: https://github.com/WBT112/mecfs-paperwork/releases/tag/v0.1.0
-->
