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

  it('builds localized template data with person, diagnoses, and doctor sections', () => {
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
    expect(templateData?.personRows).toEqual([
      ['Vorname', 'Mara Muster'],
      ['Geburtsdatum', '12-04-1990'],
    ]);
    expect(templateData?.diagnosesSummary).toBe('ME/CFS, POTS');
    expect(templateData?.diagnosisParagraphs).toHaveLength(2);
    expect(templateData?.doctorRows).toEqual([
      ['Praxis / Ärztin / Arzt', PRACTICE_NAME],
      ['Telefon', '+49 30 987654'],
    ]);
    expect(templateData?.foldHint).toBe(
      'Für das Brieftaschenformat einmal waagerecht und einmal senkrecht falten.',
    );
    expect(templateData?.panels.map((panel) => panel.title)).toEqual([
      'Person & Diagnose',
      'Kontakte & Praxis',
      'Symptome & Allergien',
      'Medikamente & Hinweise',
    ]);
  });

  it('falls back to compact diagnosis labels and placeholder values', () => {
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
    expect(templateData?.doctorRows).toEqual([
      ['Practice / physician', '—'],
      ['Phone', '—'],
    ]);
    expect(model.sections[1].blocks[0]).toEqual({
      type: 'bullets',
      items: ['—'],
    });
  });

  it('keeps relation-only contacts, omits empty diagnosis paragraphs, and falls back for missing diagnoses', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        contacts: [{ relation: 'Nachbarin' }],
        medications: [{ name: 'Bedarfsmedikament' }],
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const templateData = model.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(templateData?.contacts).toEqual([
      {
        name: 'Nachbarin',
        phone: '—',
        relation: 'Nachbarin',
      },
    ]);
    expect(templateData?.diagnosesSummary).toBe('—');
    expect(templateData?.diagnosisParagraphs).toEqual([]);
    expect(model.sections[2].blocks).toEqual([
      {
        type: 'paragraph',
        text: '—',
      },
    ]);
    expect(model.sections[4].blocks).toEqual([
      {
        type: 'bullets',
        items: ['Bedarfsmedikament'],
      },
    ]);
  });

  it('handles empty diagnosis objects and phone-only contacts without paragraph fallbacks', () => {
    const model = buildNotfallpassPdfDocumentModel({
      formData: {
        contacts: [{ phone: CONTACT_PHONE }],
        diagnoses: {},
      },
      locale: 'de',
      exportedAt: new Date(EXPORTED_AT_ISO),
    });
    const templateData = model.meta?.templateData as
      | NotfallpassPdfTemplateData
      | undefined;

    expect(templateData?.diagnosesSummary).toBe('—');
    expect(templateData?.diagnosisParagraphs).toEqual([]);
    expect(templateData?.contacts).toEqual([
      {
        name: '—',
        phone: CONTACT_PHONE,
        relation: '—',
      },
    ]);
    expect(model.sections[1].blocks).toEqual([
      {
        type: 'bullets',
        items: [CONTACT_PHONE],
      },
    ]);
  });

  it('builds fallback diagnosis labels for non-ME/CFS companion diagnoses', () => {
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
  });
});
