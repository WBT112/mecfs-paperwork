import { describe, expect, it } from 'vitest';
import type { DocumentModel } from '../../../src/export/pdf/types';
import {
  DOCUMENT_BLOCK_TYPES,
  isDocumentBlock,
  isDocumentBlockType,
  isDocumentModel,
  isDocumentSection,
} from '../../../src/export/pdf/types';

const validModel: DocumentModel = {
  title: 'Doctor Letter',
  meta: { createdAtIso: '2026-02-02T00:00:00.000Z', locale: 'de' },
  sections: [
    {
      heading: 'Patient',
      blocks: [
        { type: 'paragraph', text: 'Hello' },
        { type: 'lineBreaks', lines: ['Line 1', 'Line 2'] },
        { type: 'bullets', items: ['Item 1'] },
        { type: 'kvTable', rows: [['Key', 'Value']] },
      ],
    },
  ],
};

describe('pdf document type helpers', () => {
  it('exposes the document block types', () => {
    expect(DOCUMENT_BLOCK_TYPES).toEqual([
      'paragraph',
      'lineBreaks',
      'bullets',
      'kvTable',
    ]);
  });

  it('validates block types', () => {
    expect(isDocumentBlockType('paragraph')).toBe(true);
    expect(isDocumentBlockType('unknown')).toBe(false);
    expect(isDocumentBlockType(123)).toBe(false);
  });

  it('validates document blocks', () => {
    expect(isDocumentBlock(validModel.sections[0].blocks[0])).toBe(true);
    expect(isDocumentBlock({ type: 'paragraph', text: 123 })).toBe(false);
    expect(isDocumentBlock({ type: 'lineBreaks', lines: 'nope' })).toBe(false);
    expect(isDocumentBlock({ type: 'kvTable', rows: [['Key']] })).toBe(false);
    expect(isDocumentBlock({ type: 'bullets', items: [1, 2] })).toBe(false);
  });

  it('validates document sections', () => {
    expect(isDocumentSection(validModel.sections[0])).toBe(true);
    expect(isDocumentSection({ id: 123, heading: 'Heading', blocks: [] })).toBe(
      false,
    );
    expect(isDocumentSection({ heading: 42, blocks: [] })).toBe(false);
    expect(isDocumentSection({ blocks: 'nope' })).toBe(false);
  });

  it('validates document models', () => {
    expect(isDocumentModel(validModel)).toBe(true);
    expect(isDocumentModel({ title: 42, sections: [] })).toBe(false);
    expect(isDocumentModel({ sections: [], meta: 'nope' })).toBe(false);
    expect(
      isDocumentModel({
        ...validModel,
        meta: { createdAtIso: 123, locale: 'de' },
      }),
    ).toBe(false);
    expect(
      isDocumentModel({
        ...validModel,
        meta: { createdAtIso: '2026-02-02T00:00:00.000Z', locale: 123 },
      }),
    ).toBe(false);
    expect(isDocumentModel({ sections: [{ blocks: [] }] })).toBe(true);
    expect(isDocumentModel({ sections: [{ blocks: 'nope' }] })).toBe(false);
  });
});
