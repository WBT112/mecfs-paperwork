import type { ReactNode } from 'react';
import type { OfflabelRenderedDocument } from '../../../formpacks/offlabel-antrag/content/buildOfflabelDocuments';

type OfflabelRenderedBlock = OfflabelRenderedDocument['blocks'][number];
const OFFLABEL_PART2_CONSENT_HEADING_PREFIX =
  'Aufklärung und Einwilligung zum Off-Label-Use:';

const getOfflabelPreviewBlockKey = (
  documentId: string,
  block: OfflabelRenderedBlock,
): string => {
  if (block.kind === 'list') {
    return `${documentId}-${block.kind}-${block.items.join('|')}`;
  }
  if (block.kind === 'pageBreak') {
    return `${documentId}-${block.kind}`;
  }
  return `${documentId}-${block.kind}-${block.text}`;
};

const renderOfflabelPreviewBlock = (
  documentId: string,
  block: OfflabelRenderedBlock,
): ReactNode => {
  const blockKey = getOfflabelPreviewBlockKey(documentId, block);

  if (block.kind === 'heading') {
    return <h3 key={blockKey}>{block.text}</h3>;
  }

  if (block.kind === 'paragraph') {
    return <p key={blockKey}>{block.text}</p>;
  }

  if (block.kind === 'list') {
    if (!block.items.length) {
      return null;
    }

    return (
      <ul key={blockKey}>
        {block.items.map((item) => (
          <li key={`${documentId}-${block.kind}-${item}`}>{item}</li>
        ))}
      </ul>
    );
  }

  return null;
};

const renderOfflabelPreviewDocument = (
  document: OfflabelRenderedDocument,
): ReactNode => (
  <div key={document.id}>
    {document.blocks.map((block) =>
      renderOfflabelPreviewBlock(document.id, block),
    )}
  </div>
);

const stripOfflabelPart2ConsentFromPreview = (
  document: OfflabelRenderedDocument,
): OfflabelRenderedDocument => {
  if (document.id !== 'part2') {
    return document;
  }

  const consentHeadingIndex = document.blocks.findIndex(
    (block) =>
      block.kind === 'heading' &&
      block.text.startsWith(OFFLABEL_PART2_CONSENT_HEADING_PREFIX),
  );

  if (consentHeadingIndex < 0) {
    return document;
  }

  return {
    ...document,
    blocks: document.blocks.slice(0, consentHeadingIndex),
  };
};

/**
 * Collects offlabel preview-specific render helpers for the detail page.
 */
export const offlabelPreviewHelpers = {
  getOfflabelPreviewBlockKey,
  renderOfflabelPreviewBlock,
  renderOfflabelPreviewDocument,
  stripOfflabelPart2ConsentFromPreview,
};
