const normalizeLineEndings = (value: string): string =>
  value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');

const splitOnDoubleNewline = (value: string): string[] =>
  value.split(/\n{2,}/).map((part) => part.trim());

const compactParagraphs = (parts: string[]): string[] =>
  parts.map((part) => part.trim()).filter(Boolean);

export const PARAGRAPH_MARKER = '[[P]]';
export const LINE_BREAK_MARKER = '[[BR]]';

export type ParagraphBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'lineBreaks'; lines: string[] };

export const normalizeParagraphText = (
  raw: string,
  marker = PARAGRAPH_MARKER,
  lineBreakMarker = LINE_BREAK_MARKER,
): { paragraphs: string[]; text: string } => {
  const normalized = normalizeLineEndings(raw);
  const withLineBreaks = normalized.split(lineBreakMarker).join('\n');
  const trimmed = withLineBreaks.trim();
  if (!trimmed) {
    return { paragraphs: [], text: '' };
  }

  if (trimmed.includes(marker)) {
    const paragraphs = compactParagraphs(trimmed.split(marker));
    return {
      paragraphs,
      text: paragraphs.join('\n\n'),
    };
  }

  const newlineParts = splitOnDoubleNewline(trimmed);
  if (newlineParts.length > 1) {
    const paragraphs = compactParagraphs(newlineParts);
    return {
      paragraphs,
      text: paragraphs.join('\n\n'),
    };
  }

  return { paragraphs: [trimmed], text: trimmed };
};

export const splitParagraphs = (
  input: string,
  marker = PARAGRAPH_MARKER,
): string[] => normalizeParagraphText(input, marker).paragraphs;

export const buildParagraphBlocks = (
  input: string,
  marker = PARAGRAPH_MARKER,
  lineBreakMarker = LINE_BREAK_MARKER,
): ParagraphBlock[] => {
  const { paragraphs } = normalizeParagraphText(input, marker, lineBreakMarker);

  return paragraphs
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0)
    .map((lines) =>
      lines.length === 1
        ? { type: 'paragraph', text: lines[0] }
        : { type: 'lineBreaks', lines },
    );
};
