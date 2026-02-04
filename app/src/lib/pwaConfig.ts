import type { VitePWAOptions } from 'vite-plugin-pwa';

export const PRECACHE_GLOB_PATTERNS = [
  '**/*.{js,css,html,ico,png,svg,webmanifest,woff2,json,txt,md,docx,xml}',
  // Explicitly include formpack assets (bounded by maximumFileSizeToCacheInBytes).
  'formpacks/**/*',
];

export const DEV_PRECACHE_GLOB_PATTERNS: string[] = [];

export const MAXIMUM_FILE_SIZE_TO_CACHE_BYTES = 12_000_000;
type RuntimeCachingConfig = NonNullable<
  NonNullable<VitePWAOptions['workbox']>['runtimeCaching']
>;

/**
 * Runtime caching strategy:
 * - hashed build assets can be CacheFirst
 * - /formpacks/* MUST NOT be CacheFirst, otherwise deployments can look “stuck”
 *   on mobile due to long-lived caches. Use SWR so updates propagate while still
 *   supporting offline reads.
 */
export const RUNTIME_CACHING = [
  {
    urlPattern: ({ request }: { request: Request }) =>
      ['script', 'style', 'worker'].includes(request.destination),
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'app-static',
      expiration: {
        maxEntries: 100,
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
        maxEntries: 30,
      },
    },
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
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      },
    },
  },
] satisfies RuntimeCachingConfig;

export const createPwaConfig = (
  options: { isDev?: boolean; enableDevSw?: boolean } = {},
): Partial<VitePWAOptions> => {
  const isDev = options.isDev ?? false;
  const enableDevSw = options.enableDevSw ?? false;
  const globPatterns = isDev ? DEV_PRECACHE_GLOB_PATTERNS : PRECACHE_GLOB_PATTERNS;

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

      runtimeCaching: RUNTIME_CACHING,
    },
  };
};
