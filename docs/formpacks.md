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
      template.a4.docx
      template.wallet.docx
      mapping.json
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
- `docx.templates.wallet`: Path to the wallet template.
- `docx.mapping`: Path to the DOCX mapping file.

## i18n
- All labels, section titles, and help texts are referenced by i18n keys.
- Key namespace: `<packId>.*` (for example `notfallpass.section.contacts.title`).
- `i18n/de.json` and `i18n/en.json` must contain the same keys.
- Fallback behavior: if a key is missing in the active locale, show the key as text and optionally fall back to `defaultLocale`.

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

## DOCX templates
Templates are `.docx` files with placeholders that follow these rules:

### Field placeholders
- Text fields: `{{field.path}}` (example: `{{person.name}}`).

### i18n placeholders
- Labels/headings: `{{t:key}}` (example: `{{t:notfallpass.section.person.title}}`).

### Loops
- Start a loop with `{{#contacts}}` and end it with `{{/contacts}}`.
- Inside the loop use child fields like `{{name}}`, `{{phone}}`, `{{relation}}`.

Templates can be visually simple in the MVP but must include the required placeholders.

## DOCX mapping (`docx/mapping.json`)
The mapping describes how data is injected into the template variables.

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
To add a new pack, copy the `formpacks/notfallpass` skeleton and adjust:
- `manifest.json` metadata and paths
- `schema.json` + `ui.schema.json`
- `i18n` keys + translations
- DOCX templates and mapping
- Example data (must be fake)

## App registry (MVP)
The app only loads formpacks listed in `app/src/formpacks/registry.ts`. Add the
new pack id to `FORMPACK_IDS` so it appears in the catalog.
