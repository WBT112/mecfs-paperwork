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
