import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormpackManifest } from '../../src/formpacks/types';
import type { DocumentModel } from '../../src/formpacks/documentModel';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

const DOCX_MAPPING_PATH = 'docx/mapping.json';
const LOCALE_EN = 'en';
const TEMPLATE_A4_PATH = 'templates/a4.docx';
const FORMPACKS_BASE = '/formpacks';
const WALLET_TEMPLATE_PATH = 'templates/wallet.docx';
const PERSON_NAME = 'Ada Example';
const PERSON_NAME_PATH = 'person.name';
const CONTACTS_NAME_PATH = 'contacts.0.name';
const MEDICATIONS_PATH = 'medications';
const RECORD_ID = 'record-1';
const DOCX_LITERAL_DELIMITER = '§§DOCX_XML§§';
const OFFLABEL_FORMPACK_ID = 'offlabel-antrag';
const DOCTOR_LETTER_FORMPACK_ID = 'doctor-letter';
const CASE_PARAGRAPHS_PATH = 'decision.caseParagraphs';
const SINGLE_PARAGRAPH_TEXT = 'Only one paragraph';
const DOCX_ASSETS_NOT_CONFIGURED_ERROR =
  'DOCX export assets are not configured for this formpack.';
const NO_DOCX_PACK_ID = 'pack-no-docx';
const ARZT_PARAGRAPHS_PATH = 'arzt.paragraphs';
const PART2_CONTENT = 'Part 2 content';
const PACK_WORKER_SUCCESS_ID = 'pack-worker-success';

type FetchHandler = {
  ok: boolean;
  json?: () => Promise<unknown>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
};

const mocks = vi.hoisted(() => ({
  createReportMock: vi.fn(),
  getRecordMock: vi.fn(),
  loadFormpackManifestMock: vi.fn(),
  loadFormpackSchemaMock: vi.fn(),
  loadFormpackUiSchemaMock: vi.fn(),
}));

vi.mock('docx-templates/lib/browser.js', () => ({
  createReport: mocks.createReportMock,
}));

vi.mock('../../src/storage/records', () => ({
  getRecord: mocks.getRecordMock,
}));

vi.mock('../../src/formpacks/loader', () => ({
  loadFormpackManifest: mocks.loadFormpackManifestMock,
  loadFormpackSchema: mocks.loadFormpackSchemaMock,
  loadFormpackUiSchema: mocks.loadFormpackUiSchemaMock,
}));

import {
  applyDocxExportDefaults,
  buildDocxExportFilename,
  createDocxReport,
  downloadDocxExport,
  exportDocx,
  getDocxErrorKey,
  loadDocxTemplate,
  mapDocumentDataToTemplate,
  preloadDocxAssets,
} from '../../src/export/docx';

const buildFetchMock = (handlers: Record<string, FetchHandler | undefined>) =>
  vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const handler = handlers[url];
    if (!handler) {
      return Promise.resolve({ ok: false, status: 404 });
    }
    return Promise.resolve({
      ok: handler.ok,
      status: handler.ok ? 200 : 500,
      json: handler.json,
      arrayBuffer: handler.arrayBuffer,
    });
  });

