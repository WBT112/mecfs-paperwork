export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const flushParagraph = (blocks: MarkdownBlock[], lines: string[]): void => {
  if (lines.length === 0) {
    return;
  }

  blocks.push({ type: 'paragraph', text: lines.join(' ') });
  lines.length = 0;
};

const flushList = (blocks: MarkdownBlock[], items: string[]): void => {
  if (items.length === 0) {
    return;
  }

  blocks.push({ type: 'list', items: [...items] });
  items.length = 0;
};

export const parseMarkdown = (markdown: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const paragraphLines: string[] = [];
  const listItems: string[] = [];
  const lines = markdown.split(/\r?\n/);

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph(blocks, paragraphLines);
      flushList(blocks, listItems);
      return;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph(blocks, paragraphLines);
      flushList(blocks, listItems);
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      return;
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(line);
    if (listMatch) {
      flushParagraph(blocks, paragraphLines);
      listItems.push(listMatch[1]);
      return;
    }

    flushList(blocks, listItems);
    paragraphLines.push(line);
  });

  flushParagraph(blocks, paragraphLines);
  flushList(blocks, listItems);

  return blocks;
};
