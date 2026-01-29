# Formpack authoring notes

## Paragraph markers for i18n text

Use the `[[P]]` marker inside translated strings to explicitly break text into
separate paragraphs for DOCX exports. The export pipeline splits on `[[P]]`,
trims each segment, and removes the marker from the user-facing text. When no
marker is present, content remains a single paragraph (with a fallback to split
on double newlines when they exist).

Use `[[BR]]` to insert a single line break without adding an empty line. This is
useful for list-like content such as ICD codes or short itemized lines.

### Marker reference

- `[[P]]` → new paragraph (blank line between blocks, normalized to `\n\n`)
- `[[BR]]` → new line (single line break, normalized to `\n`)

### Examples

- Heading + list:
  - `Kodierungen:[[BR]]G93.30 Postvirales Fatigue-Syndrom[[BR]]B94.81 Folgen einer Virusinfektion`
- Paragraph + list:
  - `Kodierungen:[[P]]G93.30 Postvirales Fatigue-Syndrom[[BR]]B94.81 Folgen einer Virusinfektion`

### Guidance

- Do not use multiple `[[P]]` markers to force spacing.
- Prefer `[[BR]]` for list-like content (codes, bullet-ish lines).
- Both markers are processed consistently in document previews and DOCX exports.
