// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadDocxTemplate,
  mapDocumentDataToTemplate,
  preloadDocxAssets,
} from '../../src/export/docx';
import type { DocumentModel } from '../../src/formpacks/documentModel';
import type { FormpackDocxManifest } from '../../src/formpacks/types';

describe('preloadDocxAssets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reuses cached assets when offline', async () => {
    const manifest: FormpackDocxManifest = {
      templates: { a4: 'templates/a4.docx' },
      mapping: 'docx/mapping.json',
    };
    const mapping = {
      version: 1,
      fields: [{ var: 'person.name', path: 'person.name' }],
    };
    const a4Buffer = new Uint8Array([1, 2, 3]).buffer;

    const fetchMock = vi.fn().mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith('/docx/mapping.json')) {
        return Promise.resolve({ ok: true, json: async () => mapping });
      }
      if (url.endsWith('/templates/a4.docx')) {
        return Promise.resolve({ ok: true, arrayBuffer: async () => a4Buffer });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    await preloadDocxAssets('testpack', manifest);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockClear();
    fetchMock.mockImplementation(() => {
      throw new Error('offline');
    });

    const template = await loadDocxTemplate('testpack', 'templates/a4.docx');
    expect(template).toEqual(new Uint8Array([1, 2, 3]));

    const documentData: DocumentModel = {
      diagnosisParagraphs: [],
      person: { name: 'Ada Example', birthDate: null },
      contacts: [],
      diagnoses: { formatted: null },
      symptoms: null,
      medications: [],
      allergies: null,
      doctor: { name: null, phone: null },
    };

    await mapDocumentDataToTemplate('testpack', 'a4', documentData, {
      mappingPath: 'docx/mapping.json',
      locale: 'de',
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
