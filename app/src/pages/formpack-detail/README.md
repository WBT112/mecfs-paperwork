# Formpack detail page module

## Purpose

Private module area used by `FormpackDetailPage`.

## Structure

- `components/`: page-local UI building blocks
- `hooks/`: stateful workflow orchestration
- `helpers/`: pure helper modules grouped by domain

## Boundary

- This module is page-private.
- `components/index.ts` is the local UI barrel for `FormpackDetailPage`.
- For `hooks/` and `helpers/`, prefer direct imports from the owning domain module instead of recreating a catch-all barrel at the root.
