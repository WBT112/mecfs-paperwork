import type { VitePWAOptions } from 'vite-plugin-pwa';

export const PRECACHE_GLOB_PATTERNS = [
  '**/*.{js,css,html,ico,png,svg,webmanifest,woff2,json,txt,md,docx,xml}',
  'formpacks/**/*',
];

export const DEV_PRECACHE_GLOB_PATTERNS: string[] = [];

export const MAXIMUM_FILE_SIZE_TO_CACHE_BYTES = 12_000_000;
type RuntimeCachingConfig = NonNullable<
  NonNullable<VitePWAOptions['workbox']>['runtimeCaching']
>;

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
    urlPattern: ({ url }: { url: URL }) =>
      url.pathname.startsWith('/formpacks/'),
    handler: 'CacheFirst' as const,
    options: {
      cacheName: 'app-formpacks',
      expiration: {
        maxEntries: 200,
      },
    },
  },
] satisfies RuntimeCachingConfig;

export const createPwaConfig = (
  options: { isDev?: boolean } = {},
): Partial<VitePWAOptions> => {
  const isDev = options.isDev ?? false;
  const globPatterns = isDev
    ? DEV_PRECACHE_GLOB_PATTERNS
    : PRECACHE_GLOB_PATTERNS;

  return {
    registerType: 'autoUpdate',
    devOptions: {
      enabled: true,
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
      runtimeCaching: RUNTIME_CACHING,
    },
  };
};
