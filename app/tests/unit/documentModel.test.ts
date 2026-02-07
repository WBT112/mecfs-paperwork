import { describe, it, expect, vi } from 'vitest';
import deTranslationsJson from '../../public/formpacks/notfallpass/i18n/de.json';
import enTranslationsJson from '../../public/formpacks/notfallpass/i18n/en.json';
import { buildDocumentModel } from '../../src/formpacks/documentModel';

const deTranslations = deTranslationsJson as Record<string, string>;
const enTranslations = enTranslationsJson as Record<string, string>;
const namespace = 'formpack:notfallpass';
const ME_CFS_PARAGRAPH_KEY = 'notfallpass.export.diagnoses.meCfs.paragraph';

// Mock i18n to provide predictable translations used by buildDocumentModel
vi.mock('../../src/i18n', () => ({
  default: {
    // Return actual translation strings for the requested locale/namespace when available
    getFixedT: (locale: string, ns: string) => (key: string) => {
      if (ns === namespace) {
        if (locale === 'en' && key in enTranslations) {
          return enTranslations[key];
        }
        if (locale === 'de' && key in deTranslations) {
          return deTranslations[key];
        }
      }
      return key;
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
});
