# Formpack authoring notes

## Paragraph markers for i18n text

Use the `[[P]]` marker inside translated strings to explicitly break text into
separate paragraphs for DOCX exports. The export pipeline splits on `[[P]]`,
trims each segment, and removes the marker from the user-facing text. When no
marker is present, content remains a single paragraph (with a fallback to split
on double newlines when they exist).
