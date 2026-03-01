import type { VitePWAOptions } from 'vite-plugin-pwa';

export const PRECACHE_GLOB_PATTERNS = [
  'index.html',
  'manifest.webmanifest',
  'favicon.ico',
  'apple-touch-icon.png',
  'assets/*.{js,css,woff2}',
  'assets/annex-*.{jpg,jpeg,png}',
  'assets/Liberation*.ttf',
];

export const DEV_PRECACHE_GLOB_PATTERNS: string[] = [];

export const MAXIMUM_FILE_SIZE_TO_CACHE_BYTES = 3_000_000;

type RuntimeCacheBudget = {
  maxEntries: number;
  maxAgeSeconds: number;
};

type RuntimeCacheBudgets = {
  static: RuntimeCacheBudget;
  fonts: RuntimeCacheBudget;
  images: RuntimeCacheBudget;
  formpacks: RuntimeCacheBudget;
};

export const RUNTIME_CACHE_BUDGETS = {
  static: {
    maxEntries: 60,
    maxAgeSeconds: 30 * 24 * 60 * 60,
  },
  fonts: {
    maxEntries: 20,
    maxAgeSeconds: 180 * 24 * 60 * 60,
  },
  images: {
    maxEntries: 60,
    maxAgeSeconds: 30 * 24 * 60 * 60,
  },
  formpacks: {
    maxEntries: 120,
    maxAgeSeconds: 7 * 24 * 60 * 60,
  },
} satisfies RuntimeCacheBudgets;

export const DEV_RUNTIME_CACHE_BUDGETS = {
  static: {
    maxEntries: 1_200,
    maxAgeSeconds: 24 * 60 * 60,
  },
  fonts: RUNTIME_CACHE_BUDGETS.fonts,
  images: {
    maxEntries: 200,
    maxAgeSeconds: 7 * 24 * 60 * 60,
  },
  formpacks: {
    maxEntries: 300,
    maxAgeSeconds: 7 * 24 * 60 * 60,
  },
} satisfies RuntimeCacheBudgets;

type RuntimeCachingConfig = NonNullable<
  NonNullable<VitePWAOptions['workbox']>['runtimeCaching']
>;

/**
 * Runtime caching strategy:
 * - hashed build assets can be CacheFirst
 * - /formpacks/* MUST NOT be CacheFirst, otherwise deployments can look “stuck”
 *   on mobile due to long-lived caches. Use SWR so updates propagate while still
 *   supporting offline reads.
 * - explicit refresh probes (x-formpack-refresh=1) bypass runtime cache to detect
 *   updates immediately without forcing a page reload.
 */
const createRuntimeCaching = (
  budgets: RuntimeCacheBudgets,
): RuntimeCachingConfig => [
  {
    urlPattern: ({ request }: { request: Request }) =>
      ['script', 'style', 'worker'].includes(request.destination),
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'app-static',
      expiration: {
        maxEntries: budgets.static.maxEntries,
        maxAgeSeconds: budgets.static.maxAgeSeconds,
        purgeOnQuotaError: true,
      },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.destination === 'font',
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'app-fonts',
      expiration: {
        maxEntries: budgets.fonts.maxEntries,
        maxAgeSeconds: budgets.fonts.maxAgeSeconds,
        purgeOnQuotaError: true,
      },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.destination === 'image',
    handler: 'StaleWhileRevalidate' as const,
    options: {
      cacheName: 'app-images',
      cacheableResponse: {
        statuses: [0, 200],
      },
      expiration: {
        maxEntries: budgets.images.maxEntries,
        maxAgeSeconds: budgets.images.maxAgeSeconds,
        purgeOnQuotaError: true,
      },
    },
  },
  {
    urlPattern: ({ url, request }: { url: URL; request: Request }) =>
      request.method === 'GET' &&
      url.pathname.startsWith('/formpacks/') &&
      request.headers.get('x-formpack-refresh') === '1',
    handler: 'NetworkOnly' as const,
  },
  {
    urlPattern: ({ url, request }: { url: URL; request: Request }) =>
      request.method === 'GET' && url.pathname.startsWith('/formpacks/'),
    handler: 'StaleWhileRevalidate' as const,
    options: {
      cacheName: 'app-formpacks',
      cacheableResponse: {
        statuses: [0, 200],
      },
      expiration: {
        maxEntries: budgets.formpacks.maxEntries,
        maxAgeSeconds: budgets.formpacks.maxAgeSeconds,
        purgeOnQuotaError: true,
      },
    },
  },
];

export const RUNTIME_CACHING = createRuntimeCaching(RUNTIME_CACHE_BUDGETS);
export const DEV_RUNTIME_CACHING = createRuntimeCaching(
  DEV_RUNTIME_CACHE_BUDGETS,
);

export const createPwaConfig = (
  options: { isDev?: boolean; enableDevSw?: boolean } = {},
): Partial<VitePWAOptions> => {
  const isDev = options.isDev ?? false;
  const enableDevSw = options.enableDevSw ?? false;
  const globPatterns = isDev
    ? DEV_PRECACHE_GLOB_PATTERNS
    : PRECACHE_GLOB_PATTERNS;

  return {
    registerType: 'autoUpdate',
    devOptions: {
      enabled: isDev && enableDevSw,
      navigateFallbackAllowlist: [
        /^\/$/,
        /^\/formpacks(\/.*)?$/,
        /^\/help$/,
        /^\/imprint$/,
        /^\/privacy$/,
      ],
    },
    workbox: {
      globPatterns,
      maximumFileSizeToCacheInBytes: MAXIMUM_FILE_SIZE_TO_CACHE_BYTES,
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/health$/],

      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,

      runtimeCaching: isDev ? DEV_RUNTIME_CACHING : RUNTIME_CACHING,
    },
  };
};
