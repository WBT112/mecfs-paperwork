# Formpacks

## Purpose
Formpacks are self-contained content bundles that define a form, its localization, and export templates. Packs live in the repository so new forms can be added without code changes and remain offline-first.

## Directory structure
```
formpacks/
  <id>/
    manifest.json
    schema.json
    ui.schema.json
    i18n/
      de.json
      en.json
    docx/
      mapping.json
    templates/
      a4.docx
      wallet.docx
    examples/
      example.json
```

## Manifest (`manifest.json`)
The manifest describes metadata and export assets.

Required fields:
- `id`: Pack identifier (string), e.g. `notfallpass`.
- `version`: Semantic version of the pack, e.g. `0.1.0`.
- `defaultLocale`: `de` or `en`.
- `locales`: Array of supported locales, e.g. `["de", "en"]`.
- `titleKey`: i18n key for the display title.
- `descriptionKey`: i18n key for the description.
- `exports`: Array of supported export types (MVP: `docx`, `json`).
- `docx.templates.a4`: Path to the A4 template.
- `docx.templates.wallet`: Path to the wallet template (only supported for `notfallpass`).
- `docx.mapping`: Path to the DOCX mapping file.

Optional fields:
- `visibility`: `public` (default) or `dev`. Dev packs are hidden from UI listings unless `VITE_SHOW_DEV_FORMPACKS=true` or the app runs in dev mode.

## i18n
- All labels, section titles, and help texts are referenced by i18n keys.
- Key namespace: `<packId>.*` (for example `notfallpass.section.contacts.title`).
- `i18n/de.json` and `i18n/en.json` must contain the same keys.
- Fallback behavior: if a key is missing in the active locale, show the key as text and optionally fall back to `defaultLocale`.

### Export text blocks
- Exportable paragraphs are stored in formpack i18n files and referenced by projection code.
- The document model includes `diagnosisParagraphs: string[]`, which is built from diagnosis flags and i18n keys.
- Avoid hardcoding medical paragraph text in code; use `t()` with the formpack namespace.

### Paragraph markers for export text
Use markers inside translated strings to control how text breaks are rendered in previews and DOCX/PDF exports:
- `[[P]]` starts a new paragraph (blank line between blocks).
- `[[BR]]` inserts a single line break (next line without a blank line).

The export pipeline splits on `[[P]]`, trims each segment, and removes the markers from the user-facing text. `[[BR]]` is normalized to a single newline inside each paragraph. When no marker is present, content remains a single paragraph (with a fallback to split on double newlines when they exist).

Examples:
- Heading + list:
  `Kodierungen:[[BR]]G93.30 – Postvirales Erschöpfungssyndrom[[BR]]B94.81 – Folgen einer Infektion`
- Paragraph + list:
  `Hinweise:[[P]]Kodierungen:[[BR]]G93.30 – Postvirales Erschöpfungssyndrom[[BR]]B94.81 – Folgen einer Infektion`

Guidance:
- Do not stack `[[P]]` markers to force spacing.
- Use `[[BR]]` for list-like content such as codes or bullet-style lines.

## JSON Schema (`schema.json`)
- Uses JSON Schema Draft 2020-12 for MVP.
- Defines the record structure stored by the app.
- Minimum required fields:
  - `person` (name, optional birthDate)
  - `contacts[]` (name, phone, relation optional)
  - `diagnoses` (string)
  - `symptoms` (string)
  - `medications[]` (name, dosage, schedule optional)
  - `allergies` (string)
  - `doctor` (name optional, phone optional)

## UI Schema (`ui.schema.json`)
- Uses RJSF UI Schema.
- Controls section order and field presentation.
- Use i18n keys for section titles and help texts.
- For `ui:title` and `ui:description`, prefix the i18n key with `t:` (example: `"ui:title": "t:notfallpass.section.person.title"`).
- Lists must allow add/remove operations.

## DOCX Export Templates (docx-templates)

### Engine
We use **docx-templates** for client-side DOCX export. Templates are `.docx` files containing commands that are evaluated and replaced at export time.

### Delimiter Policy (mandatory)
This project uses `{{ ... }}` as the command delimiter (configured via `cmdDelimiter: ['{{','}}']` in the export code).

Rules:
- Do not mix delimiters (e.g., do not use `+++...+++` in our templates).
- Mustache/Handlebars syntax is **not allowed**: `{{#...}}`, `{{/...}}`, `{{.}}`.

### i18n in Templates (mandatory)
Translations are provided as a nested object `t` in the template context.

Examples:
- `{{t.notfallpass.title}}`
- `{{t.notfallpass.section.contacts.title}}`

