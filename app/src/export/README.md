# Export module

## Purpose

This folder implements all offline export flows.

- `docx.ts`: full DOCX export pipeline (mapping, defaults, templates, file creation)
- `docxLazy.ts`: lazy boundary for DOCX code-splitting
- `json.ts`: JSON backup export
- `pdf/`: PDF export UI/runtime/templates

## Design notes

- No runtime network dependencies beyond app-static assets.
- Export functions must not log user data.
- Keep file naming deterministic and locale-aware.

## Public boundaries

- Use `./docxLazy` from UI pages.
- Use `./pdf/index.ts` as the public PDF API surface.
- Keep template-specific logic in dedicated submodules.
