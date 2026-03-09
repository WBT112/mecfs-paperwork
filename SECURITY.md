# Security Policy

## Supported Versions
This project is under active development. Security fixes are provided for:
- The `main` branch (and the latest released build, if applicable)

If you are running an older commit, please update and re-test before reporting.

## Security artifacts

This project maintains two security/privacy artifacts to keep decisions reviewable and aligned with the actual codebase:

- `docs/security/threat-model.md` — high-level threat model (scope, assets, trust boundaries, attack surface).  
- `docs/security/security-review.md` — regular security review log (high-level changes, supply-chain status, top risks, next steps).

Notes:
- These documents intentionally avoid exploit-style details (no PoCs, no step-by-step attack instructions).
- Do not include secrets or real patient/health data anywhere (including issues, PRs, logs, or security artifacts).

## Reporting a Vulnerability

### Preferred contact
Please report security issues **via GitHub**:
1. **Open a GitHub Issue** (recommended for most cases)  
   - Title prefix: **[SECURITY]**
   - Keep the report **high-level** and **do not include exploit-ready details** in public.
   - If sensitive details are needed, write in the issue that you request a **private follow-up channel** with the repository owner.

2. This repository has the **“Report a vulnerability”** button enabled (GitHub Security Advisories), you may use it for **private reporting**.

If you are unsure whether something is security-relevant, open an issue with **[SECURITY]** anyway.

### What to include
Please include:
- A clear description of the issue and potential impact
- Steps to reproduce (safe / non-destructive)
- Affected area (e.g. export/mapping/storage, formpacks, DOCX templates, build pipeline)
- Environment details (OS, browser, Node/npm versions, app version/commit hash)
- Any mitigations or suggested fix (if you have one)

### Privacy / sensitive data
This project is related to medical paperwork. Please **never include real patient data** in:
- issues, attachments, screenshots, logs, or proof-of-concepts

Use clearly fake example data only.

## Disclosure
We aim to coordinate a responsible disclosure. Please do not publicly disclose detailed exploit steps until a fix is available (or we explicitly agree otherwise).
