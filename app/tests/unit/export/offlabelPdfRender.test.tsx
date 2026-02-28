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
const DEFAULT_SENDER_LINES = [
  'Max Mustermann',
  'Musterstraße 1',
  '12345 Musterstadt',
] as const;
const DEFAULT_DATE_LINE = 'Musterstadt, 10.02.2026';

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
      senderLines: [...DEFAULT_SENDER_LINES],
      addresseeLines: [
        'Musterkasse',
        'Leistungsabteilung',
        'Kassenweg 3',
        '54321 Kassel',
      ],
      dateLine: DEFAULT_DATE_LINE,
      subject: 'Antrag auf Kostenübernahme',
      paragraphs: ['Punkt 1: ...', '', 'Punkt 2: ...'],
      attachmentsHeading: 'Anlagen',
      attachments: ['Arztbrief 01/2026', 'Arztbrief 01/2026'],
      signatureBlocks: [],
    },
    part2: {
      senderLines: [...DEFAULT_SENDER_LINES],
      addresseeLines: [
        'Praxis Nord',
        'Dr. Hausarzt',
        'Praxisweg 5',
        '22303 Hamburg',
      ],
      dateLine: DEFAULT_DATE_LINE,
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
  postExportChecklist: {
    title: 'Checkliste - Nächste Schritte nach dem Export',
    intro:
      'Diese Liste hilft euch, den Antrag vollständig vorzubereiten. Hakt ab, was erledigt ist.',
    documentsHeading: '1) Dokumente prüfen',
    documentsItems: ['Dokument A geprüft'],
    signaturesHeading: '2) Unterschriften',
    signaturesItems: ['Antrag unterschrieben'],
    physicianSupportHeading: '3) Ärztliche Unterstützung',
    physicianSupportItems: ['Praxis kontaktiert'],
    attachmentsHeading: '4) Anlagen (aus euren Eingaben)',
    attachmentsItems: ['Befundbericht'],
    attachmentsChecklistItems: ['Befundbericht'],
    attachmentsFallbackItem:
      'Anlagenliste geprüft und ggf. ergänzt (z. B. Befunde, Bescheide, relevante Unterlagen)',
    shippingHeading: '5) Versand & Archiv',
    shippingItems: ['Antragssatz zusammengestellt'],
    note: 'Hinweis: Bearbeitungsfristen können variieren.',
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

  it('renders DE fallback headings and checklist attachment fallback entries', async () => {
    const base = buildTemplateData();
    const model = buildModel({
      locale: 'de',
      sourcesHeading: '',
      sources: ['Quelle A'],
      exportBundle: {
        ...base.exportBundle,
        part1: {
          ...base.exportBundle.part1,
          senderLines: ['Team Postfach', 'Bereich A', 'Hinweis ohne PLZ'],
          dateLine: '31.02.2026',
          attachmentsHeading: '',
          attachments: ['Dokument A'],
          paragraphs: ['Anrede ohne Grußformel'],
        },
      },
      postExportChecklist: {
        ...base.postExportChecklist,
        attachmentsItems: [],
      },
    });

    const blob = await pdf(
      <OfflabelAntragPdfDocument model={model} />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders closing block fallback when greeting has no signature line', async () => {
    const base = buildTemplateData();
    const model = buildModel({
      exportBundle: {
        ...base.exportBundle,
        part1: {
          ...base.exportBundle.part1,
          senderLines: ['Max Mustermann', '12345 Musterstadt', 'Hinweis'],
          paragraphs: ['Einleitung', 'Mit freundlichen Grüßen', '   ', ''],
        },
      },
    });

    const blob = await pdf(
      <OfflabelAntragPdfDocument model={model} />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders liability pages for section fallback and explicit consent heading', async () => {
    const base = buildTemplateData();
    const model = buildModel({
      exportBundle: {
        ...base.exportBundle,
        part2: {
          ...base.exportBundle.part2,
          liabilityHeading: 'Einwilligungserklärung',
          liabilityParagraphs: [
            '1. Vorbemerkung',
            '2. Hinweise',
            '3) Abschnitt ohne Consent-Begriff',
          ],
        },
      },
    });

    const blob = await pdf(
      <OfflabelAntragPdfDocument model={model} />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders liability consent split when a consent section heading is present', async () => {
    const base = buildTemplateData();
    const model = buildModel({
      exportBundle: {
        ...base.exportBundle,
        part2: {
          ...base.exportBundle.part2,
          liabilityHeading: 'Consent Form',
          liabilityParagraphs: [
            '1. Intro',
            '3) Consent and data use',
            'I agree to proceed.',
          ],
        },
      },
    });

    const blob = await pdf(
      <OfflabelAntragPdfDocument model={model} />,
    ).toBlob();

    expect(blob.size).toBeGreaterThan(0);
  });
});
