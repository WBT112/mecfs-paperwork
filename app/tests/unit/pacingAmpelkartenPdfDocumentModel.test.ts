import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import deTranslations from '../../public/formpacks/pacing-ampelkarten/i18n/de.json';
import enTranslations from '../../public/formpacks/pacing-ampelkarten/i18n/en.json';
import { buildPacingAmpelkartenPreset } from '../../src/formpacks/pacing-ampelkarten/presets';
import {
  buildPacingAmpelkartenPdfDocumentModel,
  type PacingAmpelkartenPdfTemplateData,
} from '../../src/formpacks/pacing-ampelkarten/export/pdfDocumentModel';

const namespace = 'formpack:pacing-ampelkarten';
const KEPT_ITEM = 'Keep one short item';
const SIGNATURE_LABEL = 'Unterschrift / Abschlusszeile';
const REASSURANCE = 'Weniger Kontakt ist nichts Persönliches.';
const EXPORTED_AT_ISO = '2026-03-09T10:00:00.000Z';

describe('buildPacingAmpelkartenPdfDocumentModel', () => {
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

  it('builds three localized card sections with themed assets', () => {
    const formData = buildPacingAmpelkartenPreset(
      'de',
      'adult',
    ) as unknown as Record<string, unknown>;
    const exportedAt = new Date(EXPORTED_AT_ISO);
    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData,
      locale: 'de',
      exportedAt,
    });
    const templateData = model.meta?.templateData as
      | PacingAmpelkartenPdfTemplateData
      | undefined;

    expect(model.title).toBe('Pacing-Ampelkarten');
    expect(model.meta?.createdAtIso).toBe(exportedAt.toISOString());
    expect(model.sections).toHaveLength(3);
    expect(model.sections[0].heading).toBe('Heute ist ein guter Tag');
    expect(model.sections[2].heading).toBe('Heute ist ein schwerer Tag');
    expect(templateData?.variant).toBe('adult');
    expect(templateData?.cards[0].animalLabel).toBe('Löwe');
    expect(templateData?.cards[0].imageSrc).toMatch(/^data:image\/png;base64,/);
    expect(templateData?.cards[0].sectionLabelColor).toBe('#245a35');
    expect(templateData?.cards[0].sections).toHaveLength(2);
    expect(templateData?.cards[0].sections[0].label).toBe(
      'Was heute möglich ist',
    );
    expect(templateData?.signatureLabel).toBe(SIGNATURE_LABEL);
    expect(templateData?.reassurance).toBe(REASSURANCE);
    expect(templateData?.cards[0]).not.toHaveProperty('hintLabel');
  });

  it('builds English child cards with localized titles and animal labels', () => {
    const formData = buildPacingAmpelkartenPreset(
      'en',
      'child',
    ) as unknown as Record<string, unknown>;

    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData,
      locale: 'en',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const templateData = model.meta?.templateData as
      | PacingAmpelkartenPdfTemplateData
      | undefined;

    expect(templateData?.variant).toBe('child');
    expect(templateData?.cards[0].title).toBe('Today is a good day');
    expect(templateData?.cards[0].animalLabel).toBe('Lion');
    expect(templateData?.cards[2].animalLabel).toBe('Sloth');
    expect(templateData?.cards[1].imageAlt).toBe(
      'Panda card with a careful yellow background',
    );
  });

  it('keeps the signature text without prefixing the localized label', () => {
    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData: {
        ...buildPacingAmpelkartenPreset('de', 'adult'),
        sender: {
          signature: 'Liebe Grüße',
        },
      } as unknown as Record<string, unknown>,
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });

    expect(model.sections[0].blocks.at(-2)).toEqual({
      type: 'paragraph',
      text: REASSURANCE,
    });
    expect(model.sections[0].blocks.at(-1)).toEqual({
      type: 'paragraph',
      text: 'Liebe Grüße',
    });
  });

  it('falls back safely for sparse adult data and omits empty blocks', () => {
    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData: {
        meta: {
          variant: 'unexpected',
        },
        adult: {
          cards: {
            green: {
              canDo: [`  ${KEPT_ITEM}  `, 42, ''],
              needHelp: 'invalid',
              hint: 17,
            },
            yellow: {
              canDo: [],
              needHelp: [],
              hint: '',
            },
            red: {},
          },
        },
        sender: {
          signature: 7,
        },
      } as unknown as Record<string, unknown>,
      locale: 'en',
      exportedAt: new Date('2026-03-09T11:00:00.000Z'),
    });
    const templateData = model.meta?.templateData as
      | PacingAmpelkartenPdfTemplateData
      | undefined;

    expect(templateData?.variant).toBe('adult');
    expect(templateData?.cards[0].sections[0].items).toEqual([KEPT_ITEM]);
    expect(templateData?.cards[0].hint).toBe('');
    expect(templateData?.signature).toBe('');
    expect(model.sections[0].heading).toBe('Today is a good day');
    expect(model.sections[0].blocks).toEqual([
      {
        type: 'paragraph',
        text: 'Lion',
      },
      {
        type: 'paragraph',
        text: 'What is possible today',
      },
      {
        type: 'bullets',
        items: [KEPT_ITEM],
      },
    ]);
    expect(model.sections[2].heading).toBe('Today is a difficult day');
    expect(model.sections[2].blocks).toEqual([
      {
        type: 'paragraph',
        text: 'Sloth',
      },
    ]);
  });
});
