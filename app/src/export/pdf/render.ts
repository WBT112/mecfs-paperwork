import type { SupportedLocale } from '../../i18n/locale';
import { formatLocalizedDate } from '../../lib/version';

export const formatPdfDate = (
  value: Date | string,
  locale: SupportedLocale,
): string => formatLocalizedDate(value, locale, { dateStyle: 'medium' });
