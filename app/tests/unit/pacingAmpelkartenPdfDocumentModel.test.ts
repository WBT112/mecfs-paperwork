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

  it('builds German adult cards with resolved section labels and themed assets', () => {
    const formData = buildPacingAmpelkartenPreset(
      'de',
      'adult',
    ) as unknown as Record<string, unknown>;
    const exportedAt = new Date('2026-03-09T10:00:00.000Z');
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
    expect(model.sections).toHaveLength(4);
    expect(model.sections[0].heading).toBe('Grün - heute geht etwas');
    expect(model.sections[3].heading).toBe('Notizen / individuelle Regeln');
    expect(templateData?.variant).toBe('adult');
    expect(templateData?.cards[0].animalLabel).toBe('Faultier');
    expect(templateData?.cards[0].imageSrc).toMatch(/^data:image\/png;base64,/);
    expect(templateData?.cards[0].sectionLabelColor).toBe('#245a35');
    expect(templateData?.cards[0].sections[0].label).toBe(
      'Was heute möglich ist',
    );
    expect(templateData?.cards[0].sections[0].items[0]).toContain(
      'Kurze Gespräche sind möglich',
    );
  });

  it('builds English child cards with localized titles and animal labels', () => {
    const formData = buildPacingAmpelkartenPreset(
      'en',
      'child',
    ) as unknown as Record<string, unknown>;
    delete (formData.notes as { title?: unknown }).title;

    const model = buildPacingAmpelkartenPdfDocumentModel({
      formData,
      locale: 'en',
      exportedAt: new Date('2026-03-09T10:00:00.000Z'),
    });
    const templateData = model.meta?.templateData as
      | PacingAmpelkartenPdfTemplateData
      | undefined;

    expect(templateData?.variant).toBe('child');
    expect(templateData?.cards[0].title).toContain('good day');
    expect(templateData?.cards[0].animalLabel).toBe('Sloth');
    expect(templateData?.cards[2].animalLabel).toBe('Lion');
    expect(templateData?.cards[1].imageAlt).toBe(
      'Panda card with a careful yellow background',
    );
    expect(templateData?.notes.title).toBe('Title for the notes block');
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
              visitRules: [],
              stimuli: [],
              hint: 17,
              thanks: null,
            },
            yellow: {
              canDo: [],
              needHelp: [],
              visitRules: [],
              stimuli: [],
              hint: '',
              thanks: '',
            },
            red: {},
          },
        },
        notes: {
          title: '  Custom notes  ',
          items: 'invalid',
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
    expect(templateData?.cards[0].thanks).toBe('');
    expect(templateData?.notes.title).toBe('Custom notes');
    expect(templateData?.notes.items).toEqual([]);
    expect(templateData?.signature).toBe('');
    expect(model.sections[0].blocks).toEqual([
      {
        type: 'paragraph',
        text: 'Sloth',
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
    expect(model.sections[3].blocks).toEqual([]);
  });
});
