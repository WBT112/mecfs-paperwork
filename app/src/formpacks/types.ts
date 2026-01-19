import type { SupportedLocale } from '../i18n/locale';

export type FormpackExportType = 'docx' | 'json';
export type FormpackVisibility = 'public' | 'dev';

export interface FormpackDocxManifest {
  templates: {
    a4: string;
    wallet?: string;
  };
  mapping: string;
}

export interface FormpackManifest {
  id: string;
  version: string;
  defaultLocale: SupportedLocale;
  locales: SupportedLocale[];
  titleKey: string;
  descriptionKey: string;
  exports: FormpackExportType[];
  visibility: FormpackVisibility;
  docx?: FormpackDocxManifest;
}

/**
 * Narrowed runtime shape for validating formpack manifest payloads.
 */
export interface FormpackManifestPayload {
  id: string;
  version: string;
  defaultLocale: string;
  locales: unknown;
  titleKey: string;
  descriptionKey: string;
  exports: unknown;
  visibility?: unknown;
  docx?: unknown;
}
