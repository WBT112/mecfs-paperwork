import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { buildDocumentModel } from '../../src/formpacks/documentModel';
import enTranslations from '../../../formpacks/notfallpass/i18n/en.json';

const namespace = 'formpack:notfallpass';
const ME_CFS_PARAGRAPH_KEY = 'notfallpass.export.diagnoses.meCfs.paragraph';

describe('buildDocumentModel', () => {
  beforeAll(() => {
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
