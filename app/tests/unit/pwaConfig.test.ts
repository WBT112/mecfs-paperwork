import { describe, expect, it } from 'vitest';
import {
  DEV_PRECACHE_GLOB_PATTERNS,
  MAXIMUM_FILE_SIZE_TO_CACHE_BYTES,
  PRECACHE_GLOB_PATTERNS,
  RUNTIME_CACHING,
  createPwaConfig,
} from '../../src/lib/pwaConfig';

describe('createPwaConfig', () => {
  it('includes formpacks and docx assets in precache settings', () => {
    const config = createPwaConfig();
    const workbox = config.workbox;
    expect(workbox).toBeDefined();
    if (!workbox) {
      throw new Error('Expected Workbox settings to be defined.');
    }
    const patterns = workbox.globPatterns ?? [];

    expect(patterns).toEqual(PRECACHE_GLOB_PATTERNS);
    expect(patterns.join(',')).toContain('docx');
    expect(patterns).toContain('formpacks/**/*');
    expect(workbox.maximumFileSizeToCacheInBytes).toBe(
      MAXIMUM_FILE_SIZE_TO_CACHE_BYTES,
    );
    expect(config.devOptions?.enabled).toBe(false);
    expect(config.devOptions?.navigateFallbackAllowlist).toEqual([
      /^\/$/,
      /^\/formpacks(\/.*)?$/,
      /^\/help$/,
      /^\/imprint$/,
      /^\/privacy$/,
    ]);
    expect(workbox.runtimeCaching).toEqual(RUNTIME_CACHING);
  });

  it('uses dev precache settings when enabled', () => {
    const config = createPwaConfig({ isDev: true, enableDevSw: true });
    const workbox = config.workbox;
    expect(workbox).toBeDefined();
    if (!workbox) {
      throw new Error('Expected Workbox settings to be defined.');
    }

    expect(workbox.globPatterns).toEqual(DEV_PRECACHE_GLOB_PATTERNS);
  });

  it('keeps dev service worker disabled by default', () => {
    const config = createPwaConfig({ isDev: true });
    expect(config.devOptions?.enabled).toBe(false);
  });
});
