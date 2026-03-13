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
const DEFAULT_TITLE = 'Notfallpass';
const DEFAULT_SUBTITLE = 'Wichtige Gesundheitsinformationen für den Notfall.';
const FOLD_HINT =
  'Beidseitig drucken, an der kurzen Kante wenden und ziehharmonikaartig falten.';
const namespace = 'formpack:notfallpass';
const MEDICATION_BULLET = 'Elektrolytlösung · Täglich';
const SYMPTOMS_TEXT = 'Starke Erschöpfung';
const ALLERGIES_TEXT = 'Keine bekannt';
const TREATMENT_TITLE = 'Wichtige Hinweise';
const TREATMENT_TEXT = 'Reizarm behandeln.';

const createTemplateData = (
  overrides: Partial<NotfallpassPdfTemplateData> = {},
): NotfallpassPdfTemplateData => ({
  createdAtIso: EXPORTED_AT_ISO,
  locale: 'de',
  title: DEFAULT_TITLE,
  subtitle: DEFAULT_SUBTITLE,
  foldHint: FOLD_HINT,
  personHeading: 'Person',
  personRows: [['Vorname', PERSON_NAME]],
  contactsHeading: 'Notfallkontakte',
  contacts: [{ name: 'Alex', phone: '123', relation: 'Partner' }],
  diagnosesHeading: 'Diagnosen',
  diagnosesSummary: 'ME/CFS',
  diagnosisParagraphs: [TREATMENT_TEXT],
  symptomsHeading: 'Symptome',
  symptoms: SYMPTOMS_TEXT,
  medicationsHeading: 'Medikamente',
  medications: [{ name: 'Elektrolytlösung', dosage: '—', schedule: 'Täglich' }],
  allergiesHeading: 'Allergien',
  allergies: ALLERGIES_TEXT,
  doctorHeading: 'Praxis',
  doctorRows: [['Telefon', '123']],
  pages: [
    {
      panels: [
        {
          title: 'Notfallpass',
          subtitle: DEFAULT_SUBTITLE,
          isCover: true,
          sections: [
            {
              heading: 'Person',
              type: 'rows',
              rows: [['Vorname', PERSON_NAME]],
            },
          ],
        },
        {
          title: 'Diagnosen',
          sections: [
            {
              heading: 'Diagnosen',
              type: 'paragraphs',
              paragraphs: ['ME/CFS'],
            },
          ],
        },
        {
          title: 'Symptome',
          sections: [
            {
              heading: 'Symptome',
              type: 'paragraphs',
              paragraphs: [SYMPTOMS_TEXT],
            },
          ],
        },
        {
          title: 'Medikamente',
          sections: [
            {
              heading: 'Medikamente',
              type: 'bullets',
              items: [MEDICATION_BULLET],
            },
          ],
        },
      ],
    },
    {
      panels: [
        {
          title: 'Notfallkontakt',
          sections: [
            {
              heading: 'Notfallkontakte',
              type: 'bullets',
              items: ['Alex · 123'],
            },
          ],
        },
        {
          title: 'Praxis',
          sections: [
            {
              heading: 'Praxis',
              type: 'rows',
              rows: [['Telefon', '123']],
            },
          ],
        },
        {
          title: 'Allergien',
          sections: [
            {
              heading: 'Allergien',
              type: 'paragraphs',
              paragraphs: [ALLERGIES_TEXT],
            },
          ],
        },
        {
          title: TREATMENT_TITLE,
          sections: [
            {
              heading: 'Behandlungshinweise',
              type: 'paragraphs',
              paragraphs: [TREATMENT_TEXT],
            },
          ],
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

  it('renders two landscape pages with four fold panels each', () => {
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
        medications: [{ name: 'Elektrolytlösung', dosage: '500 ml' }],
        allergies: ALLERGIES_TEXT,
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

    expect(element.props.language).toBe('de-DE');
    expect(element.props.title).toBe(DEFAULT_TITLE);
    expect(pages).toHaveLength(2);
    expect(
      pages.map(
        (page) =>
          (page as ReactElement<{ orientation?: string }>).props.orientation,
      ),
    ).toEqual(['landscape', 'landscape']);
    expect(collectRenderedText(pages[0] as ReactNode)).toEqual(
      expect.arrayContaining([
        DEFAULT_TITLE,
        DEFAULT_SUBTITLE,
        FOLD_HINT,
        PERSON_NAME,
        'Diagnosen',
        'Symptome',
        'Medikamente',
      ]),
    );
    expect(collectRenderedText(pages[1] as ReactNode)).toEqual(
      expect.arrayContaining([
        'Notfallkontakt',
        'Praxis',
        'Allergien',
        TREATMENT_TITLE,
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
    expect(collectRenderedText(pages[0] as ReactNode).join(' ')).toContain(
      'Emergency pass',
    );
  });

  it('uses template data title when the document title is blank', () => {
    const model: DocumentModel = {
      title: '   ',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: createTemplateData({
          title: 'Pass aus Template',
        }),
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      title?: string;
      language?: string;
    }>;

    expect(element.props.title).toBe('Pass aus Template');
    expect(element.props.language).toBe('de-DE');
  });

  it('falls back to default locale and hardcoded title when metadata is absent', () => {
    const model: DocumentModel = {
      title: ' ',
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      title?: string;
      language?: string;
      children?: ReactElement[];
    }>;
    const pages = Children.toArray(element.props.children);

    expect(element.props.title).toBe(DEFAULT_TITLE);
    expect(element.props.language).toBe('de-DE');
    expect(collectRenderedText(pages[0] as ReactNode).join(' ')).toContain(
      DEFAULT_TITLE,
    );
  });

  it('renders every panel from template data in order', () => {
    const model: DocumentModel = {
      title: DEFAULT_TITLE,
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: createTemplateData(),
      },
      sections: [],
    };

    const element = NotfallpassPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
    }>;
    const pages = Children.toArray(element.props.children);
    const rendered = pages.flatMap((page) =>
      collectRenderedText(page as ReactNode),
    );

    expect(rendered).toEqual(
      expect.arrayContaining([
        'Notfallpass',
        'Diagnosen',
        'Symptome',
        'Medikamente',
        'Notfallkontakt',
        'Praxis',
        'Allergien',
        TREATMENT_TITLE,
        MEDICATION_BULLET,
      ]),
    );
  });
});
