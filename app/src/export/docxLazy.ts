import type {
  buildDocxExportFilename as buildDocxExportFilenameType,
  downloadDocxExport as downloadDocxExportType,
  DocxTemplateId,
  exportDocx as exportDocxType,
  ExportDocxOptions,
  getDocxErrorKey as getDocxErrorKeyType,
  preloadDocxAssets as preloadDocxAssetsType,
} from './docx';
import type { FormpackDocxManifest } from '../formpacks/types';

type DocxModule = {
  buildDocxExportFilename: typeof buildDocxExportFilenameType;
  downloadDocxExport: typeof downloadDocxExportType;
  exportDocx: typeof exportDocxType;
  getDocxErrorKey: typeof getDocxErrorKeyType;
  preloadDocxAssets: typeof preloadDocxAssetsType;
};

let docxModulePromise: Promise<DocxModule> | null = null;

const loadDocxModule = () => {
  docxModulePromise ??= import('./docx');
  return docxModulePromise;
};

export type { DocxTemplateId, ExportDocxOptions } from './docx';

export const buildDocxExportFilename = async (
  formpackId: string,
  variant: DocxTemplateId,
) => {
  const module = await loadDocxModule();
  return module.buildDocxExportFilename(formpackId, variant);
};

export const downloadDocxExport = async (
  report: Uint8Array | Blob,
  filename: string,
) => {
  const module = await loadDocxModule();
  return module.downloadDocxExport(report, filename);
};

export const exportDocx = async (options: ExportDocxOptions) => {
  const module = await loadDocxModule();
  return module.exportDocx(options);
};

export const getDocxErrorKey = async (error: unknown) => {
  const module = await loadDocxModule();
  return module.getDocxErrorKey(error);
};

export const preloadDocxAssets = async (
  formpackId: string,
  docx: FormpackDocxManifest,
) => {
  const module = await loadDocxModule();
  return module.preloadDocxAssets(formpackId, docx);
};
