# Formpacks module

## Purpose

This folder contains formpack domain logic: loading assets, manifest validation, visibility rules, and document-model projections.

## Main building blocks

- `registry.ts` + `formpackIds.ts`: canonical IDs and constants
- `loader.ts`: validates and loads manifest/schema/ui-schema
- `backgroundRefresh.ts`: best-effort cache refresh for updated formpack assets
- `documentModel.ts`: transforms form data into export-ready document models
- `visibility.ts` and `doctorLetterVisibility.ts`: UI and field visibility rules

## Public boundary

- Prefer importing shared formpack APIs from `./index.ts`.
- Keep formpack-specific logic in feature subfolders (e.g. `doctor-letter/`, `offlabel-antrag/`).
