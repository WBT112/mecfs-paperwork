import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import i18n from '../../src/i18n';
import { mapDocumentDataToTemplate } from '../../src/export/docx';
import type { DocumentModel } from '../../src/formpacks/documentModel';
import type { RJSFSchema } from '@rjsf/utils';
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
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mapping,
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const { t } = context as {
      t?: {
        notfallpass?: { section?: { contacts?: { title?: string } } };
      };
    };
    expect(t?.notfallpass?.section?.contacts?.title).toBe(
      enTranslations['notfallpass.section.contacts.title'],
    );
  });

  it('maps docx fields using provided schema', async () => {
    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: 'Ada Example', birthDate: '01-01-2000' },
      contacts: [],
      diagnoses: { formatted: 'Yes' },
      symptoms: 'Example symptoms',
      medications: [],
      allergies: 'None',
      doctor: { name: 'Dr Example', phone: '555-0101' },
    };

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        diagnoses: {
          type: 'object',
          properties: {
            formatted: { type: 'string' },
          },
        },
      },
    };

    const context = await mapDocumentDataToTemplate(
      'notfallpass',
      'a4',
      documentData,
      {
        mappingPath: 'docx/mapping.json',
        locale: 'en',
        schema,
      },
    );

    expect(context.diagnoses).toEqual({ formatted: 'Yes' });
  });

  it('maps diagnosis booleans to paragraph text', async () => {
    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: 'Ada Example', birthDate: '01-01-2000' },
      contacts: [],
      diagnoses: { formatted: null, meCfs: true },
      symptoms: 'Example symptoms',
      medications: [],
      allergies: 'None',
      doctor: { name: 'Dr Example', phone: '555-0101' },
    };

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        diagnoses: {
          type: 'object',
          properties: {
            meCfs: { type: 'boolean' },
          },
        },
      },
    };

    const context = await mapDocumentDataToTemplate(
      'notfallpass',
      'a4',
      documentData,
      {
        mappingPath: 'docx/mapping.json',
        locale: 'en',
        schema,
      },
    );

    expect(context.diagnoses?.meCfs).toBe(
      enTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
    );
  });
});
