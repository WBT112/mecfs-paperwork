import { beforeAll, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { buildDocumentModel } from '../formpacks/documentModel';
import enTranslations from '../../../formpacks/notfallpass/i18n/en.json';

const namespace = 'formpack:notfallpass';

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
      enTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
    ]);
  });

  it('returns ME/CFS and POTS paragraphs when both are checked', () => {
    const result = buildDocumentModel('notfallpass', 'en', {
      diagnoses: { meCfs: true, pots: true },
    });
    expect(result.diagnosisParagraphs).toEqual([
      enTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
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
      enTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
      enTranslations['notfallpass.export.diagnoses.longCovid.paragraph'],
    ]);
  });
});
