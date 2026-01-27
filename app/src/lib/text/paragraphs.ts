const normalizeLineEndings = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const splitOnDoubleNewline = (value: string): string[] =>
  value.split(/\n{2,}/).map((part) => part.trim());

const compactParagraphs = (parts: string[]): string[] =>
  parts.map((part) => part.trim()).filter(Boolean);

export const PARAGRAPH_MARKER = '[[P]]';

export const normalizeParagraphText = (
  raw: string,
  marker = PARAGRAPH_MARKER,
): { paragraphs: string[]; text: string } => {
  const normalized = normalizeLineEndings(raw);
  const trimmed = normalized.trim();
  if (!trimmed) {
    return { paragraphs: [], text: '' };
  }

  if (trimmed.includes(marker)) {
    const paragraphs = compactParagraphs(trimmed.split(marker));
    return {
      paragraphs,
      text: paragraphs.length ? paragraphs.join('\n\n') : '',
    };
  }

  const newlineParts = splitOnDoubleNewline(trimmed);
  if (newlineParts.length > 1) {
    const paragraphs = compactParagraphs(newlineParts);
    return {
      paragraphs,
      text: paragraphs.length ? paragraphs.join('\n\n') : '',
    };
  }

  return { paragraphs: [trimmed], text: trimmed };
};

export const splitParagraphs = (
  input: string,
  marker = PARAGRAPH_MARKER,
): string[] => normalizeParagraphText(input, marker).paragraphs;
