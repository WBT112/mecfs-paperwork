---
applyTo: "app/public/formpacks/**/*.json,app/public/formpacks/**/*.docx"
---

# Formpack Content Instructions

When editing or creating formpack content:

## JSON Files

### manifest.json
- `id` must match parent directory name
- `version` follows semver (e.g., `0.1.0`)
- `locales` must include at least `["de", "en"]`
- `defaultLocale` should be `"de"` for this project
- `exports` typically `["docx", "json"]`
- All i18n keys (`titleKey`, `descriptionKey`) must exist in both `de.json` and `en.json`

### schema.json
- Use JSON Schema Draft 2020-12
- Required top-level fields: `person`, `contacts`, `diagnoses`, `symptoms`, `medications`, `allergies`, `doctor`
- All user-facing field names must use i18n keys (resolved via UI schema)
- Never hardcode patient data in examples

### ui.schema.json
- Use RJSF (react-jsonschema-form) UI Schema format
- Use i18n keys in `ui:title`, `ui:description`, `ui:help`, and `ui:enumNames`
- Both plain keys (e.g. `"ui:title": "notfallpass.section.person.title"`) and `"t:"`-prefixed keys are supported; prefer plain keys for consistency with existing formpacks
- Arrays must allow add/remove operations (`"ui:options": { "addable": true, "removable": true }`)
- Use `"ui:widget": "textarea"` for multi-line text

### i18n files (de.json, en.json)
- **Both files must have identical key structures**
- Namespace all keys with formpack ID: `"notfallpass.section.person.title"`
- Export paragraphs go in i18n files (not hardcoded in templates)
- Use gender-neutral language when possible
- German: formal "Sie" form for instructions

### docx/mapping.json
- Maps JSON paths to DOCX template variables
- Path format: dot notation (`person.name`, `contacts[].phone`)
- Must align with schema.json structure

## DOCX Templates

### Delimiter Rules (Mandatory)
- **Use only:** `{{ ... }}` command delimiters
- **Never use:** `+++...+++`, mustache syntax (`{{#...}}`, `{{/...}}`), or `{{.}}`
- **Rationale:** Our export code configures `docx-templates` with `cmdDelimiter: ['{{','}}']`. Mustache-style block helpers (`{{#if}}`, `{{#each}}`) are not supported by docx-templates; use `{{IF...}}`, `{{FOR...}}` commands instead.

### Commands
- Value insertion: `{{INS person.name}}` (preferred) or `{{person.name}}`
- Conditional: `{{IF person.birthDate}}Date of Birth: {{INS person.birthDate}}{{END-IF}}`
- Lists: `{{FOR contact IN contacts}}{{INS contact.name}}{{END-FOR}}`
- Translation: `{{t.notfallpass.section.person.title}}`

### Best Practices
- Use `INS` for consistency and clarity
- Keep commands on single lines when possible
- Test with `docx-templates` library (use `cmdDelimiter: ['{{', '}}']`)
- Include translations via `t` object in context
- Format dates/numbers via helper functions (not in template)

## Creating New Formpacks

Use the scaffold script:
```bash
cd app
node scripts/new-formpack.mjs <id> "<Title>" --register
```

This generates skeleton files and registers the pack in `app/src/formpacks/registry.ts`.

## Privacy Rules
- ❌ Never use real patient names, dates, or health conditions
- ✅ Use clearly fake examples: "Alice Example", "2000-01-01", "555-0100"
- ❌ Never commit real DOCX exports or real form data

## Validation
Always run after making changes:
```bash
cd app
npm run formpack:validate
```
