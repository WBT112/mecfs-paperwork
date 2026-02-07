import { describe, expect, it } from 'vitest';
import {
  DEV_RUNTIME_CACHE_BUDGETS,
  DEV_RUNTIME_CACHING,
  DEV_PRECACHE_GLOB_PATTERNS,
  MAXIMUM_FILE_SIZE_TO_CACHE_BYTES,
  PRECACHE_GLOB_PATTERNS,
  RUNTIME_CACHE_BUDGETS,
  RUNTIME_CACHING,
  createPwaConfig,
} from '../../src/lib/pwaConfig';

const FORMPACK_MANIFEST_URL =
  'https://example.test/formpacks/doctor-letter/manifest.json';
const FORMPACK_REFRESH_HEADERS = new Headers({ 'x-formpack-refresh': '1' });
const WORKBOX_REQUIRED_ERROR = 'Expected Workbox settings to be defined.';
type UrlPatternMatcher = (options: { request: Request; url: URL }) => boolean;
const callUrlPatternMatcher = (
  matcher: UrlPatternMatcher,
  request: Request,
): boolean =>
  matcher({
    request,
    url: new URL(request.url),
  });

describe('createPwaConfig', () => {
  it('keeps precache focused on offline-critical app shell assets', () => {
    const config = createPwaConfig();
    const workbox = config.workbox;
    expect(workbox).toBeDefined();
    if (!workbox) {
      throw new Error(WORKBOX_REQUIRED_ERROR);
    }
    const patterns = workbox.globPatterns ?? [];

    expect(patterns).toEqual(PRECACHE_GLOB_PATTERNS);
    expect(patterns).toContain('index.html');
    expect(patterns).toContain('manifest.webmanifest');
    expect(patterns).toContain('assets/*.{js,css,woff2}');
    expect(patterns.join(',')).not.toContain('docx');
    expect(patterns.join(',')).not.toContain('formpacks/**/*');
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
    expect(workbox.runtimeCaching).toEqual(DEV_RUNTIME_CACHING);
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
        callUrlPatternMatcher(
          entry.urlPattern as UrlPatternMatcher,
          new Request(FORMPACK_MANIFEST_URL),
        ),
    );

    expect(formpackRule).toBeDefined();
    if (!formpackRule) {
      throw new Error('Expected formpack runtime caching rule.');
    }
    expect(formpackRule.handler).toBe('StaleWhileRevalidate');
    expect(formpackRule.options?.cacheName).toBe('app-formpacks');
    expect(formpackRule.options?.expiration).toEqual({
      maxEntries: RUNTIME_CACHE_BUDGETS.formpacks.maxEntries,
      maxAgeSeconds: RUNTIME_CACHE_BUDGETS.formpacks.maxAgeSeconds,
      purgeOnQuotaError: true,
    });

    if (typeof formpackRule.urlPattern !== 'function') {
      throw new Error('Expected formpack runtime urlPattern function.');
    }
    const formpackUrlPattern = formpackRule.urlPattern as UrlPatternMatcher;
    const matchesPostRequest = callUrlPatternMatcher(
      formpackUrlPattern,
      new Request(FORMPACK_MANIFEST_URL, {
        method: 'POST',
      }),
    );
    expect(matchesPostRequest).toBe(false);
  });

  it('uses network-only refresh probes for immediate update detection', () => {
    const refreshRule = RUNTIME_CACHING.find(
      (entry) =>
        entry.handler === 'NetworkOnly' &&
        typeof entry.urlPattern === 'function' &&
        callUrlPatternMatcher(
          entry.urlPattern as UrlPatternMatcher,
          new Request(FORMPACK_MANIFEST_URL, {
            headers: FORMPACK_REFRESH_HEADERS,
          }),
        ),
    );

    expect(refreshRule).toBeDefined();
  });

  it('keeps runtime caches bounded with explicit budgets', () => {
    const staticRule = RUNTIME_CACHING.find(
      (entry) => entry.options?.cacheName === 'app-static',
    );
    const fontRule = RUNTIME_CACHING.find(
      (entry) => entry.options?.cacheName === 'app-fonts',
    );
    const imageRule = RUNTIME_CACHING.find(
      (entry) => entry.options?.cacheName === 'app-images',
    );

    expect(staticRule?.options?.expiration).toEqual({
      maxEntries: RUNTIME_CACHE_BUDGETS.static.maxEntries,
      maxAgeSeconds: RUNTIME_CACHE_BUDGETS.static.maxAgeSeconds,
      purgeOnQuotaError: true,
    });
    expect(fontRule?.options?.expiration).toEqual({
      maxEntries: RUNTIME_CACHE_BUDGETS.fonts.maxEntries,
      maxAgeSeconds: RUNTIME_CACHE_BUDGETS.fonts.maxAgeSeconds,
      purgeOnQuotaError: true,
    });
    expect(imageRule?.options?.expiration).toEqual({
      maxEntries: RUNTIME_CACHE_BUDGETS.images.maxEntries,
      maxAgeSeconds: RUNTIME_CACHE_BUDGETS.images.maxAgeSeconds,
      purgeOnQuotaError: true,
    });
  });

  it('uses larger runtime cache budgets in dev mode for Vite module graphs', () => {
    const config = createPwaConfig({ isDev: true, enableDevSw: true });
    const workbox = config.workbox;
    expect(workbox).toBeDefined();
    if (!workbox) {
      throw new Error(WORKBOX_REQUIRED_ERROR);
    }

    const staticRule = (workbox.runtimeCaching ?? []).find(
      (entry) => entry.options?.cacheName === 'app-static',
    );
    expect(staticRule?.options?.expiration).toEqual({
      maxEntries: DEV_RUNTIME_CACHE_BUDGETS.static.maxEntries,
      maxAgeSeconds: DEV_RUNTIME_CACHE_BUDGETS.static.maxAgeSeconds,
      purgeOnQuotaError: true,
    });
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
