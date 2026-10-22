import type { RepresentativeContactStatus } from './data/catalogs';

/** Pragmatic URL ceiling that supports current mail clients and full letters. */
export const MAX_MAILTO_URL_LENGTH = 8_000;

/** Input used to create a local mail-client link. */
export type MailtoInput = {
  recipient: string | null;
  recipientStatus: RepresentativeContactStatus;
  subject: string;
  body: string;
};

/** Result of preparing a mail-client link. */
export type MailtoLink = {
  href: string;
  bodyIncluded: boolean;
  subjectIncluded: boolean;
};

const encodeQueryValue = (value: string): string =>
  encodeURIComponent(value.replaceAll(/\r?\n/g, '\r\n')).replaceAll(
    /[!'()*]/g,
    (character) =>
      `%${(character.codePointAt(0) as number).toString(16).toUpperCase()}`,
  );

const encodeRecipient = (recipient: string): string =>
  encodeURIComponent(recipient).replaceAll('%40', '@');

/**
 * Creates a mailto URL from a verified public address and visible mail text.
 *
 * @param input - Verified recipient metadata and the currently visible text.
 * @returns A local mail-client link, or `null` without a verified recipient.
 * @remarks Long bodies are omitted from the URL to preserve a usable fallback;
 * the caller must keep the complete body available for manual copying.
 */
export const createMailtoLink = (input: MailtoInput): MailtoLink | null => {
  const recipient = input.recipient?.trim();
  if (input.recipientStatus !== 'verified' || !recipient) {
    return null;
  }

  const base = `mailto:${encodeRecipient(recipient)}`;
  const subjectQuery = `subject=${encodeQueryValue(input.subject)}`;
  const fullHref = `${base}?${subjectQuery}&body=${encodeQueryValue(input.body)}`;
  if (fullHref.length <= MAX_MAILTO_URL_LENGTH) {
    return { href: fullHref, bodyIncluded: true, subjectIncluded: true };
  }

  const subjectHref = `${base}?${subjectQuery}`;
  if (subjectHref.length <= MAX_MAILTO_URL_LENGTH) {
    return {
      href: subjectHref,
      bodyIncluded: false,
      subjectIncluded: true,
    };
  }

  return { href: base, bodyIncluded: false, subjectIncluded: false };
};
