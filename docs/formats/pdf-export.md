# PDF export

## Overview

PDF exports are generated client-side in the browser using `@react-pdf/renderer` and `BlobProvider`. No network requests are made at runtime beyond loading the app's static assets, so PDF exports work offline after the app is loaded.

PDF generation runs only after an explicit user click.

## Current scope

- Supported formpacks: `doctor-letter`, `offlabel-antrag`
- Output format: A4, auto-pagination for long content
- Content parity: PDF is rendered from each formpack's projected export model.

## Architecture

### Data flow

```
formData (user input)
  → buildModel() (formpack-specific document model builder)
    → DocumentModel { meta, sections[] }
      → renderDocument() (React PDF template component)
        → PDF blob (downloadable)
```

### Key types (`app/src/export/pdf/types.ts`)

| Type              | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `DocumentModel`   | Root: `title?`, `meta?`, `sections[]`                                 |
| `DocumentMeta`    | `createdAtIso`, `locale`, `templateData?` (formpack-specific payload) |
| `DocumentSection` | `id?`, `heading?`, `blocks[]`                                         |
| `DocumentBlock`   | Union: `paragraph`, `lineBreaks`, `bullets`, `kvTable`                |

`DocumentBlock` variants:

- `paragraph` — `{ type: 'paragraph', text: string }`
- `lineBreaks` — `{ type: 'lineBreaks', lines: string[] }`
- `bullets` — `{ type: 'bullets', items: string[] }`
- `kvTable` — `{ type: 'kvTable', rows: [string, string][] }`

### Registry (`app/src/export/pdf/registry.tsx`)

Each formpack registers a `PdfExportConfig` with two functions:

```typescript
type PdfExportConfig = {
  buildModel: (options: {
    formData: Record<string, unknown>;
    locale: SupportedLocale;
    exportedAt?: Date;
  }) => DocumentModel;
  renderDocument: (model: DocumentModel) => ReactElement<DocumentProps>;
};
```

Templates are lazy-loaded via `getPdfExportConfig(formpackId)` to keep the main bundle small.

### Template structure

PDF templates are React components in `app/src/export/pdf/templates/`:

- `DoctorLetterPdfDocument.tsx` — 3-page letter (letter body + 2 annexes with images)
- `OfflabelAntragPdfDocument.tsx` — multi-page application letter

Each template receives a `DocumentModel` and renders a `<Document>` with `<Page>` elements.

Templates can access formpack-specific structured data via `model.meta.templateData`, which bypasses the generic section/block layer for cases where the PDF layout diverges from the generic preview (e.g., custom address blocks, salutations, annex pages).

## Adding PDF export for a new formpack

1. Add `"pdf"` to the formpack's `exports` array in `manifest.json`.
2. Create a document model builder in `app/src/formpacks/<id>/export/documentModel.ts`:
   - Return a `DocumentModel` from `app/src/export/pdf/types.ts`.
   - Use `i18n.getFixedT(locale, 'formpack:<id>')` for translated labels.
   - Use `buildParagraphBlocks()` from `app/src/lib/text/paragraphs.ts` for `[[P]]`/`[[BR]]` text splitting.
   - Populate `meta.templateData` with any structured data the template needs beyond generic blocks.
3. Create a PDF template component in `app/src/export/pdf/templates/<Name>PdfDocument.tsx`:
   - Import `Document`, `Page`, `Text`, `View` etc. from `@react-pdf/renderer`.
   - Call `ensurePdfFontsRegistered()` at module scope.
   - Use `PDF_FONT_FAMILY_SANS` from `app/src/export/pdf/fonts.ts`.
4. Register the template in `app/src/export/pdf/registry.tsx`:
   - Add a lazy-loading builder function.
   - Add a case to `getPdfExportConfig()`.
5. Add i18n keys for any headings/labels in the formpack's `i18n/de.json` and `en.json`.
6. Add unit tests for the document model builder.

## Fonts

PDF fonts are bundled locally (`app/src/assets/fonts/liberation`) and embedded at render time via `app/src/export/pdf/fonts.ts` to keep output consistent across devices without network requests.

## Annex images

Annex images are loaded as static asset URLs (not JS inlined) to keep PDF chunks small, and are explicitly precached by the service worker for offline PDF rendering.

## Testing

- **Document model tests:** Unit tests in `app/tests/unit/export/` verify that `buildModel()` produces the expected sections, blocks, and templateData for representative form data.
- **E2E tests:** PDF export is tested end-to-end via Playwright (button click, blob download verification).
- No visual regression tests — content correctness is validated through the document model, not pixel comparison.

## Key source files

| File                                             | Purpose                                       |
| ------------------------------------------------ | --------------------------------------------- |
| `app/src/export/pdf/types.ts`                    | `DocumentModel`, `DocumentBlock`, type guards |
| `app/src/export/pdf/registry.tsx`                | Lazy-loaded formpack PDF configs              |
| `app/src/export/pdf/fonts.ts`                    | Font registration (Liberation Sans)           |
| `app/src/export/pdf/render.ts`                   | Date formatting, shared render utilities      |
| `app/src/export/pdf/PdfExportControls.tsx`       | UI controls (export button + blob provider)   |
| `app/src/export/pdf/templates/`                  | Formpack-specific PDF template components     |
| `app/src/formpacks/<id>/export/documentModel.ts` | Formpack-specific model builders              |
| `app/src/lib/text/paragraphs.ts`                 | `[[P]]`/`[[BR]]` paragraph block parsing      |
