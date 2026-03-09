# Components

Focused presentational building blocks for `FormpackDetailPage`.

## Scope

- layout sections (`FormContentSection`, `DocumentPreviewPanel`)
- detail header and banners (`FormpackDetailHeader`, `QuotaBanner`)
- tool panels (`RecordsPanel`, `SnapshotsPanel`, `ImportPanel`)
- larger page-local UI compositions (`FormpackFormPanel`, `FormpackExportActions`, `FormpackToolsSection`, `FormpackDocumentPreviewContent`)

## Rules

- Keep components page-local and UI-focused.
- `components/index.ts` is the intended local import boundary for `FormpackDetailPage`.
- Move storage, import/export, or normalization logic into `../hooks` or `../helpers`.
- Shared UI primitives still belong in `app/src/components`.
