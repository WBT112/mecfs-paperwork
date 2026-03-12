import { Children, type ReactElement, type ReactNode } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../../src/i18n';
import type { DocumentModel } from '../../../src/export/pdf/types';
import NotfallpassPdfDocument from '../../../src/export/pdf/templates/NotfallpassPdfDocument';
import {
  buildNotfallpassPdfDocumentModel,
  type NotfallpassPdfTemplateData,
} from '../../../src/formpacks/notfallpass/export/pdfDocumentModel';
import deTranslations from '../../../public/formpacks/notfallpass/i18n/de.json';
import enTranslations from '../../../public/formpacks/notfallpass/i18n/en.json';
import { collectRenderedText } from './pdfRenderedText';

const EXPORTED_AT_ISO = '2026-03-12T09:00:00.000Z';
const PERSON_NAME = 'Mara Muster';
const TEMPLATE_SUBTITLE = 'Kurzfassung';
const DEFAULT_TITLE = 'Notfallpass';
const FOLD_HINT =
  'Für das Brieftaschenformat einmal waagerecht und einmal senkrecht falten.';
const namespace = 'formpack:notfallpass';
const SYMPTOMS_TEXT = 'Starke Erschöpfung';
const MEDICATION_NAME = 'Elektrolytlösung';
const PERSON_PANEL_TITLE = 'Person & Diagnose';
const SUPPORT_PANEL_TITLE = 'Kontakte & Praxis';
const ALERTS_PANEL_TITLE = 'Symptome & Allergien';
const MEDICATIONS_PANEL_TITLE = 'Medikamente & Hinweise';
const PERSON_HEADING = 'Person';
const CONTACTS_HEADING = 'Kontakte';
const SYMPTOMS_HEADING = 'Symptome';
const MEDICATIONS_HEADING = 'Medikamente';
const DIAGNOSES_HEADING = 'Diagnosen';
const MEDICATION_BULLET = `${MEDICATION_NAME} · Täglich`;

const createMinimalPanels = (
  contactItems: string[],
  symptomParagraphs: string[],
  medicationItems: string[],
): NotfallpassPdfTemplateData['panels'] => [
  {
    title: PERSON_PANEL_TITLE,
    sections: [
      {
        heading: PERSON_HEADING,
        type: 'rows',
        rows: [['Vorname', PERSON_NAME]],
      },
    ],
  },
  {
    title: SUPPORT_PANEL_TITLE,
    sections: [
      {
        heading: CONTACTS_HEADING,
        type: 'bullets',
        items: contactItems,
      },
    ],
  },
  {
    title: ALERTS_PANEL_TITLE,
    sections: [
      {
        heading: SYMPTOMS_HEADING,
        type: 'paragraphs',
        paragraphs: symptomParagraphs,
      },
    ],
  },
  {
    title: MEDICATIONS_PANEL_TITLE,
    sections: [
      {
        heading: MEDICATIONS_HEADING,
        type: 'bullets',
        items: medicationItems,
      },
    ],
  },
];

