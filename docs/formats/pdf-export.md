# PDF export

## Overview
PDF exports are generated client-side in the browser using `@react-pdf/renderer` and `BlobProvider`. No network requests are made at runtime beyond loading the app’s static assets, so PDF exports work offline after the app is loaded.

## Current scope
- Supported formpacks: `doctor-letter`
- Output format: A4, auto-pagination for long content
- Content parity: patient section, doctor/practice section, case result, export date

## Adding PDF export for a new formpack
1. Add `"pdf"` to the formpack’s `exports` array in `formpacks/<id>/manifest.json`.
2. Create a document model builder in `app/src/formpacks/<id>/export/documentModel.ts` that returns a `DocumentModel` from `app/src/export/pdf/types.ts`.
3. Create a PDF template component in `app/src/export/pdf/templates/` that renders the model.
4. Register the template in `app/src/export/pdf/registry.ts`.
5. Add i18n keys for any headings/labels in `formpacks/<id>/i18n/de.json` and `formpacks/<id>/i18n/en.json`.
6. Add unit tests for the document model builder and paragraph/block parsing.

## Notes
- PDF generation runs only after an explicit user click.
- Avoid external fonts or assets to keep exports offline-first and privacy-safe.
- Prefer reusing the shared paragraph/block parsing in `app/src/lib/text/paragraphs.ts`.
