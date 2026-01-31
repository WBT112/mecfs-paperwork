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
const DOCX_BR_LITERAL = `${DOCX_LITERAL_DELIMITER}</w:t><w:br w:type="textWrapping"/><w:t xml:space="preserve">${DOCX_LITERAL_DELIMITER}`;

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
        processLineBreaks: false,
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
        name: `Line 1${DOCX_BR_LITERAL}Line 2`,
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

    await mapDocumentDataToTemplate('pack-i', 'a4', documentData, {
      mappingPath: DOCX_MAPPING_PATH,
      locale: LOCALE_EN,
    });
    await mapDocumentDataToTemplate('pack-i', 'a4', documentData, {
      mappingPath: DOCX_MAPPING_PATH,
      locale: LOCALE_EN,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.loadFormpackSchemaMock).toHaveBeenCalledTimes(2);
    expect(mocks.loadFormpackUiSchemaMock).toHaveBeenCalledTimes(2);
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

    vi.useRealTimers();
  });

  it('maps docx error keys for known errors', () => {
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
  });
});
