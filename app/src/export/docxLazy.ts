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

/**
 * Loads the heavy DOCX module once and reuses it for subsequent calls.
 * This keeps initial page bundles smaller while preserving a stable API.
 */
const loadDocxModule = () => {
  docxModulePromise ??= import('./docx');
  return docxModulePromise;
};

export type { DocxTemplateId, ExportDocxOptions } from './docx';

/**
 * Proxy to filename generation without eagerly loading DOCX internals at app start.
 */
export const buildDocxExportFilename = async (
  formpackId: string,
  variant: DocxTemplateId,
) => {
  const module = await loadDocxModule();
  return module.buildDocxExportFilename(formpackId, variant);
};

/**
 * Proxy to browser download handling after lazy DOCX module loading.
 */
export const downloadDocxExport = async (
  report: Uint8Array | Blob,
  filename: string,
) => {
  const module = await loadDocxModule();
  return module.downloadDocxExport(report, filename);
};

/**
 * Main lazy export entry point for DOCX generation.
 */
export const exportDocx = async (options: ExportDocxOptions) => {
  const module = await loadDocxModule();
  return module.exportDocx(options);
};

/**
 * Maps low-level template errors to UI-facing i18n keys.
 */
export const getDocxErrorKey = async (error: unknown) => {
  const module = await loadDocxModule();
  return module.getDocxErrorKey(error);
};

/**
 * Preloads required DOCX assets for offline-friendly exports.
 */
export const preloadDocxAssets = async (
  formpackId: string,
  docx: FormpackDocxManifest,
) => {
  const module = await loadDocxModule();
  return module.preloadDocxAssets(formpackId, docx);
};