Rule:
- Do not use colon syntax like `{{t:notfallpass.title}}` (not supported by our template contract).

### Inserting Values
Use `INS` for clarity and consistency (recommended project convention):

Examples:
- `{{INS person.name}}`
- `{{INS doctor.phone}}`

### FOR / END-FOR Loops (mandatory)
Loops must follow docx-templates semantics:

1) Every `FOR <var>` must be closed with `END-FOR <var>` (variable name required).
2) Inside a loop, the current element must be referenced with a `$` prefix:
   - correct: `{{INS $c.name}}`
   - wrong: `{{INS c.name}}`
3) The inner-most loop index is available as `$idx` (starting from 0).

Minimal example:

```text
{{FOR item IN items}}
{{INS $item}}
{{END-FOR item}}
```

Examples:

```text
{{t.notfallpass.section.contacts.title}}
{{FOR c IN contacts}}
{{INS $c.name}} | {{INS $c.phone}} | {{INS $c.relation}}
{{END-FOR c}}


{{t.notfallpass.section.medications.title}}
{{FOR m IN medications}}
{{INS $m.name}} | {{INS $m.dosage}} | {{INS $m.schedule}}
{{END-FOR m}}


{{t.notfallpass.section.diagnoses.title}}
{{INS diagnoses.formatted}}
{{FOR p IN diagnosisParagraphs}}
{{INS $p}}
{{END-FOR p}}
```

### Authoring Rules (important: prevents parser errors)
Word processors (Word/LibreOffice) can split text into multiple internal “runs”. To keep commands parseable:
- Use the standard delimiter policy: `{{ ... }}` for all commands.
- Never apply formatting changes inside a command ({{...}} must remain a single uninterrupted run).
- Do not insert manual line breaks inside commands.
- Put FOR and END-FOR on their own paragraphs (recommended).
- Always close loops with a matching `END-FOR <var>` (for example `{{END-FOR c}}`).
- Inside loops, reference variables with a `$` prefix (example: `{{INS $c.name}}` or `{{INS $p}}`).
- Do not span loops across table cell boundaries or complex layout containers.

### Template locations
- `formpacks/<packId>/templates/a4.docx` is required for all formpacks.
- `formpacks/notfallpass/templates/wallet.docx` is optional and only supported for `notfallpass`.

### Field placeholders
- Text fields: `{{INS person.name}}` or `{{person.name}}`.

### i18n placeholders
- Labels/headings: `{{t.notfallpass.section.person.title}}`.

### Loops
- Start a loop with `{{FOR c IN contacts}}` and end it with `{{END-FOR c}}`.
- Inside the loop use child fields like `{{INS $c.name}}`, `{{INS $c.phone}}`, `{{INS $c.relation}}`.
- For paragraph lists, use `{{FOR p IN diagnosisParagraphs}}` with `{{INS $p}}`.

Templates can be visually simple in the MVP but must include the required placeholders.

## DOCX mapping (`docx/mapping.json`)
The mapping describes how data is injected into the template variables.
Document data is produced by `buildDocumentModel(formpackId, locale, formData)` and then mapped into template variables via `mapDocumentDataToTemplate`.

Minimal format:
```
{
  "version": 1,
  "fields": [
    { "var": "person.name", "path": "person.name" },
    { "var": "person.birthDate", "path": "person.birthDate" },
    { "var": "diagnoses.formatted", "path": "diagnoses.formatted" },
    { "var": "symptoms", "path": "symptoms" },
    { "var": "allergies", "path": "allergies" }
  ],
  "loops": [
    { "var": "contacts", "path": "contacts" },
    { "var": "medications", "path": "medications" }
  ],
  "i18n": {
    "prefix": "notfallpass"
  }
}
```

Rules:
- `var` is the name used in DOCX placeholders.
- `path` is a dot-notation path in the record data.
- `loops` reference array paths.
- Conditional logic is future work and not part of the MVP.

## Versioning
- `manifest.version` is the formpack version (content + schema + templates).
- `mapping.version` is the mapping file format version.

## Contributor guidance
To add a new pack, use the scaffold command:
```
cd app
node scripts/new-formpack.mjs my-pack "My Pack"
```

Optionally register the pack with the app catalog:
```
cd app
node scripts/new-formpack.mjs my-pack "My Pack" --register
```

Then review the generated files and adjust:
- `manifest.json` metadata and paths
- `schema.json` + `ui.schema.json`
- `i18n` keys + translations
- DOCX templates and mapping
- Example data (must be fake)

## Dev-only packs
To hide a pack from production UI listings, set the manifest visibility:
```
{
  "visibility": "dev"
}
```

