# Offlabel Cleanup Audit (Conservative)

## Scope and intent

This audit documents the current offlabel-antrag implementation paths and known
technical debt without changing runtime behavior.

## Current live paths

### UI and preview path

1. Form schema and UI schema are loaded from:
   - `public/formpacks/offlabel-antrag/schema.json`
   - `public/formpacks/offlabel-antrag/ui.schema.json`
2. Conditional field visibility is applied by:
   - `src/formpacks/offlabel-antrag/uiVisibility.ts`
3. Preview documents are built by:
   - `src/formpacks/offlabel-antrag/content/buildOfflabelDocuments.ts`
4. Preview rendering is consumed in:
   - `src/pages/FormpackDetailPage.tsx`

### Export path (DOCX/JSON projection)

1. Export model projection is built by:
   - `src/formpacks/offlabel-antrag/export/documentModel.ts`
2. Generic formpack projection entrypoint:
   - `src/formpacks/documentModel.ts`
3. DOCX context mapping and defaulting:
   - `src/export/docx.ts`
   - `public/formpacks/offlabel-antrag/docx/mapping.json`
   - `public/formpacks/offlabel-antrag/templates/a4.docx`

## Known debt / legacy areas

1. Test-compat wrapper module:
   - `src/formpacks/offlabel-antrag/letterBuilder.ts`
   - Currently used by unit tests, not by runtime export flow.
2. Duplicate medication source data:
   - `src/formpacks/offlabel-antrag/content/drugConfig.ts`
   - `src/formpacks/offlabel-antrag/medications.ts`
   - Overlapping fields are maintained in two places.
3. Unreferenced static PDFs:
   - `public/formpacks/offlabel-antrag/assets/*.pdf`
   - Files are intentionally kept as manual asset repository.
4. Locale coupling:
   - EN preview path is partially coupled to current export/model logic.
   - Not changed in this conservative cleanup.

## Risk classification and recommended follow-ups

### Low risk

1. Keep adding drift guards between medication sources.
2. Improve inline documentation around offlabel export wiring.

### Medium risk

1. Consolidate `drugConfig.ts` and `medications.ts` into one source of truth.
2. Remove `letterBuilder.ts` after migrating dependent tests.

### High risk

1. Fully decouple locale content builders (DE/EN) while preserving exact output.
2. Restructure preview/export content pipeline in a single canonical builder.

## Notes

This document is intentionally conservative and does not prescribe immediate
runtime refactors. It provides a stable baseline for future targeted cleanup PRs.
