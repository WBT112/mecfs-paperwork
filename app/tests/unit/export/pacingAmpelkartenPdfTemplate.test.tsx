import { Children, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import i18n from '../../../src/i18n';
import type { DocumentModel } from '../../../src/export/pdf/types';
import PacingAmpelkartenPdfDocument from '../../../src/export/pdf/templates/PacingAmpelkartenPdfDocument';
import { buildPacingAmpelkartenPreset } from '../../../src/formpacks/pacing-ampelkarten/presets';
import { buildPacingAmpelkartenPdfDocumentModel } from '../../../src/formpacks/pacing-ampelkarten/export/pdfDocumentModel';
import deTranslations from '../../../public/formpacks/pacing-ampelkarten/i18n/de.json';
import enTranslations from '../../../public/formpacks/pacing-ampelkarten/i18n/en.json';
import { collectRenderedText } from './pdfRenderedText';

const namespace = 'formpack:pacing-ampelkarten';
const EXPORTED_AT_ISO = '2026-03-09T10:00:00.000Z';
const DEFAULT_TITLE = 'Pacing-Ampelkarten';
const IMAGE_SRC = '/formpacks/pacing-ampelkarten/assets/card-green-sloth.png';
const SIGNATURE_LABEL = 'Unterschrift / Abschlusszeile';
const REASSURANCE = 'Weniger Kontakt ist nichts Persönliches.';
const SIGNATURE_TEXT = 'Liebe Grüße';

type PageElement = ReactElement<{ bookmark?: string; children?: ReactNode }>;

type PacingTemplateCard = {
  color: 'green' | 'yellow' | 'red';
  title: string;
  animalLabel: string;
  imageAlt: string;
  imageSrc: string;
  accentColor: string;
  borderColor: string;
  surfaceColor: string;
  titleColor: string;
  sectionLabelColor: string;
  hint: string;
  sections: Array<{
    id: 'canDo' | 'needHelp';
    label: string;
    items: string[];
  }>;
};

const buildTemplateCards = (
  overrides?: Partial<
    Record<'green' | 'yellow' | 'red', Partial<PacingTemplateCard>>
  >,
): [PacingTemplateCard, PacingTemplateCard, PacingTemplateCard] => [
  {
    color: 'green',
    title: 'Gruen',
    animalLabel: 'Loewe',
    imageAlt: 'Bild',
    imageSrc: IMAGE_SRC,
    accentColor: '#76b27f',
    borderColor: '#76b27f',
    surfaceColor: '#f1f8ef',
    titleColor: '#183524',
    sectionLabelColor: '#245a35',
    hint: '',
    sections: [],
    ...overrides?.green,
  },
  {
    color: 'yellow',
    title: 'Gelb',
    animalLabel: 'Panda',
    imageAlt: 'Bild',
    imageSrc: IMAGE_SRC,
    accentColor: '#d1a238',
    borderColor: '#d1a238',
    surfaceColor: '#fff7e3',
    titleColor: '#5a3e00',
    sectionLabelColor: '#8f5f00',
    hint: '',
    sections: [],
    ...overrides?.yellow,
  },
  {
    color: 'red',
    title: 'Rot',
    animalLabel: 'Faultier',
    imageAlt: 'Bild',
    imageSrc: IMAGE_SRC,
    accentColor: '#d47a59',
    borderColor: '#d47a59',
    surfaceColor: '#fff1ea',
    titleColor: '#5d2618',
    sectionLabelColor: '#943a23',
    hint: '',
    sections: [],
    ...overrides?.red,
  },
];

const getPages = (
  element: ReactElement<{ children?: ReactNode }>,
): PageElement[] => Children.toArray(element.props.children) as PageElement[];

const getPageCard = (
  page: PageElement,
): ReactElement<{
  wrap?: boolean;
  style?: Array<Record<string, unknown>> | Record<string, unknown>;
}> =>
  Children.toArray(page.props.children)[1] as ReactElement<{
    wrap?: boolean;
    style?: Array<Record<string, unknown>> | Record<string, unknown>;
  }>;

describe('PacingAmpelkartenPdfDocument', () => {
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

  it('renders a three-page German document with one card per page', () => {
    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData: buildPacingAmpelkartenPreset(
        'de',
        'adult',
      ) as unknown as Record<string, unknown>,
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });

    const element = PacingAmpelkartenPdfDocument({
      model,
    }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
      subject?: string;
    }>;
    const pages = getPages(element);

    expect(element.props.language).toBe('de-DE');
    expect(element.props.title).toBe(DEFAULT_TITLE);
    expect(pages).toHaveLength(3);
    expect(collectRenderedText(pages[0])).not.toContain(DEFAULT_TITLE);
    expect(collectRenderedText(pages[1])).not.toContain(DEFAULT_TITLE);
    expect(collectRenderedText(pages[2])).not.toContain(DEFAULT_TITLE);
    expect(pages[0].props.bookmark).toBe('Heute ist ein guter Tag');
    expect(pages[1].props.bookmark).toBe('Heute ist ein vorsichtiger Tag');
    expect(pages[2].props.bookmark).toBe('Heute ist ein schwerer Tag');

    const firstCard = getPageCard(pages[0]);
    expect(firstCard.props.wrap).toBe(false);
    expect(firstCard.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          width: '100%',
        }),
      ]),
    );
    expect(firstCard.props.style).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          flexGrow: 1,
        }),
      ]),
    );
  });

  it('keeps rendering with empty fallback data', () => {
    const model: DocumentModel = {
      title: 'Pacing signal cards',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'en',
      },
      sections: [],
    };

    const element = PacingAmpelkartenPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
      subject?: string;
    }>;
    const pages = getPages(element);

    expect(element.props.language).toBe('en-US');
    expect(element.props.subject).toBe('Pacing signal cards');
    expect(pages).toHaveLength(3);
  });

  it('renders the signature inside the card instead of below it', () => {
    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData: {
        ...buildPacingAmpelkartenPreset('de', 'adult'),
        sender: { signature: SIGNATURE_TEXT },
      } as unknown as Record<string, unknown>,
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });

    const element = PacingAmpelkartenPdfDocument({
      model,
    }) as ReactElement<{
      children?: ReactElement[];
    }>;
    const pages = getPages(element);
    const firstPageChildren = Children.toArray(pages[0].props.children);

    expect(firstPageChildren).toHaveLength(2);
    const firstPageText = collectRenderedText(pages[0]);

    expect(firstPageText).toContain(REASSURANCE);
    expect(firstPageText).toContain(SIGNATURE_TEXT);
    expect(firstPageText.indexOf(REASSURANCE)).toBeLessThan(
      firstPageText.indexOf(SIGNATURE_TEXT),
    );
  });

  it('uses title fallbacks for empty template content', () => {
    const model: DocumentModel = {
      title: '   ',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'en',
        templateData: {
          locale: 'en',
          createdAtIso: EXPORTED_AT_ISO,
          variant: 'child',
          reassurance: 'Less contact is not personal.',
          signatureLabel: 'Signed by',
          signature: '',
          cards: [
            {
              color: 'green',
              title: '',
              animalLabel: 'Lion',
              imageAlt: 'Lion card',
              imageSrc: IMAGE_SRC,
              accentColor: '#2b6a3e',
              borderColor: '#76b27f',
              surfaceColor: '#f1f8ef',
              titleColor: '#183524',
              sectionLabelColor: '#245a35',
              hint: '',
              sections: [
                { id: 'canDo', label: 'Can do', items: [] },
                { id: 'needHelp', label: 'Need help', items: [] },
              ],
            },
            {
              color: 'yellow',
              title: '',
              animalLabel: 'Panda',
              imageAlt: 'Panda card',
              imageSrc: IMAGE_SRC,
              accentColor: '#9b6a00',
              borderColor: '#d1a238',
              surfaceColor: '#fff7e3',
              titleColor: '#5a3e00',
              sectionLabelColor: '#8f5f00',
              hint: '',
              sections: [],
            },
            {
              color: 'red',
              title: '',
              animalLabel: 'Sloth',
              imageAlt: 'Sloth card',
              imageSrc: IMAGE_SRC,
              accentColor: '#a5472a',
              borderColor: '#d47a59',
              surfaceColor: '#fff1ea',
              titleColor: '#5d2618',
              sectionLabelColor: '#943a23',
              hint: '',
              sections: [],
            },
          ] as [PacingTemplateCard, PacingTemplateCard, PacingTemplateCard],
        },
      },
      sections: [],
    };

    const element = PacingAmpelkartenPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
      language?: string;
      title?: string;
      subject?: string;
    }>;
    const pages = getPages(element);

    expect(element.props.language).toBe('en-US');
    expect(element.props.title).toBe(DEFAULT_TITLE);
    expect(pages[0].props.bookmark).toBe(DEFAULT_TITLE);
    expect(pages[1].props.bookmark).toBe(DEFAULT_TITLE);
    expect(pages[2].props.bookmark).toBe(DEFAULT_TITLE);
  });

  it('renders hint text without prefixing the localized hint label', () => {
    const model: DocumentModel = {
      title: DEFAULT_TITLE,
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: {
          locale: 'de',
          createdAtIso: EXPORTED_AT_ISO,
          variant: 'adult',
          signatureLabel: SIGNATURE_LABEL,
          signature: '',
          cards: buildTemplateCards({
            green: {
              hint: 'Bitte heute langsam.',
            },
          }),
        },
      },
      sections: [],
    };

    const element = PacingAmpelkartenPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
    }>;
    const text = collectRenderedText(getPages(element)[0]);

    expect(text).toContain('Bitte heute langsam.');
    expect(text).not.toContain('Freundlicher Hinweis: Bitte heute langsam.');
  });

  it('renders signature text without prefixing the localized signature label', () => {
    const model: DocumentModel = {
      title: DEFAULT_TITLE,
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: {
          locale: 'de',
          createdAtIso: EXPORTED_AT_ISO,
          variant: 'adult',
          signatureLabel: SIGNATURE_LABEL,
          signature: 'Max Mustermann',
          cards: buildTemplateCards(),
        },
      },
      sections: [],
    };

    const element = PacingAmpelkartenPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
    }>;
    const text = collectRenderedText(getPages(element)[0]);

    expect(text).toContain('Max Mustermann');
    expect(text).not.toContain(`${SIGNATURE_LABEL}: Max Mustermann`);
  });

  it('defaults the PDF language to German when metadata is missing', () => {
    const model: DocumentModel = {
      title: 'Pacing cards',
      sections: [],
    };

    const element = PacingAmpelkartenPdfDocument({ model }) as ReactElement<{
      language?: string;
    }>;

    expect(element.props.language).toBe('de-DE');
  });
});
