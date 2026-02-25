import { pdf } from '@react-pdf/renderer';
import { describe, expect, it, vi } from 'vitest';
import type { DocumentModel } from '../../../src/export/pdf/types';
import type { OfflabelPdfTemplateData } from '../../../src/formpacks/offlabel-antrag/export/pdfDocumentModel';
import OfflabelAntragPdfDocument from '../../../src/export/pdf/templates/OfflabelAntragPdfDocument';

vi.mock('../../../src/export/pdf/fonts', () => ({
  ensurePdfFontsRegistered: vi.fn(),
  PDF_FONT_FAMILY_SANS: 'Helvetica',
  PDF_FONT_FAMILY_SERIF: 'Times-Roman',
}));

const CREATED_AT_ISO = '2026-02-10T12:00:00.000Z';

const buildTemplateData = (
  overrides: Partial<OfflabelPdfTemplateData> = {},
): OfflabelPdfTemplateData => ({
  locale: 'de',
  createdAtIso: CREATED_AT_ISO,
  sourcesHeading: 'Quellen',
  sources: [
    'Bewertung der Expertengruppe Long COVID Off-Label-Use nach § 35 c Abs. 1 SGB V zur Anwendung von Ivabradin bei Patientinnen und Patienten mit COVID-19-assoziiertem Posturalem orthostatischem Tachykardiesyndrom (PoTS), die eine Therapie mit Betablockern nicht tolerieren oder für diese nicht geeignet sind (Stand 15.10.2025).',
  ],
  exportBundle: {
    exportedAtIso: CREATED_AT_ISO,
    part1: {
      senderLines: ['Max Mustermann', 'Musterstraße 1', '12345 Musterstadt'],
      addresseeLines: [
        'Musterkasse',
        'Leistungsabteilung',
        'Kassenweg 3',
        '54321 Kassel',
      ],
      dateLine: 'Musterstadt, 10.02.2026',
      subject: 'Antrag auf Kostenübernahme',
      paragraphs: ['Punkt 1: ...', '', 'Punkt 2: ...'],
      attachmentsHeading: 'Anlagen',
      attachments: ['Arztbrief 01/2026', 'Arztbrief 01/2026'],
      signatureBlocks: [],
    },
    part2: {
      senderLines: ['Max Mustermann', 'Musterstraße 1', '12345 Musterstadt'],
      addresseeLines: [
        'Praxis Nord',
        'Dr. Hausarzt',
        'Praxisweg 5',
        '22303 Hamburg',
      ],
      dateLine: 'Musterstadt, 10.02.2026',
      subject: 'Begleitschreiben zum Off-Label-Antrag - Bitte um Unterstützung',
      paragraphs: ['ich bereite einen Antrag ...'],
      attachmentsHeading: 'Anlagen',
      attachments: ['Teil 1: Antrag an die Krankenkasse (Entwurf)'],
      signatureBlocks: [],
    },
    part3: {
      title: '',
      senderLines: [
        'Praxis Nord',
        'Dr. Hausarzt',
        'Praxisweg 5',
        '22303 Hamburg',
      ],
      addresseeLines: [
        'Musterkasse',
        'Leistungsabteilung',
        'Kassenweg 3',
        '54321 Kassel',
      ],
      dateLine: 'Hamburg, 10.02.2026',
      subject: 'Ärztliche Stellungnahme / Befundbericht zum Offlabel-User',
      paragraphs: ['Diagnose: ...', 'Therapieplan: ...'],
    },
  },
  ...overrides,
});

const buildModel = (
  templateDataOverrides: Partial<OfflabelPdfTemplateData> = {},
): DocumentModel => ({
  meta: {
    createdAtIso: CREATED_AT_ISO,
    locale: 'de',
    templateData: buildTemplateData(templateDataOverrides),
  },
  sections: [],
});

describe('OfflabelAntragPdfDocument', () => {
  it('renders a non-empty PDF blob', async () => {
    const model = buildModel();

    const blob = await pdf(
      <OfflabelAntragPdfDocument model={model} />,
    ).toBlob();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders with empty attachment lists', async () => {
    const model = buildModel({
      exportBundle: {
        ...buildTemplateData().exportBundle,
        part1: {
          ...buildTemplateData().exportBundle.part1,
          attachments: [],
          attachmentsHeading: '',
        },
        part2: {
          ...buildTemplateData().exportBundle.part2,
          attachments: [],
          attachmentsHeading: '',
        },
      },
    });

    const blob = await pdf(
      <OfflabelAntragPdfDocument model={model} />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders with missing templateData without crashing', async () => {
    const blob = await pdf(
      <OfflabelAntragPdfDocument
        model={{
          meta: { createdAtIso: CREATED_AT_ISO, locale: 'de' },
          sections: [],
        }}
      />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders english fallbacks for attachment and source headings', async () => {
    const templateData = buildTemplateData({
      locale: 'en',
      sourcesHeading: '',
      sources: ['Source A', 'Source A'],
    });

    const blob = await pdf(
      <OfflabelAntragPdfDocument
        model={{
          meta: {
            createdAtIso: CREATED_AT_ISO,
            locale: 'en',
            templateData,
          },
          sections: [],
        }}
      />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders with no meta and falls back to default locale/template data', async () => {
    const blob = await pdf(
      <OfflabelAntragPdfDocument
        model={{
          sections: [],
        }}
      />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });
});