describe('docx export coverage', () => {
  beforeEach(() => {
    mocks.createReportMock.mockClear();
    mocks.createReportMock.mockResolvedValue(new Uint8Array([9, 9, 9]));
    mocks.getRecordMock.mockResolvedValue({
      id: RECORD_ID,
      data: {
        person: { name: PERSON_NAME },
        contacts: [{ name: 'Sam' }],
        medications: [{ name: 'Rx', dosage: '5mg' }],
      },
    });
    mocks.loadFormpackManifestMock.mockResolvedValue(null);
    mocks.loadFormpackSchemaMock.mockRejectedValue(new Error('no schema'));
    mocks.loadFormpackUiSchemaMock.mockRejectedValue(new Error('no ui schema'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates reports with defaults', async () => {
    const template = new Uint8Array([1, 2, 3]);
    const data = { t: { foo: 'bar' } };
    const tFn = ((key: string) => key) as ((key: string) => string) &
      Record<string, unknown>;

    const result = await createDocxReport(template, data, {
      t: tFn,
      formatDate: () => '',
      formatPhone: () => '',
    });

    expect(mocks.createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        template,
        data,
        literalXmlDelimiter: DOCX_LITERAL_DELIMITER,
        processLineBreaks: true,
        failFast: true,
      }),
    );
    expect(result).toEqual(new Uint8Array([9, 9, 9]));
  });

  it('loads templates with caching and validates paths', async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-a/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => buffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const first = await loadDocxTemplate('pack-a', TEMPLATE_A4_PATH);
    const second = await loadDocxTemplate('pack-a', TEMPLATE_A4_PATH);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);

    await expect(
      loadDocxTemplate('pack-a', '../templates/a4.docx'),
    ).rejects.toThrow('Invalid DOCX template path.');
  });

  it('maps document data into template context with loops', async () => {
    const mapping = {
      version: 1,
      fields: [
        { var: PERSON_NAME_PATH, path: PERSON_NAME_PATH },
        { var: CONTACTS_NAME_PATH, path: CONTACTS_NAME_PATH },
      ],
      loops: [{ var: MEDICATIONS_PATH, path: MEDICATIONS_PATH }],
      i18n: { prefix: 'notfallpass' },
    };

    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-b/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        contacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' } },
          },
        },
        medications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              dosage: { type: 'string' },
            },
          },
        },
      },
    };
    const uiSchema: UiSchema = {
      person: { name: { 'ui:title': 'Name' } },
      contacts: { items: { name: { 'ui:title': 'Contact' } } },
      medications: { items: { name: { 'ui:title': 'Medication' } } },
    };

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [{ name: 'Sam', phone: null, relation: null }],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [{ name: 'Rx', dosage: '5mg', schedule: null }],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const context = await mapDocumentDataToTemplate(
      'pack-b',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
        schema,
        uiSchema,
      },
    );

    expect(context).toMatchObject({
      person: { name: PERSON_NAME },
      contacts: { 0: { name: 'Sam' } },
      medications: [{ name: 'Rx', dosage: '5mg', schedule: '' }],
    });
  });

  it('encodes docx line breaks in mapped fields', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };

    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-linebreak/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: {
        name: `Line 1\n${DOCX_LITERAL_DELIMITER}Line 2`,
        birthDate: null,
      },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const context = await mapDocumentDataToTemplate(
      'pack-linebreak',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({
      person: {
        name: 'Line 1\nLine 2',
      },
    });
  });

  it('adds explicit blank paragraphs between doctor-letter case paragraphs', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
      loops: [{ var: CASE_PARAGRAPHS_PATH, path: CASE_PARAGRAPHS_PATH }],
    };

    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${DOCTOR_LETTER_FORMPACK_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
      decision: {
        caseId: 3,
        caseText: 'One\n\nTwo',
        caseParagraphs: ['One', 'Two'],
      },
    };

    const context = await mapDocumentDataToTemplate(
      DOCTOR_LETTER_FORMPACK_ID,
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({
      decision: {
        caseParagraphs: ['One', '', 'Two'],
      },
    });
  });

  it('keeps a single doctor-letter case paragraph without inserting blank lines', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
      loops: [{ var: CASE_PARAGRAPHS_PATH, path: CASE_PARAGRAPHS_PATH }],
    };

    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${DOCTOR_LETTER_FORMPACK_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
      decision: {
        caseId: 3,
        caseText: SINGLE_PARAGRAPH_TEXT,
        caseParagraphs: [SINGLE_PARAGRAPH_TEXT],
      },
    };

    const context = await mapDocumentDataToTemplate(
      DOCTOR_LETTER_FORMPACK_ID,
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({
      decision: {
        caseParagraphs: [SINGLE_PARAGRAPH_TEXT],
      },
    });
  });

  it('ignores non-string i18n prefix values in mapping payloads', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
      i18n: {
        prefix: 123,
      },
    };

    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-i18n-prefix/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const context = await mapDocumentDataToTemplate(
      'pack-i18n-prefix',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({
      person: {
        name: PERSON_NAME,
      },
    });
  });

  it('throws on invalid mapping payloads', async () => {
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-c/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => ({ fields: [] }),
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: null, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await expect(
      mapDocumentDataToTemplate('pack-c', 'a4', documentData, {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow('DOCX mapping payload must declare a version.');
  });

  it('rejects unsafe mapping paths and unsupported template variants', async () => {
    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: null, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await expect(
      mapDocumentDataToTemplate('pack-c', 'a4', documentData, {
        mappingPath: `../${DOCX_MAPPING_PATH}`,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow('Invalid DOCX mapping path.');

    await expect(
      mapDocumentDataToTemplate('pack-c', 'wallet', documentData, {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow(
      'Wallet DOCX export is only supported for the notfallpass formpack.',
    );
  });

  it('handles mapping fetch errors and JSON parse failures', async () => {
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-g/${DOCX_MAPPING_PATH}`]: {
        ok: false,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: null, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await expect(
      mapDocumentDataToTemplate('pack-g', 'a4', documentData, {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow('Unable to load DOCX mapping');

    const parseErrorFetch = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-h/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => {
          throw new Error('bad json');
        },
      },
    });
    vi.stubGlobal('fetch', parseErrorFetch as unknown as typeof fetch);

    await expect(
      mapDocumentDataToTemplate('pack-h', 'a4', documentData, {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow('Unable to parse DOCX mapping JSON');
  });

  it('surfaces non-Error mapping parse failures', async () => {
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-h-string/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => {
          throw 'bad-json-string';
        },
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: null, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await expect(
      mapDocumentDataToTemplate('pack-h-string', 'a4', documentData, {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow('bad-json-string');
  });

  it('rejects malformed mapping payload variants', async () => {
    const payloads = [
      'not-an-object',
      {
        version: 2,
        fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
      },
      { version: 1, fields: 'bad' },
    ];
    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: null, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    for (const [index, payload] of payloads.entries()) {
      const fetchMock = buildFetchMock({
        [`${FORMPACKS_BASE}/pack-m-${index}/${DOCX_MAPPING_PATH}`]: {
          ok: true,
          json: async () => payload,
        },
      });
      vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

      await expect(
        mapDocumentDataToTemplate(`pack-m-${index}`, 'a4', documentData, {
          mappingPath: DOCX_MAPPING_PATH,
          locale: LOCALE_EN,
        }),
      ).rejects.toThrow();
    }
  });

  it('rejects mappings without at least one valid field entry', async () => {
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-invalid-fields/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => ({
          version: 1,
          fields: [{ var: '', path: '' }],
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: null, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await expect(
      mapDocumentDataToTemplate('pack-invalid-fields', 'a4', documentData, {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow(
      'DOCX mapping payload must contain at least one valid field mapping.',
    );
  });

  it('caches mappings and schema lookups', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
      loops: [{ var: MEDICATIONS_PATH, path: MEDICATIONS_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-i/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        person: { type: 'object', properties: { name: { type: 'string' } } },
        medications: { type: 'array', items: { type: 'object' } },
      },
    };
    const uiSchema: UiSchema = {
      person: { name: { 'ui:title': 'Name' } },
      medications: { items: {} },
    };
    mocks.loadFormpackSchemaMock.mockResolvedValueOnce(schema);
    mocks.loadFormpackUiSchemaMock.mockResolvedValueOnce(uiSchema);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: 'Cached', birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: {} as unknown as DocumentModel['medications'],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const schemaCallsBefore = mocks.loadFormpackSchemaMock.mock.calls.length;
    const uiSchemaCallsBefore =
      mocks.loadFormpackUiSchemaMock.mock.calls.length;

    await mapDocumentDataToTemplate('pack-i', 'a4', documentData, {
      mappingPath: DOCX_MAPPING_PATH,
      locale: LOCALE_EN,
    });
    await mapDocumentDataToTemplate('pack-i', 'a4', documentData, {
      mappingPath: DOCX_MAPPING_PATH,
      locale: LOCALE_EN,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.loadFormpackSchemaMock.mock.calls.length).toBe(
      schemaCallsBefore + 1,
    );
    expect(mocks.loadFormpackUiSchemaMock.mock.calls.length).toBe(
      uiSchemaCallsBefore + 1,
    );
  });

  it('handles array item schemas and skips unsafe mapping vars', async () => {
    const mapping = {
      version: 1,
      fields: [
        { var: '__proto__.polluted', path: PERSON_NAME_PATH },
        { var: CONTACTS_NAME_PATH, path: CONTACTS_NAME_PATH },
      ],
      loops: [{ var: MEDICATIONS_PATH, path: MEDICATIONS_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-k/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: [
            {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          ],
        },
        medications: {
          type: 'array',
          items: [
            {
              type: 'object',
              properties: { name: { type: 'string' } },
            },
          ],
        },
      },
    };
    const uiSchema: UiSchema = {
      contacts: { items: [{ name: { 'ui:title': 'Contact' } }] },
      medications: { items: [{ name: { 'ui:title': 'Medication' } }] },
    };

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [{ name: 'Sam', phone: null, relation: null }],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [{ name: 'Rx', dosage: null, schedule: null }],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const context = await mapDocumentDataToTemplate(
      'pack-k',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
        schema,
        uiSchema,
      },
    );

    expect(context).toMatchObject({
      contacts: { 0: { name: 'Sam' } },
      medications: [{ name: 'Rx' }],
    });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('handles invalid array path segments', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: 'contacts.invalid', path: 'contacts.foo.name' }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-l/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [{ name: 'Sam', phone: null, relation: null }],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const context = await mapDocumentDataToTemplate(
      'pack-l',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({ contacts: { invalid: '' } });
  });

  it('handles non-record and item-segment uiSchema traversal branches', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: 'contacts.name', path: 'contacts.name' }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-ui-branches/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [{ name: 'Sam', phone: null, relation: null }],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await mapDocumentDataToTemplate('pack-ui-branches', 'a4', documentData, {
      mappingPath: DOCX_MAPPING_PATH,
      locale: LOCALE_EN,
      uiSchema: 'invalid' as unknown as UiSchema,
    });

    const context = await mapDocumentDataToTemplate(
      'pack-ui-branches',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
        uiSchema: {
          contacts: {
            items: {
              name: { 'ui:title': 'Contact Name' },
            },
          },
        },
      },
    );

    expect(context).toMatchObject({ contacts: { name: '' } });
  });

  it('resolves common-prefixed enum labels through app namespace', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: 'translationField', path: 'translationField' }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-common-docx/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        translationField: {
          type: 'string',
          enum: ['done'],
        },
      },
    };
    const uiSchema: UiSchema = {
      translationField: {
        'ui:enumNames': ['common.close'],
      },
    };

    const documentData = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
      translationField: 'done',
    } as unknown as DocumentModel;

    const context = await mapDocumentDataToTemplate(
      'pack-common-docx',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
        schema,
        uiSchema,
      },
    );

    expect(context).toMatchObject({ translationField: 'Close' });
  });

  it('reuses override schema and uiSchema caches across repeated calls', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-override-repeat/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const schema: RJSFSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      },
    };
    const uiSchema: UiSchema = {
      person: { name: { 'ui:title': 'Name' } },
    };

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const schemaCallsBefore = mocks.loadFormpackSchemaMock.mock.calls.length;
    const uiSchemaCallsBefore =
      mocks.loadFormpackUiSchemaMock.mock.calls.length;

    await mapDocumentDataToTemplate(
      'pack-override-repeat',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
        schema,
        uiSchema,
      },
    );
    await mapDocumentDataToTemplate(
      'pack-override-repeat',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
        schema,
        uiSchema,
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.loadFormpackSchemaMock.mock.calls.length).toBe(
      schemaCallsBefore,
    );
    expect(mocks.loadFormpackUiSchemaMock.mock.calls.length).toBe(
      uiSchemaCallsBefore,
    );
  });

  it('normalizes primitive loop entries', async () => {
    const mapping = {
      version: 1,
      loops: [{ var: 'numbers', path: MEDICATIONS_PATH }],
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-n/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [1, 'two', true, null],
      allergies: null,
      doctor: { name: null, phone: null },
    } as unknown as DocumentModel;

    const context = await mapDocumentDataToTemplate(
      'pack-n',
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({ numbers: ['1', 'two', ''] });
  });

  it('exports docx with manifest override and record lookup', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-d/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-d/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const manifest: FormpackManifest = {
      id: 'pack-d',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocx({
      formpackId: 'pack-d',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();

    const createReportArgs = mocks.createReportMock.mock.calls.at(-1)?.[0] as {
      additionalJsContext?: {
        t: ((key: string) => string) & Record<string, unknown>;
        formatDate: (value: string | null | undefined) => string;
        formatPhone: (value: string | null | undefined) => string;
      };
    };
    expect(createReportArgs.additionalJsContext?.t('missing.key')).toBe(
      'missing.key',
    );
    expect(createReportArgs.additionalJsContext?.formatDate(null)).toBe('');
    expect(
      createReportArgs.additionalJsContext?.formatDate('not-a-valid-date'),
    ).toBe('not-a-valid-date');
    expect(
      createReportArgs.additionalJsContext?.formatDate('2024-01-02T00:00:00Z'),
    ).not.toBe('2024-01-02T00:00:00Z');
    expect(createReportArgs.additionalJsContext?.formatPhone(undefined)).toBe(
      '',
    );
    expect(
      createReportArgs.additionalJsContext?.formatPhone('  +49 123  '),
    ).toBe('+49 123');
  });

  it('handles export errors for missing templates and records', async () => {
    const manifest: FormpackManifest = {
      id: 'pack-e',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    await expect(
      exportDocx({
        formpackId: 'pack-e',
        recordId: RECORD_ID,
        variant: 'wallet',
        locale: LOCALE_EN,
        manifest,
      }),
    ).rejects.toThrow('DOCX template for wallet is not available.');

    mocks.getRecordMock.mockResolvedValueOnce(null);

    await expect(
      exportDocx({
        formpackId: 'pack-e',
        recordId: 'missing',
        variant: 'a4',
        locale: LOCALE_EN,
        manifest,
      }),
    ).rejects.toThrow('Unable to load the requested record.');

    await expect(
      exportDocx({
        formpackId: 'pack-e',
        recordId: RECORD_ID,
        variant: 'a4',
        locale: LOCALE_EN,
        manifest: {
          ...manifest,
          docx: undefined,
        },
      }),
    ).rejects.toThrow(DOCX_ASSETS_NOT_CONFIGURED_ERROR);
  });

  it('loads manifest when none is provided and rejects missing docx assets', async () => {
    mocks.loadFormpackManifestMock.mockResolvedValueOnce({
      id: NO_DOCX_PACK_ID,
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
    });

    await expect(
      exportDocx({
        formpackId: NO_DOCX_PACK_ID,
        recordId: RECORD_ID,
        variant: 'a4',
        locale: LOCALE_EN,
      }),
    ).rejects.toThrow(DOCX_ASSETS_NOT_CONFIGURED_ERROR);

    expect(mocks.loadFormpackManifestMock).toHaveBeenCalledWith(
      NO_DOCX_PACK_ID,
    );
  });

  it('falls back to default filename segments when sanitized parts are empty', () => {
    const filename = buildDocxExportFilename(
      '///',
      '' as unknown as 'a4' | 'wallet',
      new Date('2026-02-28T00:00:00.000Z'),
    );

    expect(filename).toBe('document-export-20260228.docx');
  });

  it('uses default mapping path and normalizes undefined schema loaders to null', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-default-options/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    mocks.loadFormpackSchemaMock.mockResolvedValueOnce(undefined);
    mocks.loadFormpackUiSchemaMock.mockResolvedValueOnce(undefined);

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: PERSON_NAME, birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    const context = await mapDocumentDataToTemplate(
      'pack-default-options',
      'a4',
      documentData,
    );

    expect(context).toMatchObject({
      person: { name: PERSON_NAME },
    });
  });

  it('falls back to deep-clone logic when structuredClone is unavailable', () => {
    const originalStructuredClone = globalThis.structuredClone;
    vi.stubGlobal('structuredClone', undefined);
    try {
      const normalized = applyDocxExportDefaults(
        {
          patient: { firstName: '' },
          doctor: { name: '' },
        },
        DOCTOR_LETTER_FORMPACK_ID,
        'de',
      );

      expect(
        typeof (normalized as { patient: { firstName: string } }).patient
          .firstName,
      ).toBe('string');
    } finally {
      vi.stubGlobal('structuredClone', originalStructuredClone);
    }
  });

  it('skips offlabel liability fallback when source paragraphs are missing or blank', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: ARZT_PARAGRAPHS_PATH, path: ARZT_PARAGRAPHS_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${OFFLABEL_FORMPACK_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const withMissingLiability = {
      arzt: {
        paragraphs: ['Part 2'],
        liabilityParagraphs: 'invalid',
      },
    } as unknown as DocumentModel;
    const withBlankLiability = {
      arzt: {
        paragraphs: ['Part 2'],
        liabilityParagraphs: ['   ', ''],
      },
    } as unknown as DocumentModel;

    const contextWithoutArray = await mapDocumentDataToTemplate(
      OFFLABEL_FORMPACK_ID,
      'a4',
      withMissingLiability,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );
    const contextWithBlankValues = await mapDocumentDataToTemplate(
      OFFLABEL_FORMPACK_ID,
      'a4',
      withBlankLiability,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(contextWithoutArray).toMatchObject({
      arzt: { paragraphs: 'Part 2' },
    });
    expect(contextWithBlankValues).toMatchObject({
      arzt: { paragraphs: 'Part 2' },
    });
  });

  it('embeds offlabel liability fallback with heading and paragraph separator', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: ARZT_PARAGRAPHS_PATH, path: ARZT_PARAGRAPHS_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${OFFLABEL_FORMPACK_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData = {
      arzt: {
        paragraphs: [PART2_CONTENT],
        liabilityHeading: '  Liability Heading  ',
        liabilityParagraphs: ['Liability one', 'Liability two'],
      },
    } as unknown as DocumentModel;

    const context = await mapDocumentDataToTemplate(
      OFFLABEL_FORMPACK_ID,
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({
      arzt: {
        paragraphs: `${PART2_CONTENT}, Liability Heading, Liability one, Liability two`,
      },
    });
  });

  it('embeds offlabel liability fallback when paragraph and heading values are invalid', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: ARZT_PARAGRAPHS_PATH, path: ARZT_PARAGRAPHS_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${OFFLABEL_FORMPACK_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData = {
      arzt: {
        paragraphs: 'not-an-array',
        liabilityHeading: 123,
        liabilityParagraphs: [42, '  Valid liability  '],
      },
    } as unknown as DocumentModel;

    const context = await mapDocumentDataToTemplate(
      OFFLABEL_FORMPACK_ID,
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    expect(context).toMatchObject({
      arzt: {
        paragraphs: 'Valid liability',
      },
    });
  });

  it('coerces non-string part2 paragraph entries while embedding liability fallback', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: ARZT_PARAGRAPHS_PATH, path: ARZT_PARAGRAPHS_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${OFFLABEL_FORMPACK_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const documentData = {
      arzt: {
        paragraphs: [PART2_CONTENT, 17],
        liabilityHeading: '',
        liabilityParagraphs: ['Liability content'],
      },
    } as unknown as DocumentModel;

    const context = await mapDocumentDataToTemplate(
      OFFLABEL_FORMPACK_ID,
      'a4',
      documentData,
      {
        mappingPath: DOCX_MAPPING_PATH,
        locale: LOCALE_EN,
      },
    );

    const paragraphs = (context as { arzt?: { paragraphs?: unknown } }).arzt
      ?.paragraphs;
    expect(typeof paragraphs).toBe('string');
    expect(String(paragraphs)).toContain(PART2_CONTENT);
    expect(String(paragraphs)).toContain('Liability content');
  });

  it('falls back to in-thread rendering when worker serialization fails', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-fallback/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-fallback/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const workerListeners = new Map<string, (event: MessageEvent) => void>();
    class MockWorker {
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        workerListeners.set(type, listener);
      }

      postMessage(payload: { id: number }) {
        workerListeners.get('message')?.({
          data: { id: payload.id + 1, result: new Uint8Array([0]) },
        } as MessageEvent);
        workerListeners.get('messageerror')?.({
          data: { id: payload.id },
        } as MessageEvent);
      }
    }
    vi.stubGlobal('Worker', MockWorker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-fallback',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocx({
      formpackId: 'pack-worker-fallback',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('uses worker responses directly and reuses the worker instance', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/${PACK_WORKER_SUCCESS_ID}/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/${PACK_WORKER_SUCCESS_ID}/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const workerListeners = new Map<string, (event: MessageEvent) => void>();
    const workerConstructed = vi.fn();

    class MockWorker {
      constructor() {
        workerConstructed();
      }

      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        workerListeners.set(type, listener);
      }

      postMessage(payload: { id: number }) {
        workerListeners.get('message')?.({
          data: { id: payload.id, result: new Uint8Array([5, 6, 7]) },
        } as MessageEvent);
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: PACK_WORKER_SUCCESS_ID,
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const firstBlob = await exportDocxFromFreshModule({
      formpackId: PACK_WORKER_SUCCESS_ID,
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });
    const secondBlob = await exportDocxFromFreshModule({
      formpackId: PACK_WORKER_SUCCESS_ID,
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(firstBlob.type).toContain('application');
    expect(secondBlob.type).toContain('application');
    expect(workerConstructed).toHaveBeenCalledTimes(1);
    expect(mocks.createReportMock).not.toHaveBeenCalled();
  });

  it('falls back when worker posts an error event', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-error/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-error/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const workerListeners = new Map<string, (event: MessageEvent) => void>();
    class MockWorker {
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        workerListeners.set(type, listener);
      }

      postMessage() {
        workerListeners.get('error')?.({} as MessageEvent);
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-error',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-worker-error',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('falls back when worker returns an explicit error payload', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-message-error/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-message-error/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const workerListeners = new Map<string, (event: MessageEvent) => void>();
    class MockWorker {
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        workerListeners.set(type, listener);
      }

      postMessage(payload: { id: number }) {
        workerListeners.get('message')?.({
          data: { id: payload.id, error: 'worker-side render error' },
        } as MessageEvent);
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-message-error',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-worker-message-error',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('falls back when worker postMessage throws', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-throw/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-throw/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    class MockWorker {
      addEventListener() {
        return undefined;
      }

      postMessage() {
        throw new Error('cannot serialize worker payload');
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-throw',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-worker-throw',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('falls back when worker postMessage throws a non-Error value', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-throw-string/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-throw-string/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    class MockWorker {
      addEventListener() {
        return undefined;
      }

      postMessage() {
        throw 'unserializable';
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-throw-string',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-worker-throw-string',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('uses an empty t-context when mapping overrides t with a non-record value', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: 't', path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-nonrecord-t/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-nonrecord-t/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    class MockWorker {
      addEventListener() {
        return undefined;
      }

      postMessage() {
        throw new Error('force fallback');
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-nonrecord-t',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-nonrecord-t',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('falls back when worker emits a messageerror event in a fresh module instance', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-messageerror/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-messageerror/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const workerListeners = new Map<string, (event: MessageEvent) => void>();
    class MockWorker {
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        workerListeners.set(type, listener);
      }

      postMessage(payload: { id: number }) {
        workerListeners.get('messageerror')?.({
          data: { id: payload.id },
        } as MessageEvent);
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-messageerror',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-worker-messageerror',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).toHaveBeenCalled();
  });

  it('ignores worker messages for unknown request ids before handling the current request', async () => {
    vi.resetModules();
    const { exportDocx: exportDocxFromFreshModule } =
      await import('../../src/export/docx');

    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const templateBuffer = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-worker-unknown-id/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-worker-unknown-id/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => templateBuffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const workerListeners = new Map<string, (event: MessageEvent) => void>();
    class MockWorker {
      addEventListener(type: string, listener: (event: MessageEvent) => void) {
        workerListeners.set(type, listener);
      }

      postMessage(payload: { id: number }) {
        workerListeners.get('message')?.({
          data: { id: payload.id + 99, result: new Uint8Array([0]) },
        } as MessageEvent);
        workerListeners.get('message')?.({
          data: { id: payload.id, result: new Uint8Array([1, 2, 3]) },
        } as MessageEvent);
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const manifest: FormpackManifest = {
      id: 'pack-worker-unknown-id',
      version: '1.0.0',
      titleKey: 'title',
      descriptionKey: 'desc',
      defaultLocale: LOCALE_EN,
      locales: [LOCALE_EN],
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: TEMPLATE_A4_PATH },
        mapping: DOCX_MAPPING_PATH,
      },
    };

    const blob = await exportDocxFromFreshModule({
      formpackId: 'pack-worker-unknown-id',
      recordId: RECORD_ID,
      variant: 'a4',
      locale: LOCALE_EN,
      manifest,
      schema: { type: 'object', properties: {} },
      uiSchema: {},
    });

    expect(blob.type).toContain('application');
    expect(mocks.createReportMock).not.toHaveBeenCalled();
  });

  it('preloads docx assets and caches schema placeholders', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-f/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-f/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      },
      [`${FORMPACKS_BASE}/pack-f/${WALLET_TEMPLATE_PATH}`]: {
        ok: true,
        arrayBuffer: async () => new Uint8Array([2]).buffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await preloadDocxAssets('pack-f', {
      templates: {
        a4: TEMPLATE_A4_PATH,
        wallet: WALLET_TEMPLATE_PATH,
      },
      mapping: DOCX_MAPPING_PATH,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preloads only mapping and a4 template when no wallet template exists', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-no-wallet/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-no-wallet/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => new Uint8Array([3]).buffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await preloadDocxAssets('pack-no-wallet', {
      templates: {
        a4: TEMPLATE_A4_PATH,
      },
      mapping: DOCX_MAPPING_PATH,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reuses preload placeholders and asset caches on repeated preload calls', async () => {
    const mapping = {
      version: 1,
      fields: [{ var: PERSON_NAME_PATH, path: PERSON_NAME_PATH }],
    };
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-preload-repeat/${DOCX_MAPPING_PATH}`]: {
        ok: true,
        json: async () => mapping,
      },
      [`${FORMPACKS_BASE}/pack-preload-repeat/${TEMPLATE_A4_PATH}`]: {
        ok: true,
        arrayBuffer: async () => new Uint8Array([7]).buffer,
      },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await preloadDocxAssets('pack-preload-repeat', {
      templates: {
        a4: TEMPLATE_A4_PATH,
      },
      mapping: DOCX_MAPPING_PATH,
    });
    await preloadDocxAssets('pack-preload-repeat', {
      templates: {
        a4: TEMPLATE_A4_PATH,
      },
      mapping: DOCX_MAPPING_PATH,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when template fetch fails', async () => {
    const fetchMock = buildFetchMock({
      [`${FORMPACKS_BASE}/pack-j/${TEMPLATE_A4_PATH}`]: { ok: false },
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await expect(loadDocxTemplate('pack-j', TEMPLATE_A4_PATH)).rejects.toThrow(
      'Unable to load DOCX template',
    );
  });

  it('downloads docx export blobs safely', () => {
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:docx');
    const revokeUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    vi.useFakeTimers();

    downloadDocxExport(new Uint8Array([1, 2, 3]), 'export');
    downloadDocxExport(new Blob([new Uint8Array([4])]), 'report.docx');

    expect(createUrl).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeUrl).toHaveBeenCalled();
  });

  it('maps docx error keys for known errors', () => {
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const unterminated = new Error('oops');
    unterminated.name = 'UnterminatedForLoopError';
    expect(getDocxErrorKey(unterminated)).toBe(
      'formpackDocxErrorUnterminatedFor',
    );

    const invalidCommand = new Error('oops');
    invalidCommand.name = 'InvalidCommandError';
    expect(getDocxErrorKey(invalidCommand)).toBe(
      'formpackDocxErrorInvalidCommand',
    );

    expect(getDocxErrorKey({ message: 'bad' })).toBe('formpackDocxExportError');
    expect(getDocxErrorKey(['not-an-error'])).toBe('formpackDocxExportError');

    consoleSpy.mockRestore();
  });
});
