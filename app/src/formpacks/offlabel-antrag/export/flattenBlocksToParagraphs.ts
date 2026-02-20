import type { OfflabelRenderedDocument } from '../content/buildOfflabelDocuments';

type PreviewBlock = OfflabelRenderedDocument['blocks'][number];

type FlattenOptions = {
  includeHeadings?: boolean;
  listPrefix?: string;
  dropKinds?: PreviewBlock['kind'][];
  blankLineBetweenBlocks?: boolean;
  compactAroundKinds?: PreviewBlock['kind'][];
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
  const compactAroundKinds = new Set(opts.compactAroundKinds ?? []);
  const dropKinds = buildDropKinds(opts.dropKinds);
  const renderedBlocks = blocks
    .filter((block) => !dropKinds.has(block.kind))
    .map((block) => ({
      kind: block.kind,
      paragraphs: mapBlockToParagraphs(block, {
        includeHeadings,
        listPrefix,
      }),
    }))
    .filter((entry) => entry.paragraphs.length > 0);

  if (!blankLineBetweenBlocks) {
    return renderedBlocks.flatMap((entry) => entry.paragraphs);
  }

  const paragraphs: string[] = [];
  for (let index = 0; index < renderedBlocks.length; index += 1) {
    paragraphs.push(...renderedBlocks[index].paragraphs);
    if (index < renderedBlocks.length - 1) {
      const currentKind = renderedBlocks[index].kind;
      const nextKind = renderedBlocks[index + 1].kind;
      const shouldCompact =
        compactAroundKinds.has(currentKind) || compactAroundKinds.has(nextKind);
      if (shouldCompact) {
        continue;
      }
      paragraphs.push('');
    }
  }

  return paragraphs;
}
