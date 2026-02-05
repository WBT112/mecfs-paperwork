import { describe, expect, it } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import DoctorLetterPdfDocument from '../../../src/export/pdf/templates/DoctorLetterPdfDocument';
import type { DocumentModel } from '../../../src/export/pdf/types';

const fixture: DocumentModel = {
  title: 'Doctor letter',
  meta: { createdAtIso: '2026-02-02T00:00:00.000Z', locale: 'en' },
  sections: [
    {
      heading: 'Patient',
      blocks: [
        {
          type: 'kvTable',
          rows: [
            ['First name', 'Test'],
            ['Last name', 'Person'],
          ],
        },
      ],
    },
    {
      heading: 'Doctor',
      blocks: [
        {
          type: 'kvTable',
          rows: [['Name', 'Dr. Example']],
        },
      ],
    },
    {
      heading: 'Case result',
      blocks: [
        { type: 'paragraph', text: 'First paragraph.' },
        { type: 'bullets', items: ['Item one', 'Item two'] },
        { type: 'lineBreaks', lines: ['Line one', 'Line two'] },
      ],
    },
  ],
};

describe('DoctorLetterPdfDocument', () => {
  it('renders a non-empty PDF blob', async () => {
    const instance = pdf(<DoctorLetterPdfDocument model={fixture} />);
    const blob = await instance.toBlob();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});
