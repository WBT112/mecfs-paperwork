import { pdf } from '@react-pdf/renderer';
import { describe, expect, it, vi } from 'vitest';
import type { ReactElement, ReactNode } from 'react';
import DoctorLetterPdfDocument from '../../../src/export/pdf/templates/DoctorLetterPdfDocument';
import type { DocumentModel } from '../../../src/export/pdf/types';

vi.mock('../../../src/export/pdf/fonts', () => ({
  ensurePdfFontsRegistered: vi.fn(),
  PDF_FONT_FAMILY_SANS: 'Helvetica',
  PDF_FONT_FAMILY_SERIF: 'Times-Roman',
}));

vi.mock(
  '../../../src/assets/formpacks/doctor-letter/annex-1-icd10-schema.jpg',
  () => ({
    default:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8/5+hHgAHggJ/lqG02QAAAABJRU5ErkJggg==',
  }),
);
vi.mock(
  '../../../src/assets/formpacks/doctor-letter/annex-2-practiceguide-excerpt.png',
  () => ({
    default:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8/5+hHgAHggJ/lqG02QAAAABJRU5ErkJggg==',
  }),
);

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

const getPageOneText = (model: DocumentModel): string => {
  const documentNode = DoctorLetterPdfDocument({ model }) as ReactElement<{
    children: ReactNode;
  }>;
  const pages = documentNode.props.children;
  const pageOne = (Array.isArray(pages) ? pages[0] : pages) as ReactElement<{
    children?: ReactNode;
  }>;
  const pageChildren = pageOne.props.children;
  return JSON.stringify(pageChildren);
};

type ReadableLike = {
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

const isReadableLike = (value: unknown): value is ReadableLike =>
  typeof value === 'object' &&
  value !== null &&
  'on' in value &&
  typeof value.on === 'function';

const renderPdfToLatin1Text = async (
  document: Parameters<typeof pdf>[0],
): Promise<string> => {
  const output = await pdf(document).toBuffer();

  if (output instanceof Uint8Array) {
    return Buffer.from(output).toString('latin1');
  }

  if (!isReadableLike(output)) {
    throw new Error('Unsupported PDF output type');
  }

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    output.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    output.on('end', () => resolve());
    output.on('error', (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });
  });

  return Buffer.concat(chunks).toString('latin1');
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

  it('renders English Ms. salutation with populated patient and doctor address lines', () => {
    const model: DocumentModel = {
      title: documentTitle,
      meta: {
        locale: 'en-US',
        createdAtIso,
        templateData: {
          patient: {
            firstName: 'Mia',
            lastName: 'Miller',
            streetAndNumber: 'Main St. 1',
            postalCode: '12345',
            city: 'Sampletown',
          },
          doctor: {
            practice: 'Practice One',
            gender: 'Frau',
            title: 'Dr.',
            name: 'Anna Smith',
            streetAndNumber: 'Medical Ave 2',
            postalCode: '54321',
            city: 'Healthcity',
          },
        },
      },
      sections: [
        {
          id: 'case',
          blocks: [{ type: 'paragraph', text: 'Case paragraph.' }],
        },
      ],
    };

    const pageOneText = getPageOneText(model);

    expect(pageOneText).toContain('Mia Miller – Main St. 1 – 12345 Sampletown');
    expect(pageOneText).toContain('Practice One');
    expect(pageOneText).toContain('Dr. Anna Smith');
    expect(pageOneText).toContain('Medical Ave 2');
    expect(pageOneText).toContain('54321 Healthcity');
    expect(pageOneText).toContain('Dear Ms. Dr. Anna Smith,');
  });

  it('renders German Mr. salutation and default German date label', () => {
    const model: DocumentModel = {
      title: documentTitle,
      meta: {
        locale: 'de-DE',
        createdAtIso,
        templateData: {
          doctor: {
            gender: 'Herr',
            title: 'Prof.',
            name: 'Max Mustermann',
          },
        },
      },
      sections: [
        {
          id: 'case',
          blocks: [{ type: 'paragraph', text: 'Absatz.' }],
        },
      ],
    };

    const pageOneText = getPageOneText(model);

    expect(pageOneText).toContain('Sehr geehrter Herr Prof. Max Mustermann,');
    expect(pageOneText).toContain('"Datum"');
  });

  it('renders German Ms. salutation', () => {
    const model: DocumentModel = {
      title: documentTitle,
      meta: {
        locale: 'de-DE',
        createdAtIso,
        templateData: {
          doctor: {
            gender: 'Frau',
            title: 'Dr.',
            name: 'Erika Beispiel',
          },
        },
      },
      sections: [
        {
          id: 'case',
          blocks: [{ type: 'paragraph', text: 'Absatz.' }],
        },
      ],
    };

    const pageOneText = getPageOneText(model);
    expect(pageOneText).toContain('Sehr geehrte Frau Dr. Erika Beispiel,');
  });

  it('falls back to default locale/date and renders without a case section', () => {
    const model: DocumentModel = {
      title: documentTitle,
      sections: [],
    };

    const pageOneText = getPageOneText(model);

    expect(pageOneText).toContain('Sehr geehrte Damen und Herren,');
    expect(pageOneText).toContain('"Datum"');
  });

  it('embeds metadata, language and outlines for accessibility tooling', async () => {
    const text = await renderPdfToLatin1Text(
      <DoctorLetterPdfDocument model={germanTemplateModel} />,
    );

    expect(text).toContain('/Title');
    expect(text).toContain('/Lang (de-DE)');
    expect(text).toContain('/Outlines');
    expect(text).not.toContain('/Encrypt');
  });

  it('falls back to subject as PDF title when model title is missing', async () => {
    const text = await renderPdfToLatin1Text(
      <DoctorLetterPdfDocument
        model={{
          meta: { createdAtIso, locale: 'de-DE' },
          sections: [],
        }}
      />,
    );

    expect(text).toContain('/Title');
  });
});
