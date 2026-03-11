# Pacing-Ampelkarten Smoke Test Matrix

Stand: 2026-03-09

## Automated checks

- `npm run formpack:validate`
- `npm test -- tests/unit/pacingAmpelkartenPdfDocumentModel.test.ts`
- `npm test -- tests/unit/export/pacingAmpelkartenPdfTemplate.test.tsx`
- `npm test -- tests/unit/export/pdfRegistry.test.tsx`
- `npm test -- tests/unit/pacingCardTheme.test.ts`

## Export matrix

| Locale | Variant | PDF model + template |
| --- | --- | --- |
| DE | Adult | automated |
| DE | Child | automated |
| EN | Adult | automated |
| EN | Child | automated |

## Manual spot checks

1. Open the formpack in the app with DE locale and export PDF once in adult mode.
2. Switch to child mode and verify the child wording in preview and PDF.
3. Repeat one PDF export in EN locale and confirm that headings and card copy switch to English.
4. Print preview both page 1 and page 2 and confirm the visual cut line placement.
