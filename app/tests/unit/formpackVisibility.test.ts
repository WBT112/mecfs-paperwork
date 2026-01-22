import { describe, expect, it } from 'vitest';
import { filterVisibleFormpacks } from '../../src/formpacks/visibility';
import type { FormpackManifest } from '../../src/formpacks/types';

const PUBLIC_PACK_ID = 'public-pack';
const DEV_PACK_ID = 'dev-pack';

const buildManifest = (
  overrides: Partial<FormpackManifest>,
): FormpackManifest => ({
  id: 'base',
  version: '1.0.0',
  defaultLocale: 'en',
  locales: ['en'],
  titleKey: 'title',
  descriptionKey: 'description',
  exports: ['json'],
  visibility: 'public',
  ...overrides,
});

describe('formpack visibility', () => {
  it('hides dev packs when showDevFormpacks is false', () => {
    const manifests = [
      buildManifest({ id: PUBLIC_PACK_ID }),
      buildManifest({ id: DEV_PACK_ID, visibility: 'dev' }),
    ];

    const visible = filterVisibleFormpacks(manifests, false);

    expect(visible.map((manifest) => manifest.id)).toEqual([PUBLIC_PACK_ID]);
  });

  it('shows dev packs when showDevFormpacks is true', () => {
    const manifests = [
      buildManifest({ id: PUBLIC_PACK_ID }),
      buildManifest({ id: DEV_PACK_ID, visibility: 'dev' }),
    ];

    const visible = filterVisibleFormpacks(manifests, true);

    expect(visible.map((manifest) => manifest.id)).toEqual([
      PUBLIC_PACK_ID,
      DEV_PACK_ID,
    ]);
  });
});
