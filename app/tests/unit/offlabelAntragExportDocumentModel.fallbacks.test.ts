// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { OfflabelRenderedDocument } from '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments';

const { buildOfflabelDocumentsMock } = vi.hoisted(() => ({
  buildOfflabelDocumentsMock: vi.fn<
    (
      formData: Record<string, unknown>,
      locale?: 'de' | 'en',
    ) => OfflabelRenderedDocument[]
  >(() => []),
}));

vi.mock('../../src/i18n', () => ({
  default: {
    getFixedT: () => (key: string, options?: Record<string, unknown>) =>
      typeof options?.defaultValue === 'string' ? options.defaultValue : key,
  },
}));

vi.mock(
  '../../src/formpacks/offlabel-antrag/content/buildOfflabelDocuments',
  () => ({
    buildOfflabelDocuments: buildOfflabelDocumentsMock,
  }),
);

import { buildOffLabelAntragDocumentModel } from '../../src/formpacks/offlabel-antrag/export/documentModel';

const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');

describe('buildOffLabelAntragDocumentModel fallbacks', () => {
  it('handles missing preview parts and falls back to defaults', () => {
    buildOfflabelDocumentsMock.mockReturnValueOnce([]);

    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.paragraphs).toEqual([]);
    expect(model.arzt.paragraphs).toEqual([]);
    expect(model.part3.title).toBe('');
    expect(model.part3.senderLines).toEqual([
      'Hausarztpraxis Beispiel',
      'Dr. med. Erika Beispiel',
      'Praxisstraße 2',
      '12345 Musterstadt',
    ]);
    expect(model.part3.addresseeLines).toEqual([
      'AOK Minus',
      'Ablehnungen',
      'Kassenweg 3',
      '12345 Musterstadt',
    ]);
    expect(model.part3.subject).toBe(
      'Ärztliche Stellungnahme / Befundbericht zum Off-Label-Use',
    );
    expect(model.part3.paragraphs).toEqual([]);
  });

  it('falls back to default attachment free text when input is whitespace', () => {
    buildOfflabelDocumentsMock.mockReturnValueOnce([]);

    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
        attachmentsFreeText: '   ',
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.attachments.items).toEqual([]);
    expect(model.attachmentsFreeText).toBe('—');
  });

  it('keeps liability section empty when part2 has no liability heading', () => {
    buildOfflabelDocumentsMock.mockReturnValueOnce([
      { id: 'part1', title: 'Part 1', blocks: [] },
      {
        id: 'part2',
        title: 'Part 2',
        blocks: [
          { kind: 'paragraph', text: 'Adressat: Test Praxis' },
          { kind: 'paragraph', text: 'Guten Tag Test,' },
          { kind: 'paragraph', text: 'Inhalt ohne Haftungsabschnitt.' },
        ],
      },
      { id: 'part3', title: 'Part 3', blocks: [] },
    ]);

    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.arzt.liabilityHeading).toBe('');
    expect(model.arzt.liabilityParagraphs).toEqual([]);
    expect(model.arzt.paragraphs.join('\n')).toContain(
      'Inhalt ohne Haftungsabschnitt.',
    );
  });

  it('appends trailing blank when no greeting exists and attachments are present', () => {
    buildOfflabelDocumentsMock.mockReturnValueOnce([
      {
        id: 'part1',
        title: 'Part 1',
        blocks: [{ kind: 'paragraph', text: 'Sachverhalt ohne Grußformel.' }],
      },
      { id: 'part2', title: 'Part 2', blocks: [] },
      { id: 'part3', title: 'Part 3', blocks: [] },
    ]);

    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
        attachmentsFreeText: 'Befundbericht',
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.paragraphs).toContain('Sachverhalt ohne Grußformel.');
    expect(model.kk.paragraphs.at(-1)).toBe('');
  });

  it('keeps paragraphs unchanged when greeting exists but no signature follows', () => {
    buildOfflabelDocumentsMock.mockReturnValueOnce([
      {
        id: 'part1',
        title: 'Part 1',
        blocks: [{ kind: 'paragraph', text: 'Mit freundlichen Grüßen' }],
      },
      { id: 'part2', title: 'Part 2', blocks: [] },
      { id: 'part3', title: 'Part 3', blocks: [] },
    ]);

    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.kk.paragraphs).toEqual(['Mit freundlichen Grüßen']);
  });

  it('trims surrounding blank lines around body and liability paragraphs in part 2', () => {
    buildOfflabelDocumentsMock.mockReturnValueOnce([
      { id: 'part1', title: 'Part 1', blocks: [] },
      {
        id: 'part2',
        title: 'Part 2',
        blocks: [
          { kind: 'paragraph', text: '' },
          { kind: 'paragraph', text: 'Kerninhalt' },
          {
            kind: 'heading',
            text: 'Aufklärung und Einwilligung zum Off-Label-Use: Test',
          },
          { kind: 'paragraph', text: '' },
          { kind: 'paragraph', text: 'Patient*in: Test Person' },
          { kind: 'paragraph', text: '' },
        ],
      },
      { id: 'part3', title: 'Part 3', blocks: [] },
    ]);

    const model = buildOffLabelAntragDocumentModel(
      {
        request: { drug: 'ivabradine' },
      },
      'de',
      { exportedAt: FIXED_EXPORTED_AT },
    );

    expect(model.arzt.paragraphs.at(0)).not.toBe('');
    expect(model.arzt.paragraphs.at(-1)).not.toBe('');
    expect(model.arzt.liabilityParagraphs?.at(0)).not.toBe('');
    expect(model.arzt.liabilityParagraphs?.at(-1)).not.toBe('');
    expect(model.arzt.paragraphs.join('\n')).toContain('Kerninhalt');
    expect(model.arzt.liabilityParagraphs?.join('\n')).toContain(
      'Patient*in: Test Person',
    );
  });
});
