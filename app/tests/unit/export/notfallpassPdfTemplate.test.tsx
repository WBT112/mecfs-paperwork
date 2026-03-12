import { Children, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { DocumentModel } from '../../../src/export/pdf/types';
import NotfallpassPdfDocument from '../../../src/export/pdf/templates/NotfallpassPdfDocument';
import { buildNotfallpassPdfDocumentModel } from '../../../src/formpacks/notfallpass/export/pdfDocumentModel';
import { collectRenderedText } from './pdfRenderedText';

const EXPORTED_AT_ISO = '2026-03-12T09:00:00.000Z';
const PERSON_NAME = 'Mara Muster';
const TEMPLATE_SUBTITLE = 'Kurzfassung';
const DEFAULT_TITLE = 'Notfallpass';

describe('NotfallpassPdfDocument', () => {
  it('renders a single-page localized emergency pass', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        person: {
          firstName: 'Mara',
          lastName: 'Muster',
          birthDate: '1990-04-12',
        },
        contacts: [{ name: 'Alex', phone: '+49 30 1234', relation: 'Partner' }],
        diagnoses: { meCfs: true, formatted: 'ME/CFS' },
        symptoms: 'Starke Erschöpfung',
        medications: [{ name: 'Elektrolytlösung', dosage: '500 ml' }],
        allergies: 'Keine bekannt',
        doctor: { name: 'Praxis Beispiel', phone: '+49 30 987654' },
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
    }>;
    const pages = Children.toArray(element.props.children);
    const firstPage = pages[0] as ReactNode;

    expect(element.props.language).toBe('de-DE');
    expect(element.props.title).toBe(DEFAULT_TITLE);
    expect(pages).toHaveLength(1);
    expect(collectRenderedText(firstPage)).toEqual(
      expect.arrayContaining([
        DEFAULT_TITLE,
        'Wichtige Gesundheitsinformationen für den Notfall.',
        PERSON_NAME,
        'ME/CFS',
        'Praxis Beispiel',
      ]),
    );
  });

  it('keeps rendering with sparse fallback model data', () => {
    const model: DocumentModel = {
      title: 'Emergency pass',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'en',
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
    }>;
    const pages = Children.toArray(element.props.children);

    expect(element.props.language).toBe('en-US');
    expect(pages).toHaveLength(1);
  });

  it('falls back to the default locale when document metadata is missing', () => {
    const model: DocumentModel = {
      title: DEFAULT_TITLE,
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
    }>;

    expect(element.props.language).toBe('de-DE');
  });

  it('uses template title fallback and suppresses placeholder separators', () => {
    const model: DocumentModel = {
      title: '   ',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: {
          createdAtIso: EXPORTED_AT_ISO,
          locale: 'de',
          title: 'Notfallpass aus Template',
          subtitle: TEMPLATE_SUBTITLE,
          personHeading: 'Person',
          personRows: [['Vorname', PERSON_NAME]],
          contactsHeading: 'Kontakte',
          contacts: [{ name: 'Alex', phone: '—', relation: 'Partner' }],
          diagnosesHeading: 'Diagnosen',
          diagnosesSummary: 'ME/CFS',
          diagnosisParagraphs: [],
          symptomsHeading: 'Symptome',
          symptoms: 'Starke Erschöpfung',
          medicationsHeading: 'Medikamente',
          medications: [
            { name: 'Elektrolytlösung', dosage: '—', schedule: 'Täglich' },
          ],
          allergiesHeading: 'Allergien',
          allergies: 'Keine bekannt',
          doctorHeading: 'Praxis',
          doctorRows: [['Telefon', '123']],
        },
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
    }>;
    const pages = Children.toArray(element.props.children);
    const firstPage = pages[0] as ReactNode;
    const text = collectRenderedText(firstPage);

    expect(element.props.language).toBe('de-DE');
    expect(element.props.title).toBe('Notfallpass aus Template');
    expect(text).toContain('Alex');
    expect(text).not.toContain('Alex · —');
    expect(text).toContain('Elektrolytlösung · Täglich');
    expect(text).not.toContain('Elektrolytlösung · — · Täglich');
  });

  it('falls back to the default title and empty-state bullets when template data is sparse', () => {
    const model: DocumentModel = {
      title: '   ',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: {
          createdAtIso: EXPORTED_AT_ISO,
          locale: 'de',
          title: '',
          subtitle: TEMPLATE_SUBTITLE,
          personHeading: 'Person',
          personRows: [['Vorname', PERSON_NAME]],
          contactsHeading: 'Kontakte',
          contacts: [],
          diagnosesHeading: 'Diagnosen',
          diagnosesSummary: '—',
          diagnosisParagraphs: [],
          symptomsHeading: 'Symptome',
          symptoms: '—',
          medicationsHeading: 'Medikamente',
          medications: [],
          allergiesHeading: 'Allergien',
          allergies: '—',
          doctorHeading: 'Praxis',
          doctorRows: [['Telefon', '—']],
        },
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
    }>;
    const firstPage = Children.toArray(element.props.children)[0] as ReactNode;
    const text = collectRenderedText(firstPage);

    expect(element.props.language).toBe('de-DE');
    expect(element.props.title).toBe(DEFAULT_TITLE);
    expect(text).toEqual(expect.arrayContaining([TEMPLATE_SUBTITLE, '—']));
  });

  it('renders placeholder-only contacts without crashing the fallback join path', () => {
    const model: DocumentModel = {
      title: DEFAULT_TITLE,
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: {
          createdAtIso: EXPORTED_AT_ISO,
          locale: 'de',
          title: DEFAULT_TITLE,
          subtitle: TEMPLATE_SUBTITLE,
          personHeading: 'Person',
          personRows: [['Vorname', PERSON_NAME]],
          contactsHeading: 'Kontakte',
          contacts: [{ name: '—', phone: '—', relation: '—' }],
          diagnosesHeading: 'Diagnosen',
          diagnosesSummary: '—',
          diagnosisParagraphs: [],
          symptomsHeading: 'Symptome',
          symptoms: '—',
          medicationsHeading: 'Medikamente',
          medications: [{ name: 'Rx', dosage: '—', schedule: '—' }],
          allergiesHeading: 'Allergien',
          allergies: '—',
          doctorHeading: 'Praxis',
          doctorRows: [['Telefon', '—']],
        },
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
    }>;

    expect(Children.toArray(element.props.children)).toHaveLength(1);
  });
});
