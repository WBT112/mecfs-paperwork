import type { SupportedLocale } from '../i18n/locale';

export type FormpackExportType = 'docx' | 'json';

export interface FormpackDocxManifest {
  templates: {
    a4: string;
    wallet: string;
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
  docx?: FormpackDocxManifest;
}

/**
 * Narrowed runtime shape for validating formpack manifest payloads.
 */
export interface FormpackManifestPayload {
  id: unknown;
  version: unknown;
  defaultLocale: unknown;
  locales: unknown;
  titleKey: unknown;
  descriptionKey: unknown;
  exports: unknown;
  docx?: unknown;
}
