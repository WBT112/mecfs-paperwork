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
import enTranslations from '../../public/formpacks/notfallpass/i18n/en.json';
import mapping from '../../public/formpacks/notfallpass/docx/mapping.json';

const namespace = 'formpack:notfallpass';
const EXAMPLE_NAME = 'Ada Example';
const EXAMPLE_DATE = '01-01-2000';
const EXAMPLE_PHONE = '555-0101';
const EXAMPLE_SYMPTOMS = 'Example symptoms';
const EXAMPLE_DOCTOR = 'Dr Example';
const EXAMPLE_DIAGNOSIS = 'Additional diagnosis';
const EXAMPLE_MED = 'Med A';
const EXAMPLE_DOSAGE = '10 mg';
const EXAMPLE_SCHEDULE = 'Daily';
const EXAMPLE_NONE = 'None';
const EXAMPLE_LANGUAGE = 'en';
const EXAMPLE_MAPPING_PATH = 'docx/mapping.json';
const EXAMPLE_RELATION = 'Family';
const EXAMPLE_CONTACT = '+49 123';

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
      person: { name: EXAMPLE_NAME, birthDate: EXAMPLE_DATE },
      contacts: [
        { name: 'Alex', phone: EXAMPLE_CONTACT, relation: EXAMPLE_RELATION },
      ],
      diagnoses: { formatted: EXAMPLE_DIAGNOSIS },
      symptoms: EXAMPLE_SYMPTOMS,
      medications: [
        {
          name: EXAMPLE_MED,
          dosage: EXAMPLE_DOSAGE,
          schedule: EXAMPLE_SCHEDULE,
        },
      ],
      allergies: EXAMPLE_NONE,
      doctor: { name: EXAMPLE_DOCTOR, phone: EXAMPLE_PHONE },
    };

    const context = await mapDocumentDataToTemplate(
      'notfallpass',
      'a4',
      documentData,
      { mappingPath: EXAMPLE_MAPPING_PATH, locale: EXAMPLE_LANGUAGE },
    );

    expect(context).toMatchObject({
      person: { name: EXAMPLE_NAME, birthDate: EXAMPLE_DATE },
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
      diagnoses: { formatted: EXAMPLE_DIAGNOSIS },
      symptoms: EXAMPLE_SYMPTOMS,
      medications: [],
      allergies: EXAMPLE_NONE,
      doctor: { name: EXAMPLE_DOCTOR, phone: EXAMPLE_PHONE },
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
        mappingPath: EXAMPLE_MAPPING_PATH,
        locale: EXAMPLE_LANGUAGE,
        schema,
      },
    );

    expect(context.diagnoses).toEqual({ formatted: EXAMPLE_DIAGNOSIS });
  });

  it('maps diagnosis paragraphs to template context', async () => {
    const documentData: DocumentModel = {
      diagnosisParagraphs: [
        enTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
      ],
      person: { name: EXAMPLE_NAME, birthDate: EXAMPLE_DATE },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: EXAMPLE_SYMPTOMS,
      medications: [],
      allergies: EXAMPLE_NONE,
      doctor: { name: EXAMPLE_DOCTOR, phone: EXAMPLE_PHONE },
    };

    const context = await mapDocumentDataToTemplate(
      'notfallpass',
      'a4',
      documentData,
      {
        mappingPath: EXAMPLE_MAPPING_PATH,
        locale: EXAMPLE_LANGUAGE,
      },
    );

    expect(context.diagnosisParagraphs).toEqual([
      enTranslations['notfallpass.export.diagnoses.meCfs.paragraph'],
    ]);
  });
});
