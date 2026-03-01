# Security Review Log (mecfs-paperwork)

> This is a high-level security review log that is updated regularly.  
> Do not include exploit instructions, PoCs, secrets, or real patient/health data.

## How to use
- Add one entry regularly (at least once per release cycle and after major security/privacy relevant changes).
- Keep it short and evidence-based (link to PRs/issues where appropriate).
- Focus on risk reduction, not exhaustive enumeration.

---

## 2026-02-20

### 1) Summary (3–6 bullets)
- Notable security/privacy improvements shipped:
  - Profile persistence can now be explicitly disabled and previously saved profile data can be deleted by user confirmation.
  - Markdown rendering remains hardened (raw HTML disabled, URL validation for links).
  - Shared safe path helpers block dangerous path segments (`__proto__`, `constructor`, `prototype`) for mutable writes.
- Notable risk areas observed:
  - Local-device compromise remains a core residual risk for client-side stored/handled sensitive data.
  - Dependency/advisory checks must remain part of regular review cadence.

### 2) Changes since last review (high-level)
- **Code changes impacting security/privacy**
  - Strengthened profile data handling controls in UI flow.
  - Consolidated safe path access/write helpers for dynamic field updates.
- **Infra/CI changes impacting security/privacy**
  - No security-critical infrastructure change identified in this review.
- **Docs/policy changes**
  - Security/threat-model review cadence updated from monthly wording to regularly.

### 3) Vulnerability & supply-chain status
- **Dependabot**
  - Status: verify regularly in GitHub Security.
  - Notes: keep lockfile/dependency updates aligned with CI checks.
- **npm audit**
  - Root: verify during regular quality/security runs.
  - /app: verify during regular quality/security runs.
  - Actions taken this cycle: no policy change in this doc update.

### 4) Threat model alignment check (quick)
Confirm whether these are still true (Yes/No + note):
- Offline-first, no telemetry/tracking: Yes — unchanged.
- No sensitive payloads in logs/errors: Yes — unchanged policy.
- Exports avoid embedding sensitive values in filenames/metadata: Yes — unchanged requirement.
- Container/runtime hardening still applied (NGINX headers / Compose constraints): Yes — unchanged baseline.

### 5) Top risks (pick up to 5)
List the most relevant current risks (high-level):
1. Sensitive data exposure on compromised/shared devices.
2. Dependency supply-chain drift without regular review.
3. Potential future reintroduction of unsafe rendering patterns.

### 6) Mitigations planned (next review cycle)
Pick 1–3 small, PR-sized next steps:
- [ ] Keep dependency/advisory status visible in CI review.
- [ ] Re-check markdown and export safety constraints after major content/export changes.
- [ ] Keep NGINX header/caching checks in regular review scope.

### 7) Notes (optional)
- Anything worth remembering for future reviews (no sensitive details).

---

## YYYY-MM-DD (e.g., 2026-01-31)

### 1) Summary (3–6 bullets)
- Notable security/privacy improvements shipped:
  - …
- Notable risk areas observed:
  - …

### 2) Changes since last review (high-level)
- **Code changes impacting security/privacy**
  - …
- **Infra/CI changes impacting security/privacy**
  - …
- **Docs/policy changes**
  - …

### 3) Vulnerability & supply-chain status
- **Dependabot**
  - Status: (e.g., no open alerts / X open PRs)
  - Notes: …
- **npm audit**
  - Root: (counts by severity) …
  - /app: (counts by severity) …
  - Actions taken this cycle: …

### 4) Threat model alignment check (quick)
Confirm whether these are still true (Yes/No + note):
- Offline-first, no telemetry/tracking: Yes/No — …
- No sensitive payloads in logs/errors: Yes/No — …
- Exports avoid embedding sensitive values in filenames/metadata: Yes/No — …
- Container/runtime hardening still applied (NGINX headers / Compose constraints): Yes/No — …

### 5) Top risks (pick up to 5)
List the most relevant current risks (high-level):
1. …
2. …
3. …
4. …
5. …

### 6) Mitigations planned (next review cycle)
Pick 1–3 small, PR-sized next steps:
- [ ] …
- [ ] …
- [ ] …

### 7) Notes (optional)
- Anything worth remembering for future reviews (no sensitive details).
