import type { SupportedLocale } from '../../i18n/locale';

export const formatPdfDate = (
  value: Date | string,
  locale: SupportedLocale,
): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '';
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
};