const createTemplateData = (
  overrides: Partial<NotfallpassPdfTemplateData> = {},
): NotfallpassPdfTemplateData => ({
  createdAtIso: EXPORTED_AT_ISO,
  locale: 'de',
  title: DEFAULT_TITLE,
  subtitle: TEMPLATE_SUBTITLE,
  foldHint: FOLD_HINT,
  personHeading: 'Person',
  personRows: [['Vorname', PERSON_NAME]],
  contactsHeading: CONTACTS_HEADING,
  contacts: [{ name: 'Alex', phone: '—', relation: 'Partner' }],
  diagnosesHeading: DIAGNOSES_HEADING,
  diagnosesSummary: 'ME/CFS',
  diagnosisParagraphs: [],
  symptomsHeading: SYMPTOMS_HEADING,
  symptoms: SYMPTOMS_TEXT,
  medicationsHeading: MEDICATIONS_HEADING,
  medications: [{ name: MEDICATION_NAME, dosage: '—', schedule: 'Täglich' }],
  allergiesHeading: 'Allergien',
  allergies: 'Keine bekannt',
  doctorHeading: 'Praxis',
  doctorRows: [['Telefon', '123']],
  panels: [
    {
      title: PERSON_PANEL_TITLE,
      sections: [
        {
          heading: PERSON_HEADING,
          type: 'rows',
          rows: [['Vorname', PERSON_NAME]],
        },
        {
          heading: DIAGNOSES_HEADING,
          type: 'paragraphs',
          paragraphs: ['ME/CFS'],
        },
      ],
    },
    {
      title: SUPPORT_PANEL_TITLE,
      sections: [
        {
          heading: CONTACTS_HEADING,
          type: 'bullets',
          items: ['Alex'],
        },
      ],
    },
    {
      title: ALERTS_PANEL_TITLE,
      sections: [
        {
          heading: SYMPTOMS_HEADING,
          type: 'paragraphs',
          paragraphs: [SYMPTOMS_TEXT],
        },
      ],
    },
    {
      title: MEDICATIONS_PANEL_TITLE,
      sections: [
        {
          heading: MEDICATIONS_HEADING,
          type: 'bullets',
          items: [MEDICATION_BULLET],
        },
      ],
    },
  ],
  ...overrides,
});

describe('NotfallpassPdfDocument', () => {
  beforeAll(() => {
    if (!i18n.hasResourceBundle('de', namespace)) {
      i18n.addResourceBundle(
        'de',
        namespace,
        deTranslations as Record<string, string>,
        true,
        true,
      );
    }
    if (!i18n.hasResourceBundle('en', namespace)) {
      i18n.addResourceBundle(
        'en',
        namespace,
        enTranslations as Record<string, string>,
        true,
        true,
      );
    }
  });

  it('renders a single-page localized emergency pass in landscape fold layout', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        person: {
          firstName: 'Mara',
          lastName: 'Muster',
          birthDate: '1990-04-12',
        },
        contacts: [{ name: 'Alex', phone: '+49 30 1234', relation: 'Partner' }],
        diagnoses: { meCfs: true, formatted: 'ME/CFS' },
        symptoms: SYMPTOMS_TEXT,
        medications: [{ name: MEDICATION_NAME, dosage: '500 ml' }],
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
    expect(
      (pages[0] as ReactElement<{ orientation?: string }>).props.orientation,
    ).toBe('landscape');
    expect(collectRenderedText(firstPage)).toEqual(
      expect.arrayContaining([
        DEFAULT_TITLE,
        'Wichtige Gesundheitsinformationen für den Notfall.',
        FOLD_HINT,
        PERSON_NAME,
        'ME/CFS',
        'Praxis Beispiel',
        SUPPORT_PANEL_TITLE,
        ALERTS_PANEL_TITLE,
        MEDICATIONS_PANEL_TITLE,
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
        templateData: createTemplateData({
          title: 'Notfallpass aus Template',
          panels: createMinimalPanels(
            ['Alex'],
            [SYMPTOMS_TEXT],
            [MEDICATION_BULLET],
          ),
        }),
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
        templateData: createTemplateData({
          title: '',
          contacts: [],
          diagnosesSummary: '—',
          symptoms: '—',
          medications: [],
          allergies: '—',
          panels: createMinimalPanels(['—'], ['—'], ['—']),
          doctorRows: [['Telefon', '—']],
        }),
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
        templateData: createTemplateData({
          contacts: [{ name: '—', phone: '—', relation: '—' }],
          diagnosesSummary: '—',
          symptoms: '—',
          medications: [{ name: 'Rx', dosage: '—', schedule: '—' }],
          allergies: '—',
          panels: createMinimalPanels(['—'], ['—'], ['Rx']),
          doctorRows: [['Telefon', '—']],
        }),
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
    }>;

    expect(Children.toArray(element.props.children)).toHaveLength(1);
  });
});
