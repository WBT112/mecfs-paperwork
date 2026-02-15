import type { SupportedLocale } from '../i18n/locale';

export type FormpackExportType = 'docx' | 'json' | 'pdf';
export type FormpackVisibility = 'public' | 'dev';

export const FORMPACK_EXPORT_TYPES = ['docx', 'json', 'pdf'] as const;
export const FORMPACK_VISIBILITIES = ['public', 'dev'] as const;

export const isFormpackExportType = (
  value: unknown,
): value is FormpackExportType =>
  typeof value === 'string' &&
  (FORMPACK_EXPORT_TYPES as readonly string[]).includes(value);

export const isFormpackVisibility = (
  value: unknown,
): value is FormpackVisibility =>
  typeof value === 'string' &&
  (FORMPACK_VISIBILITIES as readonly string[]).includes(value);

export interface FormpackDocxManifest {
  templates: {
    a4: string;
    wallet?: string;
  };
  mapping: string;
}

export interface InfoBoxConfig {
  id: string;
  anchor: string;
  enabled: boolean;
  i18nKey: string;
  format?: 'text' | 'markdown';
  showIf?: Array<{
    path: string;
    op: 'eq' | 'neq';
    value: unknown;
  }>;
}

export interface FormpackUiConfig {
  infoBoxes?: InfoBoxConfig[];
  introGate?: {
    enabled: boolean;
    acceptedFieldPath: string;
    titleKey: string;
    bodyKey: string;
    checkboxLabelKey: string;
    startButtonLabelKey: string;
    reopenButtonLabelKey: string;
  };
}

export type FormpackCategory = 'insurer' | 'doctor' | 'general' | 'other';

export const FORMPACK_CATEGORIES = [
  'insurer',
  'doctor',
  'general',
  'other',
] as const;

export const isFormpackCategory = (value: unknown): value is FormpackCategory =>
  typeof value === 'string' &&
  (FORMPACK_CATEGORIES as readonly string[]).includes(value);

export interface FormpackMeta {
  category?: FormpackCategory;
  keywords?: string[];
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
  ui?: FormpackUiConfig;
  meta?: FormpackMeta;
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
  ui?: unknown;
  meta?: unknown;
}
