# PWA Caching Strategy

This project uses Workbox via `vite-plugin-pwa` with a bounded offline-first strategy.

## Goals
- Keep core app shell available offline.
- Keep previously visited formpack resources available offline.
- Avoid unbounded cache growth on mobile devices.

## Precache (install-time)
Precache is intentionally narrow and limited to offline-critical shell assets:
- `index.html`
- `manifest.webmanifest`
- `favicon.ico`
- `apple-touch-icon.png`
- `assets/*.{js,css,woff2}`

Large or non-critical artifacts (for example full formpack trees, DOCX files, JSON content bundles) are not precached by default.

## Runtime caches (bounded)
Runtime caches are explicitly budgeted:
- `app-static` (`CacheFirst`)
  - scripts/styles/workers
  - `maxEntries: 60`
  - `maxAgeSeconds: 30 days`
  - `purgeOnQuotaError: true`
- `app-fonts` (`CacheFirst`)
  - fonts
  - `maxEntries: 20`
  - `maxAgeSeconds: 180 days`
  - `purgeOnQuotaError: true`
- `app-images` (`StaleWhileRevalidate`)
  - images
  - `maxEntries: 60`
  - `maxAgeSeconds: 30 days`
  - `purgeOnQuotaError: true`
- `app-formpacks` (`StaleWhileRevalidate`)
  - `/formpacks/*` GET requests
  - `maxEntries: 120`
  - `maxAgeSeconds: 7 days`
  - `purgeOnQuotaError: true`

Special case for update probes:
- Requests with header `x-formpack-refresh: 1` use `NetworkOnly` to detect updates immediately.

## Development profile
In development (`vite dev` with dev service worker), `app-static` uses a larger entry budget so the unbundled Vite module graph can still be replayed offline in tests. Production keeps the stricter budgets listed above.

## File size guard
Precache file size limit:
- `maximumFileSizeToCacheInBytes = 3_000_000`

This prevents very large files from being added to install-time precache.

## QA checks
1. Install/open the app and load `/formpacks`.
2. Open at least one formpack detail page while online.
3. Switch offline and reload:
   - core shell still loads
   - previously opened formpack still loads
4. Inspect Cache Storage in DevTools and verify cache names and bounded size behavior.
