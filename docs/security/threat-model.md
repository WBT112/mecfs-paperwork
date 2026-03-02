# Threat Model (mecfs-paperwork)

> This document is a high-level threat model for mecfs-paperwork. It is intended to guide secure development and reviews.  
> It intentionally avoids exploit-style details and must not contain real patient/health data.

## 1. Scope and assumptions
- **App type:** Client-side web application (offline-first). No backend is required for core functionality.
- **Primary runtime:** Browser (React/Vite), optionally served via NGINX (Docker/Compose).
- **Data classification:** Potentially sensitive user-entered data. Treat all user content as sensitive by default.
- **Non-goals:** No telemetry/tracking. No remote data collection.

## 2. Assets to protect
- **User-entered form data** (in-memory and any local persistence).
- **Exports** (e.g., generated DOCX/PDF/JSON files and filenames/metadata).
- **Local persistence** (e.g., localStorage, cached state, imported packs/templates).
- **Build/runtime supply chain** (dependencies, Docker images, CI pipeline).

## 3. Entry points and attack surface
- **UI input surface:** Form inputs and any free-text fields.
- **File-based inputs:** Imported formpacks/templates/content files.
- **Export surface:** DOCX/JSON export generation, filename construction.
- **Routing surface:** Deep links / SPA fallback and any URL-derived state (if present).
- **Build/deploy surface:** Dockerfile/Compose, NGINX config, CI actions, dependencies.

## 4. Trust boundaries
- **Browser boundary:** Everything runs in the user’s browser; local device security matters.
- **No server trust boundary:** There is no server-side validation by default; input validation is client-side.
- **Static hosting boundary:** When served via NGINX, configuration must prevent content sniffing and unintended caching/leakage.

## 5. Threats (high-level)
### T1: Sensitive data leakage
- Accidental storage of more data than necessary (persistence, logs).
- Overly verbose error messages containing user content.
- Export filenames/metadata unintentionally embedding sensitive values.

### T2: Injection and unsafe rendering
- Rendering untrusted content (templates/markdown) unsafely.
- DOM-based XSS risks if any raw HTML rendering is introduced.

### T3: Malicious or malformed inputs
- Malformed formpacks/templates causing crashes, hangs, or unexpected behavior.
- Path/filename traversal risks in export helpers (if any filesystem-like logic exists).

### T4: Supply chain risk
- Vulnerable dependencies (npm audit, Dependabot).
- CI/CD actions misuse, insecure configs, or compromised images.

### T5: Misconfiguration in container/runtime
- Missing security headers.
- Over-permissive container settings (privileges, filesystem writes, capabilities).

## 6. Current mitigations (expected / baseline)
- **Quality gates:** lint, format, typecheck, unit tests, e2e tests, build, formpack validation.
- **Offline-first:** No telemetry/network calls for core functionality.
- **Privacy rules:** No real patient/health data in repo, issues, tests, logs.
- **Container hardening (where applicable):** NGINX config and minimal runtime image.
- **Safe markdown baseline:** `react-markdown` with raw HTML disabled (`skipHtml`) and explicit link safety checks.
- **Path write hardening:** shared path helpers block dangerous prototype path segments in mutable writes.
- **Profile persistence control:** users can disable persistence and optionally delete previously saved profile data.

## 7. Security requirements (engineering rules)
- Never log user-entered content or exports (only redacted summaries if necessary).
- Avoid storing full payloads; prefer minimization and clear retention boundaries.
- Validate and constrain any template/formpack inputs; fail safely with actionable, non-sensitive errors.
- Avoid unsafe HTML rendering; prefer safe markdown rendering without raw HTML (Markdown uses react-markdown with raw HTML disabled).
- Keep dependencies current; prioritize high/critical fixes.

## 8. Open risks / backlog
- [x] Document which fields/state (if any) are persisted locally and why. *(Covered by `docs/diagnostics-bundle.md` and `app/src/storage/README.md`; IndexedDB stores records, snapshots, profiles, and formpack metadata — all encrypted at rest.)*
- [x] Define a stable strategy for redaction/sanitization in errors and debug info. *(Implemented in `app/src/lib/diagnostics/redact.ts` — ring buffer, forbidden-key stripping, email/date pattern detection.)*
- [ ] Review NGINX headers and caching strategy for privacy on a regular cadence.
- [x] Ensure import/export helpers are robust against malformed inputs. *(JSON import validates with lenient schema, readOnly/unknown field stripping, schema defaults, and size limits; DOCX template errors are caught and mapped to i18n keys.)*

## 9. Review cadence
- This document should be reviewed **regularly** and after major architectural changes.
- The security review summary should be recorded separately (see `docs/security/security-review.md`) on a regular cadence.
