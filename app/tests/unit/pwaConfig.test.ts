import { describe, expect, it } from 'vitest';
import {
  DEV_PRECACHE_GLOB_PATTERNS,
  MAXIMUM_FILE_SIZE_TO_CACHE_BYTES,
  PRECACHE_GLOB_PATTERNS,
  RUNTIME_CACHING,
  createPwaConfig,
} from '../../src/lib/pwaConfig';

const FORMPACK_MANIFEST_URL =
  'https://example.test/formpacks/doctor-letter/manifest.json';
const FORMPACK_REFRESH_HEADERS = new Headers({ 'x-formpack-refresh': '1' });
const WORKBOX_REQUIRED_ERROR = 'Expected Workbox settings to be defined.';

describe('createPwaConfig', () => {
  it('includes formpacks and docx assets in precache settings', () => {
    const config = createPwaConfig();
    const workbox = config.workbox;
    expect(workbox).toBeDefined();
    if (!workbox) {
      throw new Error(WORKBOX_REQUIRED_ERROR);
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
      throw new Error(WORKBOX_REQUIRED_ERROR);
    }

    expect(workbox.globPatterns).toEqual(DEV_PRECACHE_GLOB_PATTERNS);
  });

  it('keeps dev service worker disabled by default', () => {
    const config = createPwaConfig({ isDev: true });
    expect(config.devOptions?.enabled).toBe(false);
  });

  it('uses stale-while-revalidate for formpack GET requests', () => {
    const formpackRule = RUNTIME_CACHING.find(
      (entry) =>
        entry.handler === 'StaleWhileRevalidate' &&
        typeof entry.urlPattern === 'function' &&
        entry.urlPattern({
          request: new Request(FORMPACK_MANIFEST_URL),
          url: new URL(FORMPACK_MANIFEST_URL),
        }),
    );

    expect(formpackRule).toBeDefined();
    if (!formpackRule) {
      throw new Error('Expected formpack runtime caching rule.');
    }
    expect(formpackRule.handler).toBe('StaleWhileRevalidate');
    expect(formpackRule.options?.cacheName).toBe('app-formpacks');

    const matchesPostRequest =
      typeof formpackRule.urlPattern === 'function' &&
      formpackRule.urlPattern({
        request: new Request(FORMPACK_MANIFEST_URL, {
          method: 'POST',
        }),
        url: new URL(FORMPACK_MANIFEST_URL),
      });
    expect(matchesPostRequest).toBe(false);
  });

  it('uses network-only refresh probes for immediate update detection', () => {
    const refreshRule = RUNTIME_CACHING.find(
      (entry) =>
        entry.handler === 'NetworkOnly' &&
        typeof entry.urlPattern === 'function' &&
        entry.urlPattern({
          request: new Request(FORMPACK_MANIFEST_URL, {
            headers: FORMPACK_REFRESH_HEADERS,
          }),
          url: new URL(FORMPACK_MANIFEST_URL),
        }),
    );

    expect(refreshRule).toBeDefined();
  });

  it('keeps passive service worker update behavior', () => {
    const config = createPwaConfig();
    expect(config.registerType).toBe('prompt');

    const workbox = config.workbox;
    expect(workbox).toBeDefined();
    if (!workbox) {
      throw new Error(WORKBOX_REQUIRED_ERROR);
    }
    expect(workbox.skipWaiting).toBe(false);
    expect(workbox.clientsClaim).toBe(true);
  });
});
