import { Children, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import i18n from '../../../src/i18n';
import type { DocumentModel } from '../../../src/export/pdf/types';
import PacingAmpelkartenPdfDocument from '../../../src/export/pdf/templates/PacingAmpelkartenPdfDocument';
import { buildPacingAmpelkartenPreset } from '../../../src/formpacks/pacing-ampelkarten/presets';
import { buildPacingAmpelkartenPdfDocumentModel } from '../../../src/formpacks/pacing-ampelkarten/export/pdfDocumentModel';
import deTranslations from '../../../public/formpacks/pacing-ampelkarten/i18n/de.json';
import enTranslations from '../../../public/formpacks/pacing-ampelkarten/i18n/en.json';

const namespace = 'formpack:pacing-ampelkarten';
const EXPORTED_AT_ISO = '2026-03-09T10:00:00.000Z';
const DEFAULT_TITLE = 'Pacing-Ampelkarten';
const HELP_TEXT_LABEL = 'Hint';
const THANKS_TEXT_LABEL = 'Thanks';
const IMAGE_SRC = '/formpacks/pacing-ampelkarten/assets/card-green-sloth.png';

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
  hintLabel: string;
  hint: string;
  thanksLabel: string;
  thanks: string;
  sections: Array<{
    id: 'canDo' | 'needHelp' | 'visitRules' | 'stimuli';
    label: string;
    items: string[];
  }>;
};

const getPages = (
  element: ReactElement<{ children?: ReactNode }>,
): PageElement[] => Children.toArray(element.props.children) as PageElement[];

const getElementChildren = (
  element: ReactElement<{ children?: ReactNode }>,
): ReactElement[] =>
  Children.toArray(element.props.children).filter(
    (child): child is ReactElement => typeof child !== 'string',
  );

const collectRenderedText = (node: ReactNode): string[] => {
  if (typeof node === 'string') {
    return [node];
  }

  if (
    typeof node === 'number' ||
    node === null ||
    node === undefined ||
    typeof node === 'boolean'
  ) {
    return [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((child) => collectRenderedText(child));
  }

  if (isValidElement(node)) {
    return collectRenderedText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }

  return [];
};

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

  it('renders a two-page German document for populated pacing cards', () => {
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
    expect(pages).toHaveLength(2);
    expect(collectRenderedText(pages[0])).not.toContain(DEFAULT_TITLE);
    expect(collectRenderedText(pages[1])).not.toContain(DEFAULT_TITLE);

    const firstPageChildren = getElementChildren(
      pages[0] as ReactElement<{ children?: ReactNode }>,
    );
    const secondPageChildren = getElementChildren(
      pages[1] as ReactElement<{ children?: ReactNode }>,
    );
    const firstPageBody = firstPageChildren[1] as ReactElement<{
      children?: ReactNode;
    }>;
    const secondPageBody = secondPageChildren[1] as ReactElement<{
      children?: ReactNode;
    }>;

    expect(firstPageChildren).toHaveLength(2);
    expect(secondPageChildren).toHaveLength(2);
    expect(getElementChildren(firstPageBody)).toHaveLength(3);
    expect(getElementChildren(secondPageBody)).toHaveLength(3);
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
    expect(pages).toHaveLength(2);
  });

  it('uses child-specific fallbacks for empty template content', () => {
    const model: DocumentModel = {
      title: '   ',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'en',
        templateData: {
          locale: 'en',
          createdAtIso: EXPORTED_AT_ISO,
          variant: 'child',
          cutLineLabel: 'Cut here',
          signatureLabel: 'Signed by',
          signature: '',
          cards: [
            {
              color: 'green',
              title: '',
              animalLabel: 'Sloth',
              imageAlt: 'Sloth card',
              imageSrc: IMAGE_SRC,
              accentColor: '#2b6a3e',
              borderColor: '#76b27f',
              surfaceColor: '#f1f8ef',
              titleColor: '#183524',
              sectionLabelColor: '#245a35',
              hintLabel: HELP_TEXT_LABEL,
              hint: '',
              thanksLabel: THANKS_TEXT_LABEL,
              thanks: '',
              sections: [
                { id: 'canDo', label: 'Can do', items: [] },
                { id: 'needHelp', label: 'Need help', items: [] },
                { id: 'visitRules', label: 'Visits', items: [] },
                { id: 'stimuli', label: 'Stimuli', items: [] },
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
              hintLabel: HELP_TEXT_LABEL,
              hint: '',
              thanksLabel: THANKS_TEXT_LABEL,
              thanks: '',
              sections: [],
            },
            {
              color: 'red',
              title: '',
              animalLabel: 'Lion',
              imageAlt: 'Lion card',
              imageSrc: IMAGE_SRC,
              accentColor: '#a5472a',
              borderColor: '#d47a59',
              surfaceColor: '#fff1ea',
              titleColor: '#5d2618',
              sectionLabelColor: '#943a23',
              hintLabel: HELP_TEXT_LABEL,
              hint: '',
              thanksLabel: THANKS_TEXT_LABEL,
              thanks: '',
              sections: [],
            },
          ] as [PacingTemplateCard, PacingTemplateCard, PacingTemplateCard],
          notes: {
            title: '',
            items: [],
          },
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
  });

  it('falls back to the notes title when the red-card bookmark is empty', () => {
    const baseCard = {
      animalLabel: 'Sloth',
      imageAlt: 'Sloth card',
      imageSrc: IMAGE_SRC,
      accentColor: '#2b6a3e',
      borderColor: '#76b27f',
      surfaceColor: '#f1f8ef',
      titleColor: '#183524',
      sectionLabelColor: '#245a35',
      hintLabel: HELP_TEXT_LABEL,
      hint: '',
      thanksLabel: THANKS_TEXT_LABEL,
      thanks: '',
      sections: [],
    };
    const model: DocumentModel = {
      title: 'Pacing cards',
      meta: {
        createdAtIso: EXPORTED_AT_ISO,
        locale: 'de',
        templateData: {
          locale: 'de',
          createdAtIso: EXPORTED_AT_ISO,
          variant: 'adult',
          cutLineLabel: 'Schneiden',
          signatureLabel: 'Unterschrift',
          signature: '',
          cards: [
            {
              color: 'green',
              title: 'Green',
              ...baseCard,
            },
            {
              color: 'yellow',
              title: 'Yellow',
              ...baseCard,
            },
            {
              color: 'red',
              title: '',
              ...baseCard,
            },
          ] as [PacingTemplateCard, PacingTemplateCard, PacingTemplateCard],
          notes: {
            title: 'My notes',
            items: [],
          },
        },
      },
      sections: [],
    };

    const element = PacingAmpelkartenPdfDocument({ model }) as ReactElement<{
      children?: ReactElement[];
    }>;
    const pages = getPages(element);

    expect(pages[1].props.bookmark).toBe('My notes');
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