Preview dev-only packs locally:
- In dev mode (`npm run dev`), dev packs are visible by default.
- In production-like builds, set `VITE_SHOW_DEV_FORMPACKS=true` to show dev packs.
  - Example (Unix/macOS): `VITE_SHOW_DEV_FORMPACKS=true npm run dev`
  - Example (Windows PowerShell): `$env:VITE_SHOW_DEV_FORMPACKS="true"; npm run dev`
  - You can also add `VITE_SHOW_DEV_FORMPACKS=true` to an `.env.local` file at the repo root for local overrides.

## Formpack validation (contract + preflight)
`npm run formpack:validate` performs contract validation for each pack and then runs the DOCX preflight.

Contract checks include:
- Required files and JSON parsing for manifest/schema/ui schema/i18n/examples.
 - `manifest.json` fields (`id`, `version`, `defaultLocale`, `locales`, `titleKey`, `descriptionKey`, `exports`, `docx`, `visibility`).
- `exports` includes `docx` and `json`, with safe asset paths for `docx.templates.a4` and `docx.mapping`.
- Strict i18n parity between `i18n/de.json` and `i18n/en.json`.
- Coverage of `t:` keys referenced in `schema.json` and `ui.schema.json`.
- Example data validated against `schema.json` (no payload dumps in output).

Validate templates locally with:
```
cd app
npm run formpack:validate
```

Validate a single pack by id:
```
cd app
npm run formpack:validate -- --id my-pack
```

## App registry (MVP)
The app only loads formpacks listed in `app/src/formpacks/registry.ts`. Add the
new pack id to `FORMPACK_IDS` so it appears in the catalog.

## Shared code in `/app/src/formpacks/`

The following modules provide reusable infrastructure for all formpacks:

### `loader.ts`
Loads formpack assets (manifest, schema, UI schema, i18n) from the public directory at runtime.

**Key exports:**
- `loadFormpack(id: string, locale: SupportedLocale): Promise<FormpackData>` - Loads all assets for a formpack
- Handles async fetching of JSON files
- Validates manifest structure
- Returns a complete `FormpackData` object with all assets

**Used by:** All formpacks when rendering forms or preparing exports.

### `registry.ts`
Static registry of available formpacks.

**Key exports:**
- `FORMPACK_IDS` - Array of formpack IDs (e.g., `['doctor-letter', 'notfallpass']`)
- `FormpackId` - TypeScript type for valid formpack IDs

**Used by:** UI catalog, routing, validation.

**Note:** New formpacks must be registered here to appear in the app.

### `documentModel.ts`
Transforms form data into a document model suitable for exports (preview, DOCX, JSON).

**Key exports:**
- `buildDocumentModel(formpackId: string | null, locale: SupportedLocale, formData: Record<string, unknown>): DocumentModel`
- `DocumentModel` - TypeScript type for the document projection

**Architecture:**
- **Base model builder** (`buildBaseDocumentModel`): Extracts common fields (person, contacts, medications, etc.) that exist across most formpacks
- **Formpack-specific builders**: 
  - `buildDoctorLetterModel`: Handles patient, doctor with extended fields, and decision tree resolution
  - `buildNotfallpassModel`: Handles diagnosis flags and generates diagnosis paragraphs
- Uses i18n to resolve display text (e.g., case paragraphs, diagnosis text)

**Used by:** Export functions (DOCX, JSON), document preview.

**Extension pattern:**
```typescript
if (formpackId === 'my-formpack') {
  return buildMyFormpackModel(formData, locale, baseModel);
}
```

### `decisionEngine.ts`
Decision tree resolver for the `doctor-letter` formpack (introduced in v0.1.0).

**Key exports:**
- `resolveDecisionTree(answers: DecisionAnswers): DecisionResult`
- `DecisionAnswers` - Input type for Q1-Q8 answers
- `DecisionResult` - Output type with `caseId` and `caseKey` (i18n key)

**Purpose:** Pure function that maps decision tree answers (boolean/enum) to a case ID (0-13) and an i18n key for the case paragraph.

**Used by:** `buildDoctorLetterModel` in `documentModel.ts`.

**Note:** This is formpack-specific and only used by `doctor-letter`. Other formpacks with decision logic would implement their own engine.

### `types.ts`
Shared TypeScript types for formpack infrastructure.

**Key exports:**
- `FormpackData` - Complete structure of a loaded formpack
- `FormpackManifest` - Manifest file structure
- And other common types

**Used by:** All modules that work with formpacks.

### `visibility.ts`
Determines if a formpack should be visible in the UI based on its `visibility` field.

**Key exports:**
- `isFormpackVisible(manifest: FormpackManifest, isDev: boolean): boolean`

