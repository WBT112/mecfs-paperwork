# Formpack detail page module

## Purpose

UI sections used by `FormpackDetailPage`.

## Structure

Each file in this folder owns one focused section:

- header/status (`FormpackDetailHeader`, `QuotaBanner`)
- data actions (`RecordsPanel`, `SnapshotsPanel`, `ImportPanel`)
- editor/view (`FormContentSection`, `DocumentPreviewPanel`)
- dev helpers (`DevMetadataPanel`)

## Public boundary

- Import section components from `./index.ts` instead of deep file paths.
- Keep cross-section types in `sectionTypes.ts`.
