[![QA Gates](https://github.com/WBT112/mecfs-paperwork/actions/workflows/qa.yml/badge.svg?branch=main)](https://github.com/WBT112/mecfs-paperwork/actions/workflows/qa.yml)
[![E2E Tests](https://github.com/WBT112/mecfs-paperwork/actions/workflows/e2e.yml/badge.svg?branch=main)](https://github.com/WBT112/mecfs-paperwork/actions/workflows/e2e.yml)
[![License: Apache-2.0](https://img.shields.io/github/license/WBT112/mecfs-paperwork)](https://github.com/WBT112/mecfs-paperwork/blob/main/LICENSE)
[![Release](https://img.shields.io/github/v/release/WBT112/mecfs-paperwork?sort=semver)](https://github.com/WBT112/mecfs-paperwork/releases)

# mecfs-paperwork

Offline-first tool for creating and managing ME/CFS-related formpacks with export (DOCX, PDF, JSON).

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

## Quick Start

```bash
cd app
npm ci
npm run dev
```

## Documentation
Start here: `docs/README.md`

Highlights:
- Getting started and quality gates: `docs/getting-started.md`
- Formpacks authoring: `docs/formpacks.md`
- Export formats: `docs/formats/pdf-export.md` and `docs/formats/json-export.md`
- Deployment and Docker/Compose: `docs/deployment.md`
- QA checklists: `docs/qa/README.md`
- Security: `docs/security/`

## Contributing & Security
- Contributing guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- License: `LICENSE`

## AI-assisted development (transparency)

This project is developed in part with AI assistance (e.g., agents/Codex/Jules). This is intentional: the problem matters, development should move quickly, and AI helps deliver small changes faster.

Important: AI does not replace quality or security measures. Changes are not accepted "blindly"; they go through review and the existing quality gates (see "Quality gates" and CONTRIBUTING/AGENTS).

### GitHub Copilot Instructions

This repository includes comprehensive instructions for GitHub Copilot coding agent:

- **`.github/copilot-instructions.md`** - Repository-wide instructions with code examples, troubleshooting, and quality guidelines
- **`AGENTS.md`** - Agent persona definitions, boundaries, and quality gate requirements
- **`.github/instructions/`** - Path-specific instructions:
  - `formpacks.md` - Guidelines for formpack content (JSON schemas, DOCX templates)
  - `typescript-react.md` - TypeScript/React code standards and testing requirements

These instructions help ensure consistent code quality, maintain privacy standards, and follow best practices automatically.

---
