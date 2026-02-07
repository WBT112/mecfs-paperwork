/* global __APP_VERSION__, __BUILD_DATE__ */

const UNKNOWN_VERSION = 'unknown';

const normalizeValue = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : UNKNOWN_VERSION;
};

const appVersionRaw =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : undefined;
const buildDateRaw =
  typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : undefined;

export const APP_VERSION = normalizeValue(appVersionRaw);
export const BUILD_DATE_ISO = normalizeValue(buildDateRaw);

const buildDate = new Date(BUILD_DATE_ISO);
export const HAS_VALID_BUILD_DATE = !Number.isNaN(buildDate.getTime());

export const formatBuildDate = (locale: string): string => {
  if (!HAS_VALID_BUILD_DATE) {
    return BUILD_DATE_ISO;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(buildDate);
};
