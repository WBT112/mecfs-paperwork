import { sanitizeHTML } from './utils';

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export const parseMarkdown = (markdown: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  let currentBlock: 'paragraph' | 'list' | null = null;
  let lines: string[] = [];

  const flush = () => {
    if (lines.length === 0) return;

    if (currentBlock === 'paragraph') {
      blocks.push({ type: 'paragraph', text: lines.join(' ') });
    } else if (currentBlock === 'list') {
      blocks.push({ type: 'list', items: [...lines] });
    }

    lines = [];
    currentBlock = null;
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flush();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: sanitizeHTML(headingMatch[2]),
      });
      continue;
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(line);
    if (listMatch) {
      if (currentBlock !== 'list') {
        flush();
        currentBlock = 'list';
      }
      lines.push(sanitizeHTML(listMatch[1]));
      continue;
    }

    if (currentBlock !== 'paragraph') {
      flush();
      currentBlock = 'paragraph';
    }
    lines.push(sanitizeHTML(line));
  }

  flush();

  return blocks;
};
