import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import deTranslations from '../../public/formpacks/notfallpass/i18n/de.json';
import enTranslations from '../../public/formpacks/notfallpass/i18n/en.json';
import {
  buildNotfallpassPdfDocumentModel,
  type NotfallpassPdfTemplateData,
} from '../../src/formpacks/notfallpass/export/pdfDocumentModel';

const namespace = 'formpack:notfallpass';
const EXPORTED_AT_ISO = '2026-03-12T09:00:00.000Z';
const PRACTICE_NAME = 'Praxis Beispiel';
const CONTACT_PHONE = '+49 30 1234';

describe('buildNotfallpassPdfDocumentModel', () => {
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

  it('builds two four-panel pages for the foldable emergency pass layout', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        person: {
          firstName: 'Mara',
          lastName: 'Muster',
          birthDate: '1990-04-12',
        },
        contacts: [{ name: 'Alex', phone: CONTACT_PHONE, relation: 'Partner' }],
        diagnoses: { meCfs: true, pots: true, formatted: 'ME/CFS, POTS' },
        symptoms: 'Starke Erschöpfung',
        medications: [
          { name: 'Elektrolytlösung', dosage: '500 ml', schedule: 'Täglich' },
        ],
        allergies: 'Keine bekannt',
        doctor: { name: PRACTICE_NAME, phone: '+49 30 987654' },
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const templateData = model.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(model.title).toBe('Notfallpass');
    expect(model.meta?.createdAtIso).toBe(EXPORTED_AT_ISO);
    expect(model.sections).toHaveLength(7);
    expect(templateData?.foldHint).toBe(
      'Beidseitig drucken, an der kurzen Kante wenden und ziehharmonikaartig falten.',
    );
    expect(templateData?.personRows).toEqual([
      ['Vorname', 'Mara Muster'],
      ['Geburtsdatum', '12-04-1990'],
    ]);
    expect(templateData?.doctorRows).toEqual([
      ['Praxis / Ärztin / Arzt', PRACTICE_NAME],
      ['Telefon', '+49 30 987654'],
    ]);
    expect(templateData?.pages).toHaveLength(2);
    expect(templateData?.pages[0].panels.map((panel) => panel.title)).toEqual([
      'Notfallpass',
      'Diagnosen',
      'Symptome',
      'Medikamente',
    ]);
    expect(templateData?.pages[1].panels.map((panel) => panel.title)).toEqual([
      'Notfallkontakt',
      'Praxis',
      'Allergien',
      'Wichtige Hinweise',
    ]);
    expect(
      templateData?.pages[1].panels[3].sections[0].type === 'paragraphs'
        ? templateData.pages[1].panels[3].sections[0].paragraphs
        : [],
    ).toHaveLength(2);
  });

  it('falls back to placeholders for sparse data and keeps each panel populated', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        diagnoses: { meCfs: true, longCovid: true },
      },
      locale: 'en',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const templateData = model.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(templateData?.diagnosesSummary).toBe('ME/CFS, Long Covid');
    expect(templateData?.personRows).toEqual([
      ['First name', '—'],
      ['Date of birth', '—'],
    ]);
    expect(templateData?.pages[0].panels[2].sections[0]).toEqual({
      heading: 'Symptoms',
      type: 'paragraphs',
      paragraphs: ['—'],
    });
    expect(templateData?.pages[1].panels[0].sections[0]).toEqual({
      heading: 'Emergency contacts',
      type: 'bullets',
      items: ['—'],
    });
  });

  it('keeps relation-only contacts and phone-only contacts visible in the contact panel', () => {
    const relationOnly = buildNotfallpassPdfDocumentModel({
      formData: {
        contacts: [{ relation: 'Nachbarin' }],
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const relationData = relationOnly.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(relationData?.contacts).toEqual([
      {
        name: 'Nachbarin',
        phone: '—',
        relation: 'Nachbarin',
      },
    ]);
    expect(relationData?.pages[1].panels[0].sections[0]).toEqual({
      heading: 'Notfallkontakte',
      type: 'bullets',
      items: ['Nachbarin'],
    });

    const phoneOnly = buildNotfallpassPdfDocumentModel({
      formData: {
        contacts: [{ phone: CONTACT_PHONE }],
        diagnoses: {},
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const phoneData = phoneOnly.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(phoneData?.pages[1].panels[0].sections[0]).toEqual({
      heading: 'Notfallkontakte',
      type: 'bullets',
      items: [CONTACT_PHONE],
    });
  });

  it('uses the diagnosis summary as treatment fallback when no paragraphs exist', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        diagnoses: { pots: true },
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const templateData = model.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(templateData?.diagnosesSummary).toBe('POTS');
    expect(templateData?.diagnosisParagraphs).toEqual([]);
    expect(templateData?.pages[1].panels[3].sections[0]).toEqual({
      heading: 'Behandlungshinweise',
      type: 'paragraphs',
      paragraphs: ['POTS'],
    });
  });
});