**Rules:**
- `visibility: "public"` → always visible
- `visibility: "dev"` → only visible in dev mode or if `VITE_SHOW_DEV_FORMPACKS=true`

**Used by:** Formpack listing/catalog UI.

## Available formpacks

### `notfallpass` (Emergency Pass)
**Purpose:** Quick-reference card for emergency responders with patient health information.

**Data model:**
- Person (name, birthDate)
- Emergency contacts (array)
- Diagnoses (ME/CFS, POTS, Long Covid flags + formatted text)
- Symptoms (free text)
- Medications (array)
- Allergies (free text)
- Doctor (name, phone)

**Shared code usage:**
- Uses `buildNotfallpassModel` in `documentModel.ts`
- Generates `diagnosisParagraphs[]` based on diagnosis flags (meCfs, pots, longCovid)
- Uses i18n keys: `notfallpass.export.diagnoses.{meCfs,pots,longCovid}.paragraph`

**Templates:**
- `a4.docx` - Standard A4 page format
- `wallet.docx` - Compact wallet-sized format (special case, only for notfallpass)

**Export behavior:**
- If `meCfs` flag is false, `diagnosisParagraphs` is empty
- Otherwise, adds paragraph(s) based on enabled flags
- All fields are optional except `person.name`

### `doctor-letter` (Arztbrief)
**Purpose:** Decision-tree driven doctor letter for ME/CFS diagnosis documentation.

**Data model:**
- Patient (firstName, lastName, streetAndNumber, postalCode, city)
- Doctor/Practice (practice, name, title dropdown: "kein"|"Dr."|"Prof. Dr.", gender dropdown: "Frau"|"Herr", streetAndNumber, postalCode, city)
- Decision tree (Q1-Q8: boolean/enum questions)
- Infoboxes (maintainer-controlled visibility per question)

**Decision tree:**
- Q1 (full ME/CFS) → branches to Q2 or Q6
- Q2-Q5: Cause identification path → Cases 1-4, 9-11
- Q6-Q8: Partial symptom path → Cases 0, 5-8, 12-13
- Total: 14 cases (0-13)

**Shared code usage:**
- Uses `decisionEngine.ts` to resolve Q1-Q8 answers → `{ caseId, caseKey }`
- Uses `buildDoctorLetterModel` in `documentModel.ts`
- Resolves localized `caseText` via i18n: `doctor-letter.case.{0-13}.paragraph`
- Exposes `decision.caseId` (number) and `decision.caseText` (localized string) in document model

**Templates:**
- `a4.docx` - Doctor letter format (auto-generated skeleton, needs manual refinement)

**Export behavior:**
- Decision tree always resolves (no abort/error state)
- Case 0 is valid output for non-matching paths
- Preview and DOCX receive the same `decision.caseText` (never raw boolean/ID)
- All master data fields are mapped for template injection

**i18n coverage:**
- 14 case paragraphs (DE/EN): `doctor-letter.case.{0-13}.paragraph`
- Field labels for patient, doctor, and decision questions
- Infobox help text for Q1

**Testing:**
- 22 unit tests for `decisionEngine.ts` (100% coverage)
- 12 integration tests for `buildDocumentModel` (doctor-letter path)

## Adding formpack-specific logic

### When to extend shared code

**Add to `documentModel.ts`** if:
- Your formpack needs custom computed fields (e.g., decision resolution, diagnosis paragraphs)
- You need formpack-specific i18n lookups for export text
- Follow the pattern: `if (formpackId === 'my-pack') return buildMyPackModel(...)`

**Create a new module** (e.g., `myEngine.ts`) if:
- Your formpack has complex business logic (decision trees, calculators, validators)
- The logic is testable in isolation
- Example: `decisionEngine.ts` for `doctor-letter`

**Do NOT modify** `loader.ts`, `registry.ts`, `types.ts`, or `visibility.ts` unless:
- You're adding new core infrastructure needed by all formpacks
- You're fixing a bug

### Testing requirements

- **New formpack-specific modules**: Aim for ≥80% line coverage
- **Document model extensions**: Integration tests proving form data → document model → export payload
- Use Vitest for unit/integration tests
- E2E (Playwright) optional unless touching navigation

### Extension checklist

When adding a new formpack with custom logic:

1. Create formpack assets in `formpacks/<id>/`
2. Register in `app/src/formpacks/registry.ts`
3. If needed, add business logic module (e.g., `app/src/formpacks/myEngine.ts`)
4. Extend `documentModel.ts` with formpack-specific builder
5. Write unit tests for business logic (≥80% coverage)
6. Write integration tests for document model mapping
7. Run `npm run formpack:validate` to check contract compliance
8. Test exports (JSON, DOCX) manually
