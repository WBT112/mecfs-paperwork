const splitOnDoubleNewline = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

export const splitParagraphs = (input: string, marker = '[[P]]'): string[] => {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes(marker)) {
    return trimmed
      .split(marker)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const newlineParts = splitOnDoubleNewline(trimmed);
  if (newlineParts.length > 1) {
    return newlineParts;
  }

  return [trimmed];
};
