import { describe, it, expect } from 'vitest';
import {
  parseManifest,
  FormpackLoaderError,
} from '../../src/formpacks/loader';
import type { FormpackManifestPayload } from '../../src/formpacks/types';

describe('parseManifest', () => {
  const validPayload: FormpackManifestPayload = {
    id: 'test-formpack',
    version: '1.0.0',
    titleKey: 'title',
    descriptionKey: 'description',
    locales: ['en'],
    defaultLocale: 'en',
    exports: ['json'],
  };

  it('throws an error if the formpack ID does not match', () => {
    expect(() =>
      parseManifest(validPayload, 'different-formpack-id'),
    ).toThrow(
      new FormpackLoaderError(
        'invalid',
        'The formpack manifest id does not match the requested pack.',
      ),
    );
  });
});
