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


Examples:

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

Authoring Rules (important: prevents parser errors)
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
npm run formpack:new -- --id my-pack --title "My Pack"
```

Optionally register the pack with the app catalog:
```
cd app
npm run formpack:new -- --id my-pack --title "My Pack" --register
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
