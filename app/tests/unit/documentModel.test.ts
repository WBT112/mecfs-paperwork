import { describe, it, expect, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/notfallpass/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/notfallpass/i18n/en.json';
import deOfflabelTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/de.json';
import enOfflabelTranslationsJson from '../../public/formpacks/offlabel-antrag/i18n/en.json';
import { buildDocumentModel } from '../../src/formpacks/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const deOfflabelTranslations = deOfflabelTranslationsJson as Record<
  string,
  string
>;
const enOfflabelTranslations = enOfflabelTranslationsJson as Record<
  string,
  string
>;
const notfallpassNamespace = 'formpack:notfallpass';
const offlabelNamespace = 'formpack:offlabel-antrag';
const ME_CFS_PARAGRAPH_KEY = 'notfallpass.export.diagnoses.meCfs.paragraph';

const interpolate = (
  template: string,
  options: Record<string, unknown> = {},
): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(options[key] ?? ''),
  );

// Mock i18n to provide predictable translations used by buildDocumentModel
vi.mock('../../src/i18n', () => ({
  default: {
    // Return actual translation strings for the requested locale/namespace when available
    getFixedT:
      (locale: string, ns: string) =>
      (key: string, options?: Record<string, unknown>) => {
        const fallback =
          typeof options?.defaultValue === 'string'
            ? options.defaultValue
            : key;
        if (ns === notfallpassNamespace) {
          if (locale === 'en' && key in enTranslations) {
            return interpolate(enTranslations[key], options);
          }
          if (locale === 'de' && key in deTranslations) {
            return interpolate(deTranslations[key], options);
          }
        }
        if (ns === offlabelNamespace) {
          if (locale === 'en' && key in enOfflabelTranslations) {
            return interpolate(enOfflabelTranslations[key], options);
          }
          if (locale === 'de' && key in deOfflabelTranslations) {
            return interpolate(deOfflabelTranslations[key], options);
          }
        }
        return interpolate(fallback, options);
      },
    hasResourceBundle: () => false,
    addResourceBundle: () => undefined,
    changeLanguage: async () => undefined,
  },
}));

