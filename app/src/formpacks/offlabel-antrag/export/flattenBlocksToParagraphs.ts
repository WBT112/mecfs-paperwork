import type { OfflabelRenderedDocument } from '../content/buildOfflabelDocuments';

type PreviewBlock = OfflabelRenderedDocument['blocks'][number];

type FlattenOptions = {
  includeHeadings?: boolean;
  listPrefix?: string;
  dropKinds?: PreviewBlock['kind'][];
};

const splitParagraphText = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

const buildDropKinds = (
  configured?: PreviewBlock['kind'][],
): Set<PreviewBlock['kind']> => {
  const dropKinds = new Set<PreviewBlock['kind']>(['pageBreak']);
  for (const kind of configured ?? []) {
    dropKinds.add(kind);
  }
  return dropKinds;
};

const appendParagraph = (paragraphs: string[], text: string): void => {
  paragraphs.push(...splitParagraphText(text));
};

const appendListItems = (
  paragraphs: string[],
  items: string[],
  listPrefix: string,
): void => {
  for (const item of items) {
    for (const line of splitParagraphText(item)) {
      paragraphs.push(`${listPrefix}${line}`);
    }
  }
};

export function flattenBlocksToParagraphs(
  blocks: PreviewBlock[],
  opts: FlattenOptions = {},
): string[] {
  const includeHeadings = opts.includeHeadings ?? false;
  const listPrefix = opts.listPrefix ?? '• ';
  const dropKinds = buildDropKinds(opts.dropKinds);

  const paragraphs: string[] = [];

  for (const block of blocks) {
    if (dropKinds.has(block.kind)) {
      continue;
    }

    if (block.kind === 'heading') {
      if (!includeHeadings) {
        continue;
      }
      appendParagraph(paragraphs, block.text);
      continue;
    }

    if (block.kind === 'paragraph') {
      appendParagraph(paragraphs, block.text);
      continue;
    }

    if (block.kind === 'list') {
      appendListItems(paragraphs, block.items, listPrefix);
    }
  }

  return paragraphs;
}
