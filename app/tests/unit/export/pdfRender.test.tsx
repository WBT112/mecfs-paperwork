import { describe, expect, it } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import DoctorLetterPdfDocument from '../../../src/export/pdf/templates/DoctorLetterPdfDocument';
import type { DocumentModel } from '../../../src/export/pdf/types';

const documentTitle = 'Doctor letter';
const createdAtIso = '2026-02-02T00:00:00.000Z';

const fixture: DocumentModel = {
  title: documentTitle,
  meta: { createdAtIso, locale: 'en' },
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

const germanTemplateModel: DocumentModel = {
  title: documentTitle,
  meta: {
    createdAtIso,
    locale: 'de-DE',
    templateData: {
      dateLabel: 'Datum',
      formattedDate: '02.02.2026',
      labels: {
        patient: {
          firstName: 'Vorname',
          lastName: 'Nachname',
          streetAndNumber: 'Straße',
          postalCode: 'PLZ',
          city: 'Ort',
        },
        doctor: {
          practice: 'Praxis',
          title: 'Titel',
          gender: 'Anrede',
          name: 'Name',
          streetAndNumber: 'Straße',
          postalCode: 'PLZ',
          city: 'Ort',
        },
      },
    },
  },
  sections: [
    {
      id: 'patient',
      blocks: [
        {
          type: 'kvTable',
          rows: [
            ['Vorname', 'Max'],
            ['Nachname', 'Mustermann'],
            ['Straße', 'Musterstraße 1'],
            ['PLZ', '12345'],
            ['Ort', 'Musterstadt'],
          ],
        },
      ],
    },
    {
      id: 'doctor',
      blocks: [
        {
          type: 'kvTable',
          rows: [
            ['Praxis', 'Praxis Beispiel'],
            ['Titel', 'kein'],
            ['Anrede', 'Frau'],
            ['Name', 'Erika Beispiel'],
            ['Straße', 'Praxisstraße 2'],
            ['PLZ', '12345'],
            ['Ort', 'Musterstadt'],
          ],
        },
      ],
    },
    {
      id: 'case',
      blocks: [
        { type: 'paragraph', text: 'Absatz 1.' },
        { type: 'lineBreaks', lines: ['Zeile 1', 'Zeile 2'] },
        { type: 'bullets', items: ['Punkt 1'] },
        { type: 'kvTable', rows: [['Key', 'Value']] },
      ],
    },
  ],
};

const englishTemplateModel: DocumentModel = {
  title: documentTitle,
  meta: {
    createdAtIso,
    locale: 'en-US',
    templateData: {
      doctor: {
        gender: 'Herr',
        name: 'John Doe',
      },
    },
  },
  sections: [
    {
      id: 'case',
      blocks: [{ type: 'paragraph', text: 'Paragraph.' }],
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

  it('renders with populated German template data', () => {
    const element = DoctorLetterPdfDocument({ model: germanTemplateModel });
    expect(element).toBeTruthy();
  });

  it('renders with English salutation data', () => {
    const element = DoctorLetterPdfDocument({ model: englishTemplateModel });
    expect(element).toBeTruthy();
  });
});
