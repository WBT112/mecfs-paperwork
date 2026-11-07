import { describe, expect, it } from 'vitest';
import {
  MAX_MAILTO_URL_LENGTH,
  createMailtoLink,
} from '../../src/features/representative-letter/mailto';

describe('createMailtoLink', () => {
  it('encodes the verified recipient, subject, special characters, and lines', () => {
    const result = createMailtoLink({
      recipient: 'person+office@example.org',
      recipientStatus: 'verified',
      subject: 'Änderung & Prüfung!',
      body: 'Erste Zeile\nZweite Zeile (vollständig)',
    });

    expect(result).toEqual({
      href: 'mailto:person%2Boffice@example.org?subject=%C3%84nderung%20%26%20Pr%C3%BCfung%21&body=Erste%20Zeile%0D%0AZweite%20Zeile%20%28vollst%C3%A4ndig%29',
      bodyIncluded: true,
      subjectIncluded: true,
    });
    expect(decodeURIComponent(result!.href.split('body=')[1])).toBe(
      'Erste Zeile\r\nZweite Zeile (vollständig)',
    );
  });

  it.each([
    { recipient: null, recipientStatus: 'missing' as const },
    { recipient: '', recipientStatus: 'verified' as const },
    {
      recipient: 'unverified@example.org',
      recipientStatus: 'missing' as const,
    },
  ])('does not create a link for $recipientStatus/$recipient', (entry) => {
    expect(
      createMailtoLink({ ...entry, subject: 'Subject', body: 'Body' }),
    ).toBe(null);
  });

  it('omits an oversized body while keeping recipient and subject', () => {
    const result = createMailtoLink({
      recipient: 'person@example.org',
      recipientStatus: 'verified',
      subject: 'Short subject',
      body: 'ä'.repeat(MAX_MAILTO_URL_LENGTH),
    });

    expect(result).toEqual({
      href: 'mailto:person@example.org?subject=Short%20subject',
      bodyIncluded: false,
      subjectIncluded: true,
    });
  });

  it('falls back to the recipient when even the subject is oversized', () => {
    const result = createMailtoLink({
      recipient: 'person@example.org',
      recipientStatus: 'verified',
      subject: 'x'.repeat(MAX_MAILTO_URL_LENGTH),
      body: 'Body',
    });

    expect(result).toEqual({
      href: 'mailto:person@example.org',
      bodyIncluded: false,
      subjectIncluded: false,
    });
  });
});
