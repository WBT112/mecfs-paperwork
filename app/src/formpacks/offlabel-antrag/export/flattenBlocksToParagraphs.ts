import type { OfflabelRenderedDocument } from '../content/buildOfflabelDocuments';

type PreviewBlock = OfflabelRenderedDocument['blocks'][number];

type FlattenOptions = {
  includeHeadings?: boolean;
  listPrefix?: string;
  dropKinds?: PreviewBlock['kind'][];
  blankLineBetweenBlocks?: boolean;
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

const mapListItems = (items: string[], listPrefix: string): string[] =>
  items.flatMap((item) =>
    splitParagraphText(item).map((line) => `${listPrefix}${line}`),
  );

const mapBlockToParagraphs = (
  block: PreviewBlock,
  {
    includeHeadings,
    listPrefix,
  }: {
    includeHeadings: boolean;
    listPrefix: string;
  },
): string[] => {
  if (block.kind === 'heading') {
    return includeHeadings ? splitParagraphText(block.text) : [];
  }
  if (block.kind === 'paragraph') {
    return splitParagraphText(block.text);
  }
  if (block.kind === 'list') {
    return mapListItems(block.items, listPrefix);
  }
  return [];
};

export function flattenBlocksToParagraphs(
  blocks: PreviewBlock[],
  opts: FlattenOptions = {},
): string[] {
  const includeHeadings = opts.includeHeadings ?? false;
  const listPrefix = opts.listPrefix ?? '• ';
  const blankLineBetweenBlocks = opts.blankLineBetweenBlocks ?? false;
  const dropKinds = buildDropKinds(opts.dropKinds);
  const blockParagraphs = blocks
    .filter((block) => !dropKinds.has(block.kind))
    .map((block) =>
      mapBlockToParagraphs(block, {
        includeHeadings,
        listPrefix,
      }),
    )
    .filter((paragraphs) => paragraphs.length > 0);

  if (!blankLineBetweenBlocks) {
    return blockParagraphs.flat();
  }

  const paragraphs: string[] = [];
  for (let index = 0; index < blockParagraphs.length; index += 1) {
    paragraphs.push(...blockParagraphs[index]);
    if (index < blockParagraphs.length - 1) {
      paragraphs.push('');
    }
  }

  return paragraphs;
}
