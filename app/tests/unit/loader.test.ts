// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseManifest, FormpackLoaderError } from '../../src/formpacks/loader';
import type { FormpackManifestPayload } from '../../src/formpacks/types';

const DOCTOR_LETTER_ID = 'doctor-letter';

describe('formpacks/loader parseManifest', () => {
  it('parses a valid manifest with docx for notfallpass', () => {
    const payload: FormpackManifestPayload = {
      id: 'notfallpass',
      version: '1.0.0',
      titleKey: 't',
      descriptionKey: 'd',
      locales: ['de', 'en'],
      defaultLocale: 'de',
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: 'a4.docx', wallet: 'wallet.docx' },
        mapping: 'm.json',
      },
    };

    const manifest = parseManifest(payload, 'notfallpass');
    expect(manifest.id).toBe('notfallpass');
    expect(manifest.docx).toBeDefined();
  });

  it('throws when required fields are missing', () => {
    const payload = { id: DOCTOR_LETTER_ID } as FormpackManifestPayload;
    expect(() => parseManifest(payload, DOCTOR_LETTER_ID)).toThrow(
      FormpackLoaderError,
    );
  });

  it('parses manifest with valid meta (category + keywords)', () => {
    const payload: FormpackManifestPayload = {
      id: DOCTOR_LETTER_ID,
      version: '1',
      titleKey: 't',
      descriptionKey: 'd',
      locales: ['de'],
      defaultLocale: 'de',
      exports: ['json'],
      meta: {
        category: 'doctor',
        keywords: ['arzt', 'praxis'],
      },
    };

    const manifest = parseManifest(payload, DOCTOR_LETTER_ID);
    expect(manifest.meta).toEqual({
      category: 'doctor',
      keywords: ['arzt', 'praxis'],
    });
  });

  it('sets meta to undefined when meta is missing', () => {
    const payload: FormpackManifestPayload = {
      id: DOCTOR_LETTER_ID,
      version: '1',
      titleKey: 't',
      descriptionKey: 'd',
      locales: ['de'],
      defaultLocale: 'de',
      exports: ['json'],
    };

    const manifest = parseManifest(payload, DOCTOR_LETTER_ID);
    expect(manifest.meta).toBeUndefined();
  });

  it('ignores invalid meta category gracefully', () => {
    const payload: FormpackManifestPayload = {
      id: DOCTOR_LETTER_ID,
      version: '1',
      titleKey: 't',
      descriptionKey: 'd',
      locales: ['de'],
      defaultLocale: 'de',
      exports: ['json'],
      meta: { category: 'invalid-category', keywords: ['test'] },
    };

    const manifest = parseManifest(payload, DOCTOR_LETTER_ID);
    expect(manifest.meta?.category).toBeUndefined();
    expect(manifest.meta?.keywords).toEqual(['test']);
  });

  it('ignores non-object meta value', () => {
    const payload: FormpackManifestPayload = {
      id: DOCTOR_LETTER_ID,
      version: '1',
      titleKey: 't',
      descriptionKey: 'd',
      locales: ['de'],
      defaultLocale: 'de',
      exports: ['json'],
      meta: 'not-an-object',
    };

    const manifest = parseManifest(payload, DOCTOR_LETTER_ID);
    expect(manifest.meta).toBeUndefined();
  });

  it('throws when wallet template is present for non-notfallpass', () => {
    const payload: FormpackManifestPayload = {
      id: DOCTOR_LETTER_ID,
      version: '1',
      titleKey: 't',
      descriptionKey: 'd',
      locales: ['de'],
      defaultLocale: 'de',
      exports: ['docx'],
      visibility: 'public',
      docx: {
        templates: { a4: 'a4.docx', wallet: 'wallet.docx' },
        mapping: 'm',
      },
    };

    expect(() => parseManifest(payload, DOCTOR_LETTER_ID)).toThrow(
      FormpackLoaderError,
    );
  });
});
