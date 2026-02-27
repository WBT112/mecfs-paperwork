import type { SupportedLocale } from '../../../i18n/locale';
import type {
  DocumentBlock,
  DocumentModel,
  DocumentSection,
} from '../../../export/pdf/types';
import {
  buildOffLabelAntragDocumentModel,
  type OffLabelExportBundle,
  type OffLabelLetterSection,
  type OffLabelPostExportChecklist,
} from './documentModel';

export type BuildOfflabelAntragPdfDocumentModelOptions = {
  formData: Record<string, unknown>;
  locale: SupportedLocale;
  exportedAt?: Date;
};

export type OfflabelPdfTemplateData = {
  locale: SupportedLocale;
  createdAtIso: string;
  exportBundle: OffLabelExportBundle;
  sourcesHeading: string;
  sources: string[];
  postExportChecklist: OffLabelPostExportChecklist;
};

const toParagraphBlocks = (paragraphs: string[]): DocumentBlock[] =>
  paragraphs.map((text) => ({ type: 'paragraph', text }));

const addLineBreakBlock = (
  blocks: DocumentBlock[],
  lines: string[] | undefined,
): void => {
  if (!lines || lines.length === 0) {
    return;
  }

  blocks.push({ type: 'lineBreaks', lines });
};

const addParagraphBlock = (
  blocks: DocumentBlock[],
  text: string | undefined,
): void => {
  if (!text) {
    return;
  }

  blocks.push({ type: 'paragraph', text });
};

const addBulletsBlock = (
  blocks: DocumentBlock[],
  items: string[] | undefined,
): void => {
  if (!items || items.length === 0) {
    return;
  }

  blocks.push({ type: 'bullets', items });
};

const buildLetterSectionBlocks = (
  section: OffLabelLetterSection,
): DocumentBlock[] => {
  const blocks: DocumentBlock[] = [];

  addLineBreakBlock(blocks, section.senderLines);
  addLineBreakBlock(blocks, section.addresseeLines);
  addParagraphBlock(blocks, section.dateLine);
  addParagraphBlock(blocks, section.subject);
  blocks.push(...toParagraphBlocks(section.paragraphs));

  if (section.attachments.length > 0) {
    addParagraphBlock(blocks, section.attachmentsHeading);
    addBulletsBlock(blocks, section.attachments);
  }

  return blocks;
};

const buildPart3Blocks = (
  part3: OffLabelExportBundle['part3'],
): DocumentBlock[] => {
  const blocks: DocumentBlock[] = [];

  addLineBreakBlock(blocks, part3.senderLines);
  addLineBreakBlock(blocks, part3.addresseeLines);
  addParagraphBlock(blocks, part3.dateLine);
  addParagraphBlock(blocks, part3.subject);
  blocks.push(...toParagraphBlocks(part3.paragraphs));

  return blocks;
};

const buildSourcesSection = (
  heading: string,
  items: string[],
): DocumentSection => {
  const blocks: DocumentBlock[] = [];

  addParagraphBlock(blocks, heading);
  addBulletsBlock(blocks, items);

  return {
    id: 'sources',
    heading,
    blocks,
  };
};

const buildChecklistSection = (
  checklist: OffLabelPostExportChecklist,
  locale: SupportedLocale,
): DocumentSection => {
  const checkbox = '☐ ';
  const blocks: DocumentBlock[] = [];

  addParagraphBlock(blocks, checklist.title);
  addParagraphBlock(blocks, checklist.intro);
  addParagraphBlock(blocks, checklist.documentsHeading);
  addBulletsBlock(
    blocks,
    checklist.documentsItems.map((item) => `${checkbox}${item}`),
  );
  addParagraphBlock(blocks, checklist.signaturesHeading);
  addBulletsBlock(
    blocks,
    checklist.signaturesItems.map((item) => `${checkbox}${item}`),
  );
  addParagraphBlock(blocks, checklist.physicianSupportHeading);
  addBulletsBlock(
    blocks,
    checklist.physicianSupportItems.map((item) => `${checkbox}${item}`),
  );
  addParagraphBlock(blocks, checklist.attachmentsHeading);
  addBulletsBlock(
    blocks,
    checklist.attachmentsItems.length > 0
      ? checklist.attachmentsItems.map((item) => `${checkbox}${item}`)
      : [checklist.attachmentsFallbackItem],
  );
  addParagraphBlock(blocks, checklist.shippingHeading);
  addBulletsBlock(
    blocks,
    checklist.shippingItems.map((item) => `${checkbox}${item}`),
  );
  addParagraphBlock(blocks, checklist.note);

  return {
    id: 'checklist',
    heading:
      locale === 'en'
        ? 'Checklist - Next steps after export'
        : 'Checkliste - Nächste Schritte nach dem Export',
    blocks,
  };
};

export const buildOfflabelAntragPdfDocumentModel = ({
  formData,
  locale,
  exportedAt = new Date(),
}: BuildOfflabelAntragPdfDocumentModelOptions): DocumentModel => {
  const model = buildOffLabelAntragDocumentModel(formData, locale, {
    exportedAt,
  });

  const templateData: OfflabelPdfTemplateData = {
    locale,
    createdAtIso: exportedAt.toISOString(),
    exportBundle: model.exportBundle,
    sourcesHeading: model.sourcesHeading,
    sources: model.sources,
    postExportChecklist: model.postExportChecklist,
  };

  return {
    title:
      locale === 'en'
        ? 'Off-label application (parts 1-3)'
        : 'Off-Label-Antrag (Teil 1-3)',
    meta: {
      createdAtIso: exportedAt.toISOString(),
      locale,
      templateData,
    },
    sections: [
      {
        id: 'part1',
        heading:
          locale === 'en'
            ? 'Part 1 - Letter to health insurer'
            : 'Teil 1 - Schreiben an die Krankenkasse',
        blocks: buildLetterSectionBlocks(model.kk),
      },
      {
        id: 'part2',
        heading:
          locale === 'en'
            ? 'Part 2 - Cover letter to physician'
            : 'Teil 2 - Begleitschreiben an die Arztpraxis',
        blocks: buildLetterSectionBlocks(model.arzt),
      },
      {
        id: 'part3',
        heading:
          locale === 'en'
            ? 'Part 3 - Physician statement template'
            : 'Teil 3 - Ärztliche Stellungnahme / Befundbericht',
        blocks: buildPart3Blocks(model.exportBundle.part3),
      },
      buildSourcesSection(model.sourcesHeading, model.sources),
      buildChecklistSection(model.postExportChecklist, locale),
    ],
  };
};
