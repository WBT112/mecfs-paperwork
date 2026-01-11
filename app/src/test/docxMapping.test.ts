import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import i18n from '../i18n';
import { mapDocumentDataToTemplate } from '../export/docx';
import type { DocumentModel } from '../formpacks/documentModel';
import enTranslations from '../../../formpacks/notfallpass/i18n/en.json';
import mapping from '../../../formpacks/notfallpass/docx/mapping.json';

const namespace = 'formpack:notfallpass';

describe('mapDocumentDataToTemplate', () => {
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

  beforeEach(() => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mapping,
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps fields, loops, and i18n placeholders into the template context', async () => {
    const documentData: DocumentModel = {
      diagnosisParagraphs: ['Example paragraph'],
      person: { name: 'Ada Example', birthDate: '01-01-2000' },
      contacts: [{ name: 'Alex', phone: '+49 123', relation: 'Family' }],
      diagnoses: { formatted: 'Additional diagnosis' },
      symptoms: 'Example symptoms',
      medications: [{ name: 'Med A', dosage: '10 mg', schedule: 'Daily' }],
      allergies: 'None',
      doctor: { name: 'Dr Example', phone: '555-0101' },
    };

    const context = await mapDocumentDataToTemplate(
      'notfallpass',
      'a4',
      documentData,
      { mappingPath: 'docx/mapping.json', locale: 'en' },
    );

    expect(context).toMatchObject({
      person: { name: 'Ada Example', birthDate: '01-01-2000' },
      diagnoses: { formatted: 'Additional diagnosis' },
      contacts: [{ name: 'Alex', phone: '+49 123', relation: 'Family' }],
      medications: [{ name: 'Med A', dosage: '10 mg', schedule: 'Daily' }],
      diagnosisParagraphs: ['Example paragraph'],
    });
 // NEW: Option A uses nested "t" object
    const t = (context as any).t;
    expect(t?.notfallpass?.section?.contacts?.title).toBe(
      enTranslations['notfallpass.section.contacts.title'],
    );
  });
});
