import type { OfflabelRenderedDocument } from '../content/buildOfflabelDocuments';

type PreviewBlock = OfflabelRenderedDocument['blocks'][number];

type FlattenOptions = {
  includeHeadings?: boolean;
  listPrefix?: string;
  listWrapAt?: number;
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

const wrapLineByWords = (line: string, maxLength: number): string[] => {
  if (line.length <= maxLength) {
    return [line];
  }

  const words = line.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return [line];
  }

  const wrapped: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      wrapped.push(current);
      current = word;
      continue;
    }

    wrapped.push(word);
  }

  if (current.length > 0) {
    wrapped.push(current);
  }

  return wrapped.length > 0 ? wrapped : [line];
};

const mapListLine = (
  line: string,
  listPrefix: string,
  listWrapAt?: number,
): string[] => {
  if (!listWrapAt || listWrapAt < 1) {
    return [`${listPrefix}${line}`];
  }

  const wrapped = wrapLineByWords(line, listWrapAt);
  const continuationPrefix = '\t';

  return wrapped.map((entry, index) =>
    index === 0 ? `${listPrefix}${entry}` : `${continuationPrefix}${entry}`,
  );
};

const mapListItems = (
  items: string[],
  listPrefix: string,
  listWrapAt?: number,
): string[] =>
  items.flatMap((item) =>
    splitParagraphText(item).flatMap((line) =>
      mapListLine(line, listPrefix, listWrapAt),
    ),
  );

const mapBlockToParagraphs = (
  block: PreviewBlock,
  {
    includeHeadings,
    listPrefix,
    listWrapAt,
  }: {
    includeHeadings: boolean;
    listPrefix: string;
    listWrapAt?: number;
  },
): string[] => {
  if (block.kind === 'heading') {
    return includeHeadings ? splitParagraphText(block.text) : [];
  }
  if (block.kind === 'paragraph') {
    return splitParagraphText(block.text);
  }
  if (block.kind === 'list') {
    return mapListItems(block.items, listPrefix, listWrapAt);
  }
  return [];
};

export function flattenBlocksToParagraphs(
  blocks: PreviewBlock[],
  opts: FlattenOptions = {},
): string[] {
  const includeHeadings = opts.includeHeadings ?? false;
  const listPrefix = opts.listPrefix ?? '• ';
  const listWrapAt = opts.listWrapAt;
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
        listWrapAt,
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
