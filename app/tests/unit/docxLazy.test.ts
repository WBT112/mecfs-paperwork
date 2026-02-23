// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const FORM_PACK_ID = 'formpack-a';
const DOCX_MAPPING = 'docx/mapping.json';
const DOCX_TEMPLATE = 'docx/a4.docx';
const DOCX_FILENAME = 'export.docx';

const buildDocxExportFilename = vi.fn().mockReturnValue(DOCX_FILENAME);
const downloadDocxExport = vi.fn();
const exportDocx = vi.fn().mockResolvedValue(new Blob());
const getDocxErrorKey = vi.fn().mockResolvedValue('docxError');
const preloadDocxAssets = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/export/docx', () => ({
  buildDocxExportFilename,
  downloadDocxExport,
  exportDocx,
  getDocxErrorKey,
  preloadDocxAssets,
}));

import {
  buildDocxExportFilename as buildFilenameLazy,
  downloadDocxExport as downloadLazy,
  exportDocx as exportLazy,
  getDocxErrorKey as getErrorLazy,
  preloadDocxAssets as preloadLazy,
} from '../../src/export/docxLazy';

describe('docxLazy', () => {
  it('forwards docx export helpers through the lazy loader', async () => {
    await buildFilenameLazy(FORM_PACK_ID, 'a4');
    await exportLazy({
      formpackId: FORM_PACK_ID,
      recordId: 'record-1',
      variant: 'a4',
      locale: 'en',
    });
    await downloadLazy(new Uint8Array([1, 2, 3]), DOCX_FILENAME);
    await getErrorLazy(new Error('docx failed'));
    await preloadLazy(FORM_PACK_ID, {
      templates: { a4: DOCX_TEMPLATE },
      mapping: DOCX_MAPPING,
    });

    expect(buildDocxExportFilename).toHaveBeenCalledWith(FORM_PACK_ID, 'a4');
    expect(exportDocx).toHaveBeenCalled();
    expect(downloadDocxExport).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      DOCX_FILENAME,
    );
    expect(getDocxErrorKey).toHaveBeenCalled();
    expect(preloadDocxAssets).toHaveBeenCalledWith(FORM_PACK_ID, {
      templates: { a4: DOCX_TEMPLATE },
      mapping: DOCX_MAPPING,
    });
  });
});
