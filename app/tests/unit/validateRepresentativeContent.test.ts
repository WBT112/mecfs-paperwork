import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import rawVariants from '../../src/features/representative-letter/data/letter-variants.de.json';
import { validateRepresentativeContent } from '../../scripts/validate-representative-content.mjs';

const APPROVED_INFORMATION_URL = 'https://www.mecfs.de/';

const withEntry = (
  collection: 'subjects' | 'bodies',
  index: number,
  entry: unknown,
) => ({
  ...rawVariants,
  [collection]: rawVariants[collection].map((current, position) =>
    position === index ? entry : current,
  ),
});

describe('active representative content validation', () => {
  it('accepts the approved active catalog without rewriting it', () => {
    expect(validateRepresentativeContent(rawVariants)).toBe(rawVariants);
  });

  it.each([
    ['null', null],
    ['array', []],
    ['number', 1],
    ['string', 'invalid'],
    ['schema version', { ...rawVariants, schemaVersion: 2 }],
    ['unapproved language', { ...rawVariants, contentLanguage: 'en' }],
    ['empty version', { ...rawVariants, contentVersion: '' }],
    ['unsupported field', { ...rawVariants, personalBlocks: [] }],
  ])('rejects unsupported catalog structure: %s', (_label, value) => {
    expect(() => validateRepresentativeContent(value)).toThrow();
  });

  it.each([
    null,
    { ...rawVariants.approval, status: 'draft' },
    { ...rawVariants.approval, sourceIssue: 0 },
    { ...rawVariants.approval, sourceIssue: 1.5 },
    { ...rawVariants.approval, sourceRevision: 0 },
    { ...rawVariants.approval, sourceRevision: undefined },
    { ...rawVariants.approval, approvedAt: 'invalid' },
    { ...rawVariants.approval, sourceComment: 'not a URL' },
    { ...rawVariants.approval, sourceComment: 'http://example.invalid' },
    { ...rawVariants.approval, notes: ' ' },
  ])('rejects incomplete or unsafe approval metadata case %#', (approval) => {
    expect(() =>
      validateRepresentativeContent({ ...rawVariants, approval }),
    ).toThrow();
  });

  it.each(['subjects', 'bodies'] as const)(
    'requires exactly 30 distinct %s',
    (collection) => {
      for (const entries of [null, {}, rawVariants[collection].slice(1)]) {
        expect(() =>
          validateRepresentativeContent({
            ...rawVariants,
            [collection]: entries,
          }),
        ).toThrow(/exactly 30/u);
      }
      const original = rawVariants[collection][0];
      expect(() =>
        validateRepresentativeContent(
          withEntry(collection, 1, { ...original, text: 'Different text' }),
        ),
      ).toThrow(/unique/u);
      expect(() =>
        validateRepresentativeContent(
          withEntry(collection, 1, { ...original, id: 'different-id' }),
        ),
      ).toThrow(/unique/u);
      for (const entry of [
        null,
        [],
        { id: '', text: 'Text' },
        { id: 'unique', text: ' ' },
        { ...original, unused: true },
      ]) {
        expect(() =>
          validateRepresentativeContent(withEntry(collection, 0, entry)),
        ).toThrow();
      }
    },
  );

  it.each([
    '**bold**',
    '# heading',
    '```code```',
    '[link](https://example.invalid)',
    '<b>HTML</b>',
    '{{name}}',
    '__bold__',
  ])('rejects formatting and placeholders: %s', (text) => {
    expect(() =>
      validateRepresentativeContent(
        withEntry('subjects', 0, { id: 'plain', text }),
      ),
    ).toThrow(/plaintext/u);
  });

  it('rejects multiline subjects and incomplete mail bodies', () => {
    expect(() =>
      validateRepresentativeContent(
        withEntry('subjects', 0, { id: 'subject', text: 'First\nsecond' }),
      ),
    ).toThrow(/one line/u);
    const body = rawVariants.bodies[0];
    for (const text of [
      body.text.replace('Guten Tag,', 'Hallo,'),
      body.text.replace('Mit freundlichen Grüßen', ''),
      body.text.replace(APPROVED_INFORMATION_URL, 'https://example.invalid/'),
    ]) {
      expect(() =>
        validateRepresentativeContent(
          withEntry('bodies', 0, { ...body, text }),
        ),
      ).toThrow(/Bodies require/u);
    }
  });

  it('runs the maintainer CLI against the active catalog', () => {
    const scriptPath = resolve('scripts/validate-representative-content.mjs');
    expect(
      execFileSync(process.execPath, [scriptPath], { encoding: 'utf8' }),
    ).toContain(
      `30 subjects, 30 bodies, version ${rawVariants.contentVersion}`,
    );
  });

  it.each([
    'https://evil.invalid/?next=https://www.mecfs.de/',
    'https://evil.invalid/https://www.mecfs.de/',
    'https://www.mecfs.de.evil.invalid/',
    'https://www.mecfs.de@evil.invalid/',
    'https://www.mecfs.de/?next=https://evil.invalid/',
    'https://www.mecfs.de/#https://evil.invalid/',
    'prefixhttps://www.mecfs.de/',
    'http://www.mecfs.de/',
  ])(
    'rejects an embedded, spoofed, or unapproved information URL: %s',
    (url) => {
      const original = rawVariants.bodies[0];
      expect(() =>
        validateRepresentativeContent(
          withEntry('bodies', 0, {
            ...original,
            text: original.text.replace(APPROVED_INFORMATION_URL, url),
          }),
        ),
      ).toThrow(/approved information link/u);
    },
  );

  it('accepts the canonical official URL parsed from a complete plaintext token', () => {
    const original = rawVariants.bodies[0];
    const value = withEntry('bodies', 0, {
      ...original,
      text: original.text.replace(
        APPROVED_INFORMATION_URL,
        'https://WWW.MECFS.DE:443/',
      ),
    });
    expect(validateRepresentativeContent(value)).toBe(value);
  });
});
