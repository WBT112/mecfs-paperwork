# Formpack authoring notes

## Paragraph markers for i18n text

Use markers inside translated strings to control how text breaks are rendered in
previews and DOCX exports:

- `[[P]]` starts a new paragraph (blank line between blocks).
- `[[BR]]` inserts a single line break (next line without a blank line).

The export pipeline splits on `[[P]]`, trims each segment, and removes the
markers from the user-facing text. `[[BR]]` is normalized to a single newline
inside each paragraph. When no marker is present, content remains a single
paragraph (with a fallback to split on double newlines when they exist).

Examples:

- Heading + list:
  `Kodierungen:[[BR]]G93.30 – Postvirales Erschöpfungssyndrom[[BR]]B94.81 – Folgen einer Infektion`
- Paragraph + list:
  `Hinweise:[[P]]Kodierungen:[[BR]]G93.30 – Postvirales Erschöpfungssyndrom[[BR]]B94.81 – Folgen einer Infektion`

Guidance:

- Do not stack `[[P]]` markers to force spacing.
- Use `[[BR]]` for list-like content such as codes or bullet-style lines.
- These markers are processed consistently for document previews and DOCX
  export.