describe('formpacks/documentModel', () => {
  it('builds base model when formpackId is null', () => {
    const model = buildDocumentModel(null, 'de', {});
    expect(model.diagnosisParagraphs).toEqual([]);
    expect(model.person).toBeDefined();
  });

  it('builds notfallpass model with diagnosis paragraphs', () => {
    const formData: Record<string, unknown> = {
      person: { name: 'Alice', birthDate: '1980-01-02' },
      diagnoses: { meCfs: true, pots: true, longCovid: false },
      medications: [{ name: 'm1' }],
      contacts: [{ name: 'c1' }],
      doctor: { name: 'Dr', phone: '123' },
      allergies: 'none',
    };

    const model = buildDocumentModel('notfallpass', 'de', formData);
    expect(model.diagnosisParagraphs).toContain(
      deTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
    );
    expect(model.diagnosisParagraphs).toContain(
      deTranslations['notfallpass.export.diagnoses.pots.paragraph'],
    );
    expect(model.person.name).toBe('Alice');
    expect(model.doctor.name).toBe('Dr');
  });

  it('returns ME/CFS paragraph when only ME/CFS is checked', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      diagnoses: { meCfs: true },
    });
    expect(result.diagnosisParagraphs).toEqual([
      enTranslations[ME_CFS_PARAGRAPH_KEY],
    ]);
  });

  it('returns ME/CFS and POTS paragraphs when both are checked', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      diagnoses: { meCfs: true, pots: true },
    });
    expect(result.diagnosisParagraphs).toEqual([
      enTranslations[ME_CFS_PARAGRAPH_KEY],
      enTranslations['notfallpass.export.diagnoses.pots.paragraph'],
    ]);
  });

  it('returns no paragraphs when ME/CFS is false even if POTS is true', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      diagnoses: { meCfs: false, pots: true },
    });
    expect(result.diagnosisParagraphs).toEqual([]);
  });

  it('returns ME/CFS and Long Covid paragraphs when both are checked', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      diagnoses: { meCfs: true, longCovid: true },
    });
    expect(result.diagnosisParagraphs).toEqual([
      enTranslations[ME_CFS_PARAGRAPH_KEY],
      enTranslations['notfallpass.export.diagnoses.longCovid.paragraph'],
    ]);
  });

  it('formats birthDate for display', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      person: { birthDate: '1990-04-12' },
    });
    expect(result.person.birthDate).toBe('12-04-1990');
  });

  it('projects formatted diagnoses into the nested diagnoses object', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      diagnoses: { formatted: 'Example diagnosis' },
    });
    expect(result.diagnoses.formatted).toBe('Example diagnosis');
  });

  it('filters out non-record entries from contacts array', () => {
    const result = buildDocumentModel(null, 'en', {
      contacts: ['not-a-record', 42, null, { name: 'Valid' }],
    });
    expect(result.contacts).toEqual([
      { name: 'Valid', phone: null, relation: null },
    ]);
  });

  it('filters out contacts where all fields are empty', () => {
    const result = buildDocumentModel(null, 'en', {
      contacts: [{ name: '', phone: '', relation: '' }],
    });
    expect(result.contacts).toEqual([]);
  });

  it('filters out non-record entries from medications array', () => {
    const result = buildDocumentModel(null, 'en', {
      medications: ['not-a-record', 42, null, { name: 'Aspirin' }],
    });
    expect(result.medications).toEqual([
      { name: 'Aspirin', dosage: null, schedule: null },
    ]);
  });

  it('filters out medications where all fields are empty', () => {
    const result = buildDocumentModel(null, 'en', {
      medications: [{ name: '', dosage: '', schedule: '' }],
    });
    expect(result.medications).toEqual([]);
  });

  it('returns base model for an unknown formpackId', () => {
    const result = buildDocumentModel('unknown-pack', 'en', {
      person: { name: 'Bob' },
    });
    expect(result.diagnosisParagraphs).toEqual([]);
    expect(result.person.name).toBe('Bob');
  });

  it('builds offlabel-antrag model with derived attachments', () => {
    const formData: Record<string, unknown> = {
      patient: {
        firstName: 'Mara',
        lastName: 'Example',
        birthDate: '1990-04-12',
        insuranceNumber: 'A123',
        streetAndNumber: 'Road 1',
        postalCode: '11111',
        city: 'Town',
      },
      doctor: {
        name: 'Dr. Example',
        practice: 'Practice',
        streetAndNumber: 'Doc Street 2',
        postalCode: '22222',
        city: 'Doc City',
      },
      insurer: {
        name: 'Insurer',
        department: 'Benefits',
        streetAndNumber: 'Insurer Street 3',
        postalCode: '33333',
        city: 'Insurer City',
      },
      request: {
        drug: 'ivabradine',
        standardOfCareTriedFreeText: 'Prior care text',
      },
      attachmentsFreeText:
        ' - Arztbrief vom 2026-01-10 \n• Befundbericht\nLaborwerte\n\n',
    };

    const result = buildDocumentModel('offlabel-antrag', 'de', formData);

    expect(result.patient).toMatchObject({
      firstName: 'Mara',
      lastName: 'Example',
      birthDate: '12-04-1990',
      insuranceNumber: 'A123',
      streetAndNumber: 'Road 1',
      postalCode: '11111',
      city: 'Town',
    });
    expect(result.doctor).toMatchObject({
      name: 'Dr. Example',
      practice: 'Practice',
      streetAndNumber: 'Doc Street 2',
      postalCode: '22222',
      city: 'Doc City',
    });
    expect(result.insurer).toEqual({
      name: 'Insurer',
      department: 'Benefits',
      streetAndNumber: 'Insurer Street 3',
      postalCode: '33333',
      city: 'Insurer City',
    });
    expect(result.request).toEqual({
      drug: 'ivabradine',
      standardOfCareTriedFreeText: 'Prior care text',
      otherDrugName: '—',
      otherIndication: '—',
      otherTreatmentGoal: '—',
      otherDose: '—',
      otherDuration: '—',
      otherMonitoring: '—',
    });
    expect(result.attachmentsFreeText).toBe(
      '- Arztbrief vom 2026-01-10 \n• Befundbericht\nLaborwerte',
    );
    expect(result.attachments).toEqual({
      items: ['Arztbrief vom 2026-01-10', 'Befundbericht', 'Laborwerte'],
    });
    expect(result.kk?.subject).toContain('Ivabradin');
    expect(result.sources?.length).toBeGreaterThan(0);
    expect(result.exportBundle?.part2).toBeDefined();
    expect(result.exportBundle?.part2.attachmentsItems[0]).toBe(
      'Teil 1: Antrag an die Krankenkasse (Entwurf)',
    );
  });
});
