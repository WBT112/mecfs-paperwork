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

export const formatLocalizedDate = (
  value: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatBuildDate = (locale: string): string => {
  if (!HAS_VALID_BUILD_DATE) {
    return BUILD_DATE_ISO;
  }

  return formatLocalizedDate(buildDate, locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};
