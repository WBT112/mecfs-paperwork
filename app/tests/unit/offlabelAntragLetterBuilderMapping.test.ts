import { describe, expect, it, vi } from 'vitest';
import {
  buildPart1KkLetter,
  buildPart2DoctorLetter,
} from '../../src/formpacks/offlabel-antrag/letterBuilder';

const FIXED_EXPORTED_AT = new Date('2026-02-10T12:00:00.000Z');

vi.mock('../../src/formpacks/offlabel-antrag/export/documentModel', () => {
  const mockSection = {
    senderLines: ['Sender'],
    addresseeLines: ['Addressee'],
    dateLine: 'City, 10.02.2026',
    subject: 'Subject',
    paragraphs: ['Paragraph'],
    attachmentsHeading: 'Anlagen',
    attachments: ['Attachment'],
    signatureBlocks: [{ label: 'Patient/in', name: 'Max Mustermann' }],
  };

  return {
    parseOfflabelAttachments: (text: string | null | undefined) =>
      text ? [text] : [],
    buildOffLabelAntragDocumentModel: () => ({
      kk: {
        ...mockSection,
        signatureBlocks: [
          {
            label: 'Behandelnde/r Ärztin/Arzt',
            name: 'Dr. Test',
            extraLine: 'Praxis Test',
          },
        ],
      },
      arzt: mockSection,
      exportBundle: {
        exportedAtIso: FIXED_EXPORTED_AT.toISOString(),
        part1: {
          senderLines: [],
          addresseeLines: [],
          dateLine: '',
          subject: '',
          paragraphs: [],
          attachmentsHeading: '',
          attachments: [],
          signatureBlocks: [],
        },
        part2: {
          senderLines: [],
          addresseeLines: [],
          dateLine: '',
          subject: '',
          paragraphs: [],
          attachmentsHeading: '',
          attachments: [],
          signatureBlocks: [],
        },
        part3: {
          title: '',
          paragraphs: [],
        },
      },
    }),
  };
});

describe('offlabel letter builder mapping', () => {
  it('keeps extraLine from section signatures', () => {
    const letter = buildPart1KkLetter({
      locale: 'de',
      model: {},
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(letter.signatureBlocks).toEqual([
      {
        label: 'Behandelnde/r Ärztin/Arzt',
        name: 'Dr. Test',
        extraLine: 'Praxis Test',
      },
    ]);
  });

  it('keeps part2 mapping intact when no signature block extras are present', () => {
    const letter = buildPart2DoctorLetter({
      locale: 'de',
      model: {},
      exportedAt: FIXED_EXPORTED_AT,
    });

    expect(letter.subject).toBe('Subject');
    expect(letter.signatureBlocks).toEqual([
      {
        label: 'Patient/in',
        name: 'Max Mustermann',
      },
    ]);
  });
});
