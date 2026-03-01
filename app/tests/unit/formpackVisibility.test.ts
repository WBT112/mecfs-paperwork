// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  filterVisibleFormpacks,
  getDevUiEnabled,
  getShowDevFormpacks,
} from '../../src/formpacks/visibility';
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
  it('enables dev UI in non-production', () => {
    expect(getDevUiEnabled(true)).toBe(true);
  });

  it('disables dev UI in production', () => {
    expect(getDevUiEnabled(false, undefined)).toBe(false);
  });

  it('enables dev UI in production when dev formpacks override is true', () => {
    expect(getDevUiEnabled(false, 'true')).toBe(true);
  });

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

  describe('getShowDevFormpacks', () => {
    it('returns true when isDev is true regardless of override', () => {
      expect(getShowDevFormpacks(true, undefined)).toBe(true);
      expect(getShowDevFormpacks(true, 'false')).toBe(true);
      expect(getShowDevFormpacks(true, 'true')).toBe(true);
    });

    it('returns false when isDev is false and override is undefined', () => {
      expect(getShowDevFormpacks(false, undefined)).toBe(false);
    });

    it('returns false when isDev is false and override is not "true"', () => {
      expect(getShowDevFormpacks(false, 'false')).toBe(false);
      expect(getShowDevFormpacks(false, '')).toBe(false);
      expect(getShowDevFormpacks(false, 'anything')).toBe(false);
    });

    it('returns true when isDev is false and override is "true"', () => {
      expect(getShowDevFormpacks(false, 'true')).toBe(true);
    });
  });
});
